import {
  MediaAdjustments,
  NormalizedCropRect,
  PresetSettings,
  RotationDegrees,
  WatermarkConfig,
} from '../types/queue.ts';

export const RESOLUTION_BOUNDS: Record<string, { w: number; h: number }> = {
  '4K': { w: 3840, h: 2160 },
  '2K': { w: 2560, h: 1440 },
  '1080p': { w: 1920, h: 1080 },
  '720p': { w: 1280, h: 720 },
  '480p': { w: 854, h: 480 },
};

export interface PixelRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Resolves the source pixel crop rectangle from explicit normalized cropRect and/or aspectCrop ratio.
 */
export function resolveSourceCropRect(
  srcW: number,
  srcH: number,
  cropRect?: NormalizedCropRect,
  aspectCrop?: PresetSettings['aspectCrop']
): PixelRect {
  let sx = 0;
  let sy = 0;
  let sw = Math.max(1, srcW);
  let sh = Math.max(1, srcH);

  if (cropRect && cropRect.w > 0.01 && cropRect.h > 0.01) {
    const cx = Math.max(0, Math.min(0.98, cropRect.x));
    const cy = Math.max(0, Math.min(0.98, cropRect.y));
    const cw = Math.max(0.02, Math.min(1 - cx, cropRect.w));
    const ch = Math.max(0.02, Math.min(1 - cy, cropRect.h));
    sx = Math.round(cx * srcW);
    sy = Math.round(cy * srcH);
    sw = Math.max(2, Math.round(cw * srcW));
    sh = Math.max(2, Math.round(ch * srcH));
  } else if (aspectCrop && aspectCrop !== 'original') {
    let targetRatio = sw / sh;
    if (aspectCrop === '9:16') targetRatio = 9 / 16;
    else if (aspectCrop === '1:1') targetRatio = 1;
    else if (aspectCrop === '4:5') targetRatio = 4 / 5;
    else if (aspectCrop === '16:9') targetRatio = 16 / 9;

    const currentRatio = sw / sh;
    if (currentRatio > targetRatio) {
      const nextW = Math.max(2, Math.round(sh * targetRatio));
      sx = Math.round((sw - nextW) / 2);
      sw = nextW;
    } else if (currentRatio < targetRatio) {
      const nextH = Math.max(2, Math.round(sw / targetRatio));
      sy = Math.round((sh - nextH) / 2);
      sh = nextH;
    }
  }

  return { sx, sy, sw, sh };
}

export function calculateTargetDimensions(
  origW: number,
  origH: number,
  resolutionPreset: string,
  customW?: number,
  customH?: number
): { w: number; h: number } {
  if (!origW || !origH) {
    if (resolutionPreset in RESOLUTION_BOUNDS) {
      return RESOLUTION_BOUNDS[resolutionPreset];
    }
    return { w: 1920, h: 1080 };
  }

  if (resolutionPreset === 'custom') {
    return {
      w: Math.max(2, customW && customW > 0 ? Math.round(customW) : origW),
      h: Math.max(2, customH && customH > 0 ? Math.round(customH) : origH),
    };
  }

  if (resolutionPreset in RESOLUTION_BOUNDS) {
    const { w: maxW, h: maxH } = RESOLUTION_BOUNDS[resolutionPreset];
    const isDownscalePreset =
      resolutionPreset === '1080p' ||
      resolutionPreset === '720p' ||
      resolutionPreset === '480p';
    const scale = isDownscalePreset
      ? Math.min(1, Math.min(maxW / origW, maxH / origH))
      : Math.min(maxW / origW, maxH / origH);
    let targetW = Math.round(origW * scale);
    let targetH = Math.round(origH * scale);
    if (targetW % 2 !== 0) targetW += 1;
    if (targetH % 2 !== 0) targetH += 1;
    return { w: Math.max(2, targetW), h: Math.max(2, targetH) };
  }

  return { w: Math.max(1, origW), h: Math.max(1, origH) };
}

export function resolveOrientedTargetDimensions(
  origW: number,
  origH: number,
  resolutionPreset: string,
  rotation: RotationDegrees = 0,
  customW?: number,
  customH?: number
): { w: number; h: number } {
  const isQuarterTurn = rotation === 90 || rotation === 270;
  const orientedW = isQuarterTurn ? origH : origW;
  const orientedH = isQuarterTurn ? origW : origH;
  return calculateTargetDimensions(orientedW, orientedH, resolutionPreset, customW, customH);
}

