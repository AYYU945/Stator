import { PresetSettings } from '../types/queue.ts';

export interface ImageConversionResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}

interface ImageJob {
  id: string;
  file: File | Blob;
  targetFormat: string;
  preset?: PresetSettings;
  signal?: AbortSignal;
  resolve: (value: ImageConversionResult) => void;
  reject: (reason?: any) => void;
}

class ImageWorkerPool {
  private workers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private activeJobs: Map<Worker, string> = new Map();
  private queue: ImageJob[] = [];
  private jobMap: Map<string, ImageJob> = new Map();
  private maxWorkers: number = 4;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const cores = navigator.hardwareConcurrency || 4;
      this.maxWorkers = Math.max(2, Math.min(4, cores));
    }
  }

  private spawnWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    try {
      const worker = new Worker(new URL('../workers/imageWorker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
      worker.onerror = (err) => this.handleWorkerError(worker, err);
      return worker;
    } catch (err) {
      console.warn('Module Web Worker spawn failed:', err);
      return null;
    }
  }

  private init() {
    if (this.initialized || typeof Worker === 'undefined') return;
    this.initialized = true;

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = this.spawnWorker();
      if (worker) {
        this.workers.push(worker);
      }
    }
  }

  private handleWorkerMessage(worker: Worker, e: MessageEvent) {
    const { id, success, blob, width, height, sizeBytes, error } = e.data || {};
    const job = this.jobMap.get(id);

    this.busyWorkers.delete(worker);
    this.activeJobs.delete(worker);
    this.jobMap.delete(id);

    if (job) {
      if (job.signal?.aborted) {
        job.reject(new DOMException('Conversion cancelled by user', 'AbortError'));
      } else if (success && blob) {
        const url = URL.createObjectURL(blob);
        job.resolve({ blob, url, width, height, sizeBytes });
      } else {
        job.reject(new Error(error || 'Worker image conversion error'));
      }
    }

    this.processQueue();
  }

  private handleWorkerError(worker: Worker, err: ErrorEvent) {
    const activeJobId = this.activeJobs.get(worker);
    this.busyWorkers.delete(worker);
    this.activeJobs.delete(worker);

    if (activeJobId) {
      const job = this.jobMap.get(activeJobId);
      this.jobMap.delete(activeJobId);
      if (job) {
        job.reject(new Error(err?.message || 'Image worker crashed unexpectedly'));
      }
    }

    // Replace crashed worker so pool capacity never degrades permanently
    const idx = this.workers.indexOf(worker);
    try {
      worker.terminate();
    } catch {}
    if (idx !== -1) {
      const replacement = this.spawnWorker();
      if (replacement) {
        this.workers[idx] = replacement;
      } else {
        this.workers.splice(idx, 1);
      }
    }

    this.processQueue();
  }

  private processQueue() {
    while (this.queue.length > 0) {
      const availableWorker = this.workers.find((w) => !this.busyWorkers.has(w));
      if (!availableWorker) return;

      const job = this.queue.shift();
      if (!job) return;

      if (job.signal?.aborted) {
        this.jobMap.delete(job.id);
        job.reject(new DOMException('Conversion cancelled by user', 'AbortError'));
        continue;
      }

      this.busyWorkers.add(availableWorker);
      this.activeJobs.set(availableWorker, job.id);
      this.jobMap.set(job.id, job);

      availableWorker.postMessage({
        id: job.id,
        file: job.file,
        targetFormat: job.targetFormat,
        preset: job.preset,
      });
    }
  }

  public cancelJob(jobId: string): boolean {
    const queuedIdx = this.queue.findIndex((j) => j.id === jobId);
    if (queuedIdx !== -1) {
      const [removed] = this.queue.splice(queuedIdx, 1);
      this.jobMap.delete(jobId);
      removed.reject(new DOMException('Conversion cancelled by user', 'AbortError'));
      return true;
    }

    for (const [worker, activeId] of this.activeJobs.entries()) {
      if (activeId === jobId) {
        const job = this.jobMap.get(jobId);
        this.busyWorkers.delete(worker);
        this.activeJobs.delete(worker);
        this.jobMap.delete(jobId);

        const idx = this.workers.indexOf(worker);
        try {
          worker.terminate();
        } catch {}
        if (idx !== -1) {
          const replacement = this.spawnWorker();
          if (replacement) {
            this.workers[idx] = replacement;
          } else {
            this.workers.splice(idx, 1);
          }
        }
        job?.reject(new DOMException('Conversion cancelled by user', 'AbortError'));
        this.processQueue();
        return true;
      }
    }

    return false;
  }

  public getActiveCount(): number {
    return this.busyWorkers.size;
  }

  public getPoolSize(): number {
    return this.maxWorkers;
  }

  public convertImage(
    file: File | Blob,
    targetFormat: string,
    preset?: PresetSettings,
    signal?: AbortSignal,
    explicitJobId?: string
  ): Promise<ImageConversionResult> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Conversion cancelled by user', 'AbortError'));
    }

    this.init();

    if (this.workers.length === 0 || typeof OffscreenCanvas === 'undefined') {
      return Promise.reject(new Error('OffscreenCanvas worker not supported'));
    }

    return new Promise((resolve, reject) => {
      const id = explicitJobId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const onAbort = () => {
        this.cancelJob(id);
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      const wrappedResolve = (res: ImageConversionResult) => {
        signal?.removeEventListener('abort', onAbort);
        resolve(res);
      };
      const wrappedReject = (err: any) => {
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      };

      const job: ImageJob = {
        id,
        file,
        targetFormat,
        preset,
        signal,
        resolve: wrappedResolve,
        reject: wrappedReject,
      };
      this.queue.push(job);
      this.processQueue();
    });
  }
}

export const imageWorkerPool = new ImageWorkerPool();
