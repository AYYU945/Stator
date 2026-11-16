import JSZip from 'jszip';
import { formatFileSize, PresetSettings } from '../types/queue.ts';
import { imageWorkerPool } from './imageWorkerPool.ts';
import { verifyOutputBlob } from './formatCapabilities.ts';
import {
  RESOLUTION_BOUNDS,
  calculateTargetDimensions,
  resolveOrientedTargetDimensions,
  resolveSourceCropRect,
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

        const crop = resolveSourceCropRect(
          origWidth,
          origHeight,
          preset?.cropRect,
          preset?.aspectCrop
        );

        const { w: targetWidth, h: targetHeight } = resolveOrientedTargetDimensions(
          crop.sw,
          crop.sh,
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
          preset?.preserveTransparency === false ||
          target.includes('JPEG') ||
          target.includes('JPG') ||
          target.includes('BMP');

        drawTransformedSource(
          ctx,
          img,
          canvas.width,
          canvas.height,
          rotation,
          flipH,
          !forceOpaque,
          crop,
          preset?.adjustments,
          preset?.watermark
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
    const workerRes = await imageWorkerPool.convertImage(file, targetFormat, preset, signal, jobId);
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
    if (typeof err?.message === 'string' && err.message.includes('OffscreenCanvas worker not supported')) {
      return await mainThreadCanvasConvert(file, targetFormat, preset, signal);
    }
    throw err;
  }
}

/**
 * Generates a full production Favicon & PWA Icon Pack ZIP from a single source image.
 */
export async function generateIconPackZip(file: File): Promise<{
  blob: Blob;
  url: string;
  filename: string;
}> {
  const bmp = await createImageBitmap(file);
  const zip = new JSZip();
  const sizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 48, name: 'favicon-48x48.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 512, name: 'icon-512x512.png' },
  ];

  const icoEntries: Array<{ size: number; data: Uint8Array }> = [];

  try {
    for (const item of sizes) {
      const c = document.createElement('canvas');
      c.width = item.size;
      c.height = item.size;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const scale = Math.min(item.size / bmp.width, item.size / bmp.height);
      const dw = Math.round(bmp.width * scale);
      const dh = Math.round(bmp.height * scale);
      ctx.drawImage(bmp, (item.size - dw) / 2, (item.size - dh) / 2, dw, dh);

      const pngBlob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
      if (!pngBlob) throw new Error(`Failed generating ${item.name}`);
      const bytes = new Uint8Array(await pngBlob.arrayBuffer());
      zip.file(item.name, bytes);
      if (item.size <= 48) {
        icoEntries.push({ size: item.size, data: bytes });
      }
    }

    const icoBlob = pngBuffersToIcoBlob(icoEntries);
    zip.file('favicon.ico', await icoBlob.arrayBuffer());
    zip.file(
      'site.webmanifest',
      JSON.stringify(
        {
          name: 'App Icons',
          icons: [
            { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        null,
        2
      )
    );

    const outZip = await zip.generateAsync({ type: 'blob' });
    const stem = file.name.replace(/\.[^/.]+$/, '') || 'icon';
    return {
      blob: outZip,
      url: URL.createObjectURL(outZip),
      filename: `${stem}_icon_pack.zip`,
    };
  } finally {
    bmp.close();
  }
}

/**
 * Generates a real composite Contact Sheet / Sprite Sheet PNG from multiple image files.
 */
export async function generateSpriteSheet(
  files: File[],
  columns: number = 4,
  cellSize: number = 256,
  gap: number = 8
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  filename: string;
  metadataJson: string;
}> {
  if (!files.length) throw new Error('Select at least 1 image to generate a sheet.');
  const safeCols = Math.max(1, Math.min(12, columns));
  const rows = Math.ceil(files.length / safeCols);
  const totalW = safeCols * cellSize + Math.max(0, safeCols - 1) * gap;
  const totalH = rows * cellSize + Math.max(0, rows - 1) * gap;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  const framesMeta: Array<{ name: string; x: number; y: number; w: number; h: number }> = [];

  for (let i = 0; i < files.length; i++) {
    const bmp = await createImageBitmap(files[i]);
    const col = i % safeCols;
    const row = Math.floor(i / safeCols);
    const x = col * (cellSize + gap);
    const y = row * (cellSize + gap);
    const scale = Math.min(cellSize / bmp.width, cellSize / bmp.height);
    const dw = Math.round(bmp.width * scale);
    const dh = Math.round(bmp.height * scale);
    ctx.drawImage(bmp, x + Math.round((cellSize - dw) / 2), y + Math.round((cellSize - dh) / 2), dw, dh);
    bmp.close();
    framesMeta.push({ name: files[i].name, x, y, w: cellSize, h: cellSize });
  }

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Failed encoding sprite sheet PNG');

  return {
    blob,
    url: URL.createObjectURL(blob),
    width: totalW,
    height: totalH,
    filename: `stator_sheet_${safeCols}col_${files.length}items.png`,
    metadataJson: JSON.stringify({ width: totalW, height: totalH, cellSize, gap, frames: framesMeta }, null, 2),
  };
}

/**
 * Computes genuine mathematical PSNR (Peak Signal-to-Noise Ratio in dB) between an original image
 * and a processed image blob. Returns null if dimensions cannot be compared fairly.
 */
export async function computeImagePSNR(originalFile: File, processedBlob: Blob): Promise<number | null> {
  try {
    const [bmpA, bmpB] = await Promise.all([
      createImageBitmap(originalFile),
      createImageBitmap(processedBlob),
    ]);
    try {
      const w = Math.min(512, bmpA.width);
      const h = Math.min(512, bmpA.height);
      if (bmpA.width !== bmpB.width || bmpA.height !== bmpB.height) {
        return null;
      }
      const cA = document.createElement('canvas');
      const cB = document.createElement('canvas');
      cA.width = cB.width = w;
      cA.height = cB.height = h;
      const ctxA = cA.getContext('2d');
      const ctxB = cB.getContext('2d');
      if (!ctxA || !ctxB) return null;
      ctxA.drawImage(bmpA, 0, 0, w, h);
      ctxB.drawImage(bmpB, 0, 0, w, h);
      const dataA = ctxA.getImageData(0, 0, w, h).data;
      const dataB = ctxB.getImageData(0, 0, w, h).data;
      let sumSq = 0;
      const count = w * h * 3;
      for (let i = 0; i < dataA.length; i += 4) {
        const dr = dataA[i] - dataB[i];
        const dg = dataA[i + 1] - dataB[i + 1];
        const db = dataA[i + 2] - dataB[i + 2];
        sumSq += dr * dr + dg * dg + db * db;
      }
      const mse = sumSq / count;
      if (mse <= 0.0001) return 99.9;
      return Number((10 * Math.log10((255 * 255) / mse)).toFixed(2));
    } finally {
      bmpA.close();
      bmpB.close();
    }
  } catch {
    return null;
  }
}

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