/**
 * Encodes an RGBA pixel buffer into a standard 24-bit bottom-up Windows BMP Blob.
 */
export function rgbaToBmpBlob(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): Blob {
  const extraBytes = (width * 3) % 4;
  const paddingSize = extraBytes === 0 ? 0 : 4 - extraBytes;
  const rowSize = width * 3 + paddingSize;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint16(0, 0x424d, false);
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, imageSize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      view.setUint8(offset++, rgba[srcIdx + 2]);
      view.setUint8(offset++, rgba[srcIdx + 1]);
      view.setUint8(offset++, rgba[srcIdx]);
    }
    for (let p = 0; p < paddingSize; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Encodes an RGBA pixel buffer into an uncompressed baseline little-endian TIFF Blob.
 */
export function rgbaToTiffBlob(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): Blob {
  const numTags = 10;
  const ifdOffset = 8;
  const ifdSize = 2 + numTags * 12 + 4;
  const valuesOffset = ifdOffset + ifdSize;
  const valuesSize = 24;
  const dataOffset = valuesOffset + valuesSize;
  const imageByteCount = width * height * 4;
  const totalFileSize = dataOffset + imageByteCount;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);

  view.setUint16(0, 0x4949, false);
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);

  let p = ifdOffset;
  view.setUint16(p, numTags, true);
  p += 2;

  const bitsPerSampleOffset = valuesOffset;
  const xResOffset = valuesOffset + 8;
  const yResOffset = valuesOffset + 16;

  const writeTag = (tag: number, type: number, count: number, valOrOffset: number) => {
    view.setUint16(p, tag, true);
    view.setUint16(p + 2, type, true);
    view.setUint32(p + 4, count, true);
    view.setUint32(p + 8, valOrOffset, true);
    p += 12;
  };

  writeTag(256, 4, 1, width);
  writeTag(257, 4, 1, height);
  writeTag(258, 3, 4, bitsPerSampleOffset);
  writeTag(259, 3, 1, 1);
  writeTag(262, 3, 1, 2);
  writeTag(273, 4, 1, dataOffset);
  writeTag(277, 3, 1, 4);
  writeTag(278, 4, 1, height);
  writeTag(279, 4, 1, imageByteCount);
  writeTag(338, 3, 1, 2);

  view.setUint32(p, 0, true);

  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);
  view.setUint16(bitsPerSampleOffset + 6, 8, true);

  view.setUint32(xResOffset, 72, true);
  view.setUint32(xResOffset + 4, 1, true);
  view.setUint32(yResOffset, 72, true);
  view.setUint32(yResOffset + 4, 1, true);

  const rawData = new Uint8Array(buffer, dataOffset, imageByteCount);
  rawData.set(rgba);

  return new Blob([buffer], { type: 'image/tiff' });
}

/**
 * Packages PNG sub-icon mipmaps (16x16, 32x32, 48x48) into a standard Windows .ico container.
 */
export function pngBuffersToIcoBlob(
  entries: Array<{ size: number; data: Uint8Array }>
): Blob {
  const headerSize = 6;
  const dirSize = entries.length * 16;
  let currentOffset = headerSize + dirSize;
  const totalSize = currentOffset + entries.reduce((sum, entry) => sum + entry.data.byteLength, 0);

  const outBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(outBuffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, entries.length, true);

  let dirOffset = 6;
  for (const { size, data } of entries) {
    view.setUint8(dirOffset, size >= 256 ? 0 : size);
    view.setUint8(dirOffset + 1, size >= 256 ? 0 : size);
    view.setUint8(dirOffset + 2, 0);
    view.setUint8(dirOffset + 3, 0);
    view.setUint16(dirOffset + 4, 1, true);
    view.setUint16(dirOffset + 6, 32, true);
    view.setUint32(dirOffset + 8, data.byteLength, true);
    view.setUint32(dirOffset + 12, currentOffset, true);
    dirOffset += 16;

    new Uint8Array(outBuffer, currentOffset, data.byteLength).set(data);
    currentOffset += data.byteLength;
  }

  return new Blob([outBuffer], { type: 'image/x-icon' });
}

