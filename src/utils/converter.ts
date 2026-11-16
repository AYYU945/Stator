import { formatFileSize, PresetSettings } from '../types/queue.ts';
import { imageWorkerPool } from './imageWorkerPool.ts';
import { verifyOutputBlob } from './formatCapabilities.ts';
import {
  RESOLUTION_BOUNDS,
  calculateTargetDimensions,
  resolveOrientedTargetDimensions,
  rgbaToBmpBlob,
  rgbaToTiffBlob,
  pngBuffersToIcoBlob,
  drawTransformedSource,
} from './imageEncoder.ts';

export { RESOLUTION_BOUNDS, calculateTargetDimensions };

export function canvasToBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable for BMP encoding');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return rgbaToBmpBlob(imgData.data, canvas.width, canvas.height);
}

export function canvasToTiffBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable for TIFF encoding');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return rgbaToTiffBlob(imgData.data, canvas.width, canvas.height);
}

export async function canvasToIcoBlob(sourceCanvas: HTMLCanvasElement): Promise<Blob> {
  const sizes = [16, 32, 48];
  const entries: Array<{ size: number; data: Uint8Array }> = [];

  for (const size of sizes) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, size, size);
    }
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
    if (!blob) throw new Error(`Failed to render ICO sub-icon ${size}x${size}`);
    entries.push({ size, data: new Uint8Array(await blob.arrayBuffer()) });
  }

  return pngBuffersToIcoBlob(entries);
}

async function mainThreadCanvasConvert(
  file: File,
  targetFormat: string,
  preset?: PresetSettings,
  signal?: AbortSignal
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  if (signal?.aborted) {
    throw new DOMException('Conversion cancelled by user', 'AbortError');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    const onAbort = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new DOMException('Conversion cancelled by user', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    img.onload = async () => {
      try {
        if (signal?.aborted) {
          throw new DOMException('Conversion cancelled by user', 'AbortError');
        }
        const origWidth = img.naturalWidth || img.width || 1920;
        const origHeight = img.naturalHeight || img.height || 1080;
        const rotation = preset?.rotation || 0;
        const flipH = Boolean(preset?.flipH);

        const { w: targetWidth, h: targetHeight } = resolveOrientedTargetDimensions(
          origWidth,
          origHeight,
          preset?.imageResize || 'original',
          rotation,
          preset?.customWidth,
          preset?.customHeight
        );

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, targetWidth);
        canvas.height = Math.max(1, targetHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available');

        const target = targetFormat.toUpperCase();
        const forceOpaque =
          preset?.preserveTransparency === false || target.includes('JPEG') || target.includes('JPG') || target.includes('BMP');

        drawTransformedSource(
          ctx,
          img,
          canvas.width,
          canvas.height,
          rotation,
          flipH,
          !forceOpaque
        );

        URL.revokeObjectURL(objectUrl);

        let blob: Blob;
        if (target.includes('BMP')) {
          blob = canvasToBmpBlob(canvas);
        } else if (target.includes('TIFF') || target.includes('TIF')) {
          blob = canvasToTiffBlob(canvas);
        } else if (target.includes('ICO')) {
          blob = await canvasToIcoBlob(canvas);
        } else {
          let mimeType = 'image/png';
          if (target.includes('JPEG') || target.includes('JPG')) mimeType = 'image/jpeg';
          else if (target.includes('WEBP')) mimeType = 'image/webp';
          else if (target.includes('AVIF')) mimeType = 'image/avif';

          const qualityFraction = Math.min(1, Math.max(0.1, (preset?.imageQuality ?? 90) / 100));
          const toBlobAsync = (q: number) =>
            new Promise<Blob | null>((res) => canvas.toBlob(res, mimeType, q));

          let out = await toBlobAsync(qualityFraction);
          if (!out) {
            throw new Error(
              `Browser Canvas failed to encode ${targetFormat}. Try PNG, WEBP, or JPEG.`
            );
          }

          if (
            preset?.targetMaxSizeMb &&
            preset.targetMaxSizeMb > 0 &&
            (mimeType === 'image/jpeg' || mimeType === 'image/webp' || mimeType === 'image/avif')
          ) {
            const maxBytes = preset.targetMaxSizeMb * 1024 * 1024;
            if (out.size > maxBytes) {
              let low = 0.1;
              let high = Math.max(0.12, qualityFraction);
              for (let i = 0; i < 4; i++) {
                const mid = Number(((low + high) / 2).toFixed(3));
                const cand = await toBlobAsync(mid);
                if (cand && cand.size <= maxBytes) {
                  out = cand;
                  low = mid;
                } else if (cand) {
                  high = mid;
                  if (cand.size < out.size) out = cand;
                }
              }
            }
          }
          blob = out;
        }

        const verification = await verifyOutputBlob(blob, targetFormat);
        if (!verification.ok) {
          throw new Error(verification.error || `Failed to verify ${targetFormat} output`);
        }

        signal?.removeEventListener('abort', onAbort);
        resolve({
          blob,
          url: URL.createObjectURL(blob),
          width: canvas.width,
          height: canvas.height,
          sizeBytes: blob.size,
        });
      } catch (err) {
        signal?.removeEventListener('abort', onAbort);
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode source image. File may be corrupted or an unsupported format.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Converts an image file client-side through the unified OffscreenCanvas Web Worker pool.
 * Falls back to main-thread Canvas only when OffscreenCanvas/Workers are unavailable.
 * Never returns raw source bytes (`file.slice()`) on failure.
 */
export async function convertClientImage(
  file: File,
  targetFormat: string,
  preset?: PresetSettings,
  signal?: AbortSignal,
  jobId?: string
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  if (signal?.aborted) {
    throw new DOMException('Conversion cancelled by user', 'AbortError');
  }

  try {
    const workerRes = await imageWorkerPool.convertImage(
      file,
      targetFormat,
      preset,
      signal,
      jobId
    );
    const check = await verifyOutputBlob(workerRes.blob, targetFormat);
    if (!check.ok) {
      URL.revokeObjectURL(workerRes.url);
      throw new Error(check.error || `Failed to verify ${targetFormat} output`);
    }
    return workerRes;
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      throw err;
    }
    // Only fall back to main-thread Canvas if OffscreenCanvas worker is genuinely unavailable
    if (typeof err?.message === 'string' && err.message.includes('OffscreenCanvas worker not supported')) {
      return await mainThreadCanvasConvert(file, targetFormat, preset, signal);
    }
    throw err;
  }
}

/**
 * Calculates real compression difference badge string without synthetic fallbacks.
 */
export function calculateReductionBadge(
  inputBytes: number,
  outputBytes: number
): { badge: string; isReduction: boolean; percent: number } {
  if (!Number.isFinite(inputBytes) || !Number.isFinite(outputBytes) || inputBytes <= 0 || outputBytes <= 0) {
    return {
      badge: '0 B',
      isReduction: true,
      percent: 0,
    };
  }

  const diff = inputBytes - outputBytes;
  const percent = Math.round((Math.abs(diff) / inputBytes) * 100);

  if (diff >= 0) {
    return {
      badge: `↓ -${percent}% (${formatFileSize(outputBytes)})`,
      isReduction: true,
      percent,
    };
  }
  return {
    badge: `↑ +${percent}% (${formatFileSize(outputBytes)})`,
    isReduction: false,
    percent,
  };
}
