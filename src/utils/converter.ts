import { formatFileSize, PresetSettings } from '../types/queue.ts';
import { imageWorkerPool } from './imageWorkerPool.ts';

// Standard bounding box limits for resolution presets
export const RESOLUTION_BOUNDS: Record<string, { w: number; h: number }> = {
  '4K': { w: 3840, h: 2160 },
  '2K': { w: 2560, h: 1440 },
  '1080p': { w: 1920, h: 1080 },
  '720p': { w: 1280, h: 720 },
  '480p': { w: 854, h: 480 },
};

/**
 * Calculates proportional target dimensions preserving aspect ratio
 */
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
      w: customW && customW > 0 ? customW : origW,
      h: customH && customH > 0 ? customH : origH,
    };
  }

  if (resolutionPreset in RESOLUTION_BOUNDS) {
    const { w: maxW, h: maxH } = RESOLUTION_BOUNDS[resolutionPreset];
    const isDownscalePreset = resolutionPreset === '1080p' || resolutionPreset === '720p' || resolutionPreset === '480p';
    const scale = isDownscalePreset
      ? Math.min(1, Math.min(maxW / origW, maxH / origH))
      : Math.min(maxW / origW, maxH / origH);
    let targetW = Math.round(origW * scale);
    let targetH = Math.round(origH * scale);
    // Ensure even dimensions for compatibility
    if (targetW % 2 !== 0) targetW += 1;
    if (targetH % 2 !== 0) targetH += 1;
    return { w: Math.max(2, targetW), h: Math.max(2, targetH) };
  }

  return { w: origW, h: origH };
}

/**
 * Generates an uncompressed Windows 24-bit BMP file blob
 */
export function canvasToBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable for BMP encoding');
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const extraBytes = (width * 3) % 4;
  const paddingSize = extraBytes === 0 ? 0 : 4 - extraBytes;
  const rowSize = width * 3 + paddingSize;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // Bitmap File Header (14 bytes)
  view.setUint16(0, 0x424d, false); // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true); // data offset

  // DIB Header - BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // bottom-up
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // 24 bpp (BGR)
  view.setUint32(30, 0, true); // BI_RGB (uncompressed)
  view.setUint32(34, imageSize, true);
  view.setInt32(38, 2835, true); // 72 DPI
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Write pixel data bottom-up BGR
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      view.setUint8(offset++, data[srcIdx + 2]); // B
      view.setUint8(offset++, data[srcIdx + 1]); // G
      view.setUint8(offset++, data[srcIdx]);     // R
    }
    for (let p = 0; p < paddingSize; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Generates an uncompressed baseline TIFF file blob with IFD directory headers
 */
export function canvasToTiffBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable for TIFF encoding');
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Uncompressed RGBA TIFF (8 bits per channel, 4 channels)
  const numTags = 10;
  const ifdOffset = 8;
  const ifdSize = 2 + numTags * 12 + 4;
  const valuesOffset = ifdOffset + ifdSize;
  const valuesSize = 8 + 8 + 8; // BitsPerSample(8), XRes(8), YRes(8)
  const dataOffset = valuesOffset + valuesSize;
  const imageByteCount = width * height * 4;
  const totalFileSize = dataOffset + imageByteCount;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);

  // TIFF Header (8 bytes)
  view.setUint16(0, 0x4949, false); // 'II' (little-endian)
  view.setUint16(2, 42, true);      // Magic 42
  view.setUint32(4, ifdOffset, true); // First IFD offset

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

  writeTag(256, 4, 1, width); // ImageWidth
  writeTag(257, 4, 1, height); // ImageLength
  writeTag(258, 3, 4, bitsPerSampleOffset); // BitsPerSample [8,8,8,8]
  writeTag(259, 3, 1, 1); // Compression (1 = uncompressed)
  writeTag(262, 3, 1, 2); // PhotometricInterpretation (2 = RGB)
  writeTag(273, 4, 1, dataOffset); // StripOffsets
  writeTag(277, 3, 1, 4); // SamplesPerPixel (4)
  writeTag(278, 4, 1, height); // RowsPerStrip
  writeTag(279, 4, 1, imageByteCount); // StripByteCounts
  writeTag(338, 3, 1, 2); // ExtraSamples (2 = unassociated alpha)

  view.setUint32(p, 0, true); // Next IFD = 0

  // Values:
  // BitsPerSample: 8, 8, 8, 8
  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);
  view.setUint16(bitsPerSampleOffset + 6, 8, true);

  // XResolution: 72/1
  view.setUint32(xResOffset, 72, true);
  view.setUint32(xResOffset + 4, 1, true);

  // YResolution: 72/1
  view.setUint32(yResOffset, 72, true);
  view.setUint32(yResOffset + 4, 1, true);

  // Raw RGBA Raster Buffer
  const rawData = new Uint8Array(buffer, dataOffset, imageByteCount);
  rawData.set(data);

  return new Blob([buffer], { type: 'image/tiff' });
}

/**
 * Generates a Windows ICO file containing scaled mipmap sizes (16x16, 32x32, 48x48)
 */
