import { RotationDegrees } from '../types/queue.ts';

export const RESOLUTION_BOUNDS: Record<string, { w: number; h: number }> = {
  '4K': { w: 3840, h: 2160 },
  '2K': { w: 2560, h: 1440 },
  '1080p': { w: 1920, h: 1080 },
  '720p': { w: 1280, h: 720 },
  '480p': { w: 854, h: 480 },
};

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

  view.setUint16(0, 0x424d, false); // 'BM'
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

  view.setUint16(0, 0x4949, false); // 'II'
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

/**
 * Draws an image/bitmap onto a 2D canvas context with optional background flattening,
 * rotation (0/90/180/270), and horizontal flip.
 */
export function drawTransformedSource(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource,
  dstW: number,
  dstH: number,
  rotation: RotationDegrees = 0,
  flipH: boolean = false,
  preserveTransparency: boolean = true
): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!preserveTransparency) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, dstW, dstH);
  }

  ctx.save();
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
  ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}
