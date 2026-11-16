import { PresetSettings } from '../types/queue.ts';
import {
  resolveOrientedTargetDimensions,
  resolveSourceCropRect,
  rgbaToBmpBlob,
  rgbaToTiffBlob,
  pngBuffersToIcoBlob,
  drawTransformedSource,
} from '../utils/imageEncoder.ts';

interface WorkerRequest {
  id: string;
  file: File | Blob;
  targetFormat: string;
  preset?: PresetSettings;
}

const LOSSY_MIME_FORMATS = new Set(['image/jpeg', 'image/webp', 'image/avif']);

function resolveMimeType(targetFormat: string): string {
  const target = (targetFormat || '').toUpperCase();
  if (target.includes('JPEG') || target.includes('JPG')) return 'image/jpeg';
  if (target.includes('WEBP')) return 'image/webp';
  if (target.includes('AVIF')) return 'image/avif';
  return 'image/png';
}

async function encodeWithBudget(
  offscreen: OffscreenCanvas,
  mimeType: string,
  baseQuality: number,
  targetMaxSizeMb?: number
): Promise<Blob> {
  const initialBlob = await offscreen.convertToBlob({ type: mimeType, quality: baseQuality });
  if (!initialBlob || initialBlob.size === 0) {
    throw new Error(`Encoder returned empty output for ${mimeType}.`);
  }
  if (initialBlob.type && initialBlob.type.toLowerCase() !== mimeType) {
    throw new Error(
      `This browser does not support native ${mimeType.replace('image/', '').toUpperCase()} encoding (returned ${initialBlob.type}).`
    );
  }

  if (!targetMaxSizeMb || targetMaxSizeMb <= 0 || !LOSSY_MIME_FORMATS.has(mimeType)) {
    return initialBlob;
  }

  const maxBytes = targetMaxSizeMb * 1024 * 1024;
  if (initialBlob.size <= maxBytes) {
    return initialBlob;
  }

  let low = 0.1;
  let high = Math.max(0.12, baseQuality);
  let bestBlob = initialBlob;

  for (let step = 0; step < 4; step++) {
    const mid = Number(((low + high) / 2).toFixed(3));
    const candidate = await offscreen.convertToBlob({ type: mimeType, quality: mid });
    if (candidate.size <= maxBytes) {
      bestBlob = candidate;
      low = mid;
    } else {
      high = mid;
      if (candidate.size < bestBlob.size) {
        bestBlob = candidate;
      }
    }
  }

  return bestBlob;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, file, targetFormat, preset } = e.data;
  try {
    const bitmap = await createImageBitmap(file);
    const rotation = preset?.rotation || 0;
    const flipH = Boolean(preset?.flipH);

    const crop = resolveSourceCropRect(
      bitmap.width,
      bitmap.height,
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

    const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('OffscreenCanvas 2D context is unavailable.');
    }

    const targetUpper = (targetFormat || '').toUpperCase();
    const forceWhiteBg =
      preset?.preserveTransparency === false ||
      targetUpper.includes('JPEG') ||
      targetUpper.includes('JPG') ||
      targetUpper.includes('BMP');

    drawTransformedSource(
      ctx,
      bitmap,
      targetWidth,
      targetHeight,
      rotation,
      flipH,
      !forceWhiteBg,
      crop,
      preset?.adjustments,
      preset?.watermark
    );
    bitmap.close();

    let blob: Blob;

    if (targetUpper.includes('BMP')) {
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      blob = rgbaToBmpBlob(imageData.data, targetWidth, targetHeight);
    } else if (targetUpper.includes('TIFF') || targetUpper.includes('TIF')) {
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      blob = rgbaToTiffBlob(imageData.data, targetWidth, targetHeight);
    } else if (targetUpper.includes('ICO')) {
      const sizes = [16, 32, 48];
      const pngEntries: Array<{ size: number; data: Uint8Array }> = [];
      for (const size of sizes) {
        const subCanvas = new OffscreenCanvas(size, size);
        const subCtx = subCanvas.getContext('2d');
        if (!subCtx) throw new Error('OffscreenCanvas 2D unavailable for ICO mipmap');
        subCtx.imageSmoothingEnabled = true;
        subCtx.imageSmoothingQuality = 'high';
        subCtx.drawImage(offscreen, 0, 0, size, size);
        const subBlob = await subCanvas.convertToBlob({ type: 'image/png' });
        pngEntries.push({ size, data: new Uint8Array(await subBlob.arrayBuffer()) });
      }
      blob = pngBuffersToIcoBlob(pngEntries);
    } else {
      const mimeType = resolveMimeType(targetFormat);
      const qualityFraction = Math.min(1, Math.max(0.1, (preset?.imageQuality ?? 90) / 100));
      blob = await encodeWithBudget(offscreen, mimeType, qualityFraction, preset?.targetMaxSizeMb);
    }

    self.postMessage({
      id,
      success: true,
      blob,
      width: targetWidth,
      height: targetHeight,
      sizeBytes: blob.size,
    });
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || 'Worker image conversion failed',
    });
  }
};
