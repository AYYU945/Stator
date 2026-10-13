/**
 * Worker Pool Manager for OffscreenCanvas & createImageBitmap Image Conversions
 * Scales dynamically to logical cores (navigator.hardwareConcurrency || 4)
 * Handles queue concurrency without blocking UI thread.
 */

import { PresetSettings } from '../types/queue.ts';

interface ImageJob {
  id: string;
  file: File | Blob;
  targetFormat: string;
  preset?: PresetSettings;
  resolve: (value: {
    blob: Blob;
    url: string;
    width: number;
    height: number;
    sizeBytes: number;
  }) => void;
  reject: (reason?: any) => void;
}

class ImageWorkerPool {
  private workers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private queue: ImageJob[] = [];
  private jobMap: Map<string, ImageJob> = new Map();
  private maxWorkers: number = 4;
  private workerBlobUrl: string | null = null;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const cores = navigator.hardwareConcurrency || 4;
      // Allocate between 2 and 4 concurrent workers to avoid memory overload
      this.maxWorkers = Math.max(2, Math.min(4, cores));
    }
  }

  private initWorkerBlob(): string {
    if (this.workerBlobUrl) return this.workerBlobUrl;

    // Inline worker script so Vite bundles and hosts it seamlessly across all domains / iframes
    const workerScript = `
      const RESOLUTION_BOUNDS = {
        '4K': { w: 3840, h: 2160 },
        '2K': { w: 2560, h: 1440 },
        '1080p': { w: 1920, h: 1080 },
        '720p': { w: 1280, h: 720 },
        '480p': { w: 854, h: 480 },
      };

      self.onmessage = async (e) => {
        const { id, file, targetFormat, preset } = e.data;
        try {
          // Asynchronous decoding via createImageBitmap
          const bitmap = await createImageBitmap(file);
          const origWidth = bitmap.width;
          const origHeight = bitmap.height;

          let targetWidth = origWidth;
          let targetHeight = origHeight;

          const resolutionPreset = preset?.imageResize;
          if (resolutionPreset && resolutionPreset in RESOLUTION_BOUNDS) {
            const { w: maxW, h: maxH } = RESOLUTION_BOUNDS[resolutionPreset];
            const scale = Math.min(maxW / origWidth, maxH / origHeight);
            targetWidth = Math.round(origWidth * scale);
            targetHeight = Math.round(origHeight * scale);
          } else if (resolutionPreset === 'custom' && preset) {
            if (preset.customWidth && preset.customWidth > 0) targetWidth = preset.customWidth;
            if (preset.customHeight && preset.customHeight > 0) targetHeight = preset.customHeight;
          }

          targetWidth = Math.max(1, targetWidth);
          targetHeight = Math.max(1, targetHeight);

          const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
          const ctx = offscreen.getContext('2d');
          if (!ctx) throw new Error('OffscreenCanvas 2D unavailable');

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          if (preset?.preserveTransparency === false) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
          bitmap.close();

          let mimeType = 'image/png';
          const target = (targetFormat || '').toUpperCase();
          if (target.includes('JPEG') || target.includes('JPG')) {
            mimeType = 'image/jpeg';
          } else if (target.includes('WEBP')) {
            mimeType = 'image/webp';
          } else if (target.includes('AVIF')) {
            mimeType = 'image/avif';
          }

          const qualityFraction = (preset?.imageQuality ?? 90) / 100;
          let blob;
          try {
            blob = await offscreen.convertToBlob({ type: mimeType, quality: qualityFraction });
          } catch {
            blob = await offscreen.convertToBlob({ type: 'image/webp', quality: qualityFraction });
          }

          self.postMessage({
            id,
            success: true,
            blob,
            width: targetWidth,
            height: targetHeight,
            sizeBytes: blob.size,
          });
        } catch (err) {
          self.postMessage({
            id,
            success: false,
            error: err?.message || 'Worker image conversion failed',
          });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.workerBlobUrl = URL.createObjectURL(blob);
    return this.workerBlobUrl;
  }

  private init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    try {
      const scriptUrl = this.initWorkerBlob();
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = new Worker(scriptUrl);
        worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
        worker.onerror = (err) => this.handleWorkerError(worker, err);
        this.workers.push(worker);
      }
    } catch (err) {
      console.warn('OffscreenCanvas Web Worker pool initialization fell back to main thread:', err);
    }
  }

  private handleWorkerMessage(worker: Worker, e: MessageEvent) {
    const { id, success, blob, width, height, sizeBytes, error } = e.data;
    const job = this.jobMap.get(id);

    this.busyWorkers.delete(worker);
    this.jobMap.delete(id);

    if (job) {
      if (success && blob) {
        const url = URL.createObjectURL(blob);
        job.resolve({ blob, url, width, height, sizeBytes });
      } else {
        job.reject(new Error(error || 'Worker image conversion error'));
      }
    }

    this.processQueue();
  }

  private handleWorkerError(worker: Worker, err: ErrorEvent) {
    console.error('Image Worker Error:', err);
    this.busyWorkers.delete(worker);
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find((w) => !this.busyWorkers.has(w));
    if (!availableWorker) return;

    const job = this.queue.shift();
    if (!job) return;

    this.busyWorkers.add(availableWorker);
    this.jobMap.set(job.id, job);

    availableWorker.postMessage({
      id: job.id,
      file: job.file,
      targetFormat: job.targetFormat,
      preset: job.preset,
    });
  }

  public convertImage(
    file: File | Blob,
    targetFormat: string,
    preset?: PresetSettings
  ): Promise<{
    blob: Blob;
    url: string;
    width: number;
    height: number;
    sizeBytes: number;
  }> {
    this.init();

    // If workers are unavailable or OffscreenCanvas is unsupported, return null to trigger main thread fallback
    if (this.workers.length === 0 || typeof OffscreenCanvas === 'undefined') {
      return Promise.reject(new Error('OffscreenCanvas worker not supported'));
    }

    return new Promise((resolve, reject) => {
      const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      this.queue.push({
        id,
        file,
        targetFormat,
        preset,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }
}

export const imageWorkerPool = new ImageWorkerPool();