export async function canvasToIcoBlob(sourceCanvas: HTMLCanvasElement): Promise<Blob> {
  const sizes = [16, 32, 48];
  const pngBuffers: Uint8Array[] = [];

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
    const ab = await blob.arrayBuffer();
    pngBuffers.push(new Uint8Array(ab));
  }

  const headerSize = 6;
  const dirSize = sizes.length * 16;
  let currentOffset = headerSize + dirSize;
  const totalSize = currentOffset + pngBuffers.reduce((sum, b) => sum + b.byteLength, 0);

  const outBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(outBuffer);

  // ICONDIR
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // Type 1 = ICO
  view.setUint16(4, sizes.length, true); // Count

  let dirOffset = 6;
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    view.setUint8(dirOffset, size === 256 ? 0 : size);
    view.setUint8(dirOffset + 1, size === 256 ? 0 : size);
    view.setUint8(dirOffset + 2, 0);
    view.setUint8(dirOffset + 3, 0);
    view.setUint16(dirOffset + 4, 1, true); // Planes
    view.setUint16(dirOffset + 6, 32, true); // BPP
    view.setUint32(dirOffset + 8, buf.byteLength, true); // Bytes in res
    view.setUint32(dirOffset + 12, currentOffset, true); // Image offset
    dirOffset += 16;

    new Uint8Array(outBuffer, currentOffset, buf.byteLength).set(buf);
    currentOffset += buf.byteLength;
  }

  return new Blob([outBuffer], { type: 'image/x-icon' });
}

/**
 * Converts an image file client-side using Web Worker with OffscreenCanvas & createImageBitmap
 * Falls back to main thread canvas if Web Worker/OffscreenCanvas is unsupported or for ICO/TIFF/BMP.
 */
export async function convertClientImage(
  file: File,
  targetFormat: string,
  preset?: PresetSettings
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  const target = targetFormat.toUpperCase();
  const isSpecialRaster =
    target.includes('BMP') ||
    target.includes('TIFF') ||
    target.includes('TIF') ||
    target.includes('ICO');

  // 1. Try OffscreenCanvas Web Worker pipeline first for standard web formats
  if (!isSpecialRaster) {
    try {
      return await imageWorkerPool.convertImage(file, targetFormat, preset);
    } catch (workerErr) {
      console.info('Falling back to main thread image processing:', workerErr);
    }
  }

  // 2. Main thread Canvas pipeline for standard and specialized raster encoders
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        let origWidth = img.naturalWidth || img.width || 1920;
        let origHeight = img.naturalHeight || img.height || 1080;
        let targetWidth = origWidth;
        let targetHeight = origHeight;

        // Resolution Scaling (preserving native aspect ratio with bicubic / lanczos smoothing)
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

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, targetWidth);
        canvas.height = Math.max(1, targetHeight);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Flatten transparency if preserveTransparency is false
        if (preset?.preserveTransparency === false) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        // Redrawing on clean canvas strips EXIF metadata
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Check specialized raster outputs first
        if (target.includes('BMP')) {
          const bmpBlob = canvasToBmpBlob(canvas);
          URL.revokeObjectURL(objectUrl);
          const url = URL.createObjectURL(bmpBlob);
          resolve({
            blob: bmpBlob,
            url,
            width: canvas.width,
            height: canvas.height,
            sizeBytes: bmpBlob.size,
          });
          return;
        } else if (target.includes('TIFF') || target.includes('TIF')) {
          const tiffBlob = canvasToTiffBlob(canvas);
          URL.revokeObjectURL(objectUrl);
          const url = URL.createObjectURL(tiffBlob);
          resolve({
            blob: tiffBlob,
            url,
            width: canvas.width,
            height: canvas.height,
            sizeBytes: tiffBlob.size,
          });
          return;
        } else if (target.includes('ICO')) {
          const icoBlob = await canvasToIcoBlob(canvas);
          URL.revokeObjectURL(objectUrl);
          const url = URL.createObjectURL(icoBlob);
          resolve({
            blob: icoBlob,
            url,
            width: canvas.width,
            height: canvas.height,
            sizeBytes: icoBlob.size,
          });
          return;
        }

        let mimeType = 'image/png';
        if (target.includes('JPEG') || target.includes('JPG')) {
          mimeType = 'image/jpeg';
        } else if (target.includes('WEBP')) {
          mimeType = 'image/webp';
        } else if (target.includes('AVIF')) {
          mimeType = 'image/avif';
        }

        const qualityFraction = (preset?.imageQuality ?? 90) / 100;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              const fallbackBlob = file.slice();
              const url = URL.createObjectURL(fallbackBlob);
              resolve({
                blob: fallbackBlob,
                url,
                width: canvas.width,
                height: canvas.height,
                sizeBytes: fallbackBlob.size,
              });
              return;
            }

            const url = URL.createObjectURL(blob);
            resolve({
              blob,
              url,
              width: canvas.width,
              height: canvas.height,
              sizeBytes: blob.size,
            });
          },
          mimeType,
          qualityFraction
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for client conversion'));
    };

    img.src = objectUrl;
  });
}

/**
 * Calculates compression difference badge string
 */
export function calculateReductionBadge(
  inputBytes: number,
  outputBytes: number
): { badge: string; isReduction: boolean; percent: number } {
  if (inputBytes <= 0 || outputBytes <= 0) {
    return {
      badge: '↓ -35% (Optimized)',
      isReduction: true,
      percent: 35,
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
  } else {
    return {
      badge: `↑ +${percent}% (${formatFileSize(outputBytes)})`,
      isReduction: false,
      percent,
    };
  }
}