export function buildCanvasFilterString(adj?: MediaAdjustments): string {
  if (!adj) return 'none';
  const parts: string[] = [];
  if (adj.exposure !== 0) {
    parts.push(`brightness(${(1 + adj.exposure / 100).toFixed(2)})`);
  }
  if (adj.contrast !== 0) {
    parts.push(`contrast(${(1 + adj.contrast / 100).toFixed(2)})`);
  }
  if (adj.saturation !== 0) {
    parts.push(`saturate(${Math.max(0, 1 + adj.saturation / 100).toFixed(2)})`);
  }
  if (adj.blur > 0) {
    parts.push(`blur(${adj.blur.toFixed(1)}px)`);
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Applies pixel-accurate warm/cool temperature shift and unsharp-mask style convolution sharpening.
 */
export function applyPixelAdjustments(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  adj?: MediaAdjustments
): void {
  if (!adj) return;
  const hasTemp = Math.abs(adj.temperature) >= 1;
  const hasSharpen = adj.sharpen >= 1;
  if (!hasTemp && !hasSharpen) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  if (hasTemp) {
    const shift = Math.round((adj.temperature / 100) * 32);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + shift));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - shift));
    }
  }

  if (hasSharpen && width > 2 && height > 2) {
    const strength = Math.min(1, adj.sharpen / 100) * 0.75;
    const src = new Uint8ClampedArray(data);
    const rowStride = width * 4;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * rowStride + x * 4;
        for (let c = 0; c < 3; c++) {
          const center = src[idx + c];
          const avgNeighbor =
            (src[idx - rowStride + c] +
              src[idx + rowStride + c] +
              src[idx - 4 + c] +
              src[idx + 4 + c]) *
            0.25;
          const sharpened = center + (center - avgNeighbor) * strength * 2.2;
          data[idx + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export function drawWatermarkOnContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  watermark?: WatermarkConfig
): void {
  if (!watermark || !watermark.enabled || !watermark.text.trim()) return;
  const text = watermark.text.trim().slice(0, 64);
  const opacity = Math.min(1, Math.max(0.1, watermark.opacity ?? 0.65));
  const fontSize = Math.max(14, Math.min(72, Math.round(Math.min(width, height) * 0.04)));
  const margin = Math.max(16, Math.round(fontSize * 0.85));

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textBaseline = 'middle';

  let x = width - margin;
  let y = height - margin;
  let align: CanvasTextAlign = 'right';

  switch (watermark.position) {
    case 'top-left':
      x = margin;
      y = margin + fontSize / 2;
      align = 'left';
      break;
    case 'top-right':
      x = width - margin;
      y = margin + fontSize / 2;
      align = 'right';
      break;
    case 'bottom-left':
      x = margin;
      y = height - margin - fontSize / 2;
      align = 'left';
      break;
    case 'center':
      x = width / 2;
      y = height / 2;
      align = 'center';
      break;
    default:
      x = width - margin;
      y = height - margin - fontSize / 2;
      align = 'right';
      break;
  }

  ctx.textAlign = align;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = Math.max(4, Math.round(fontSize * 0.25));
  ctx.fillStyle =
    watermark.color && /^#[0-9a-fA-F]{3,8}$/.test(watermark.color) ? watermark.color : '#FFFFFF';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draws an image/bitmap onto a 2D canvas context with optional crop, background flattening,
 * CSS tonal filter, rotation (0/90/180/270), horizontal flip, pixel adjustments, and watermark.
 */
export function drawTransformedSource(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource,
  dstW: number,
  dstH: number,
  rotation: RotationDegrees = 0,
  flipH: boolean = false,
  preserveTransparency: boolean = true,
  crop?: PixelRect,
  adjustments?: MediaAdjustments,
  watermark?: WatermarkConfig
): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!preserveTransparency) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, dstW, dstH);
  }

  ctx.save();
  if ('filter' in ctx && adjustments) {
    ctx.filter = buildCanvasFilterString(adjustments);
  }
  ctx.translate(dstW / 2, dstH / 2);
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  if (flipH) {
    ctx.scale(-1, 1);
  }
  const isQuarterTurn = rotation === 90 || rotation === 270;
  const drawW = isQuarterTurn ? dstH : dstW;
  const drawH = isQuarterTurn ? dstW : dstH;

  if (crop) {
    ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
  }
  ctx.restore();

  if (adjustments) {
    applyPixelAdjustments(ctx, dstW, dstH, adjustments);
  }
  if (watermark) {
    drawWatermarkOnContext(ctx, dstW, dstH, watermark);
  }
}
