/**
 * Image processing Web Worker running OffscreenCanvas & createImageBitmap()
 * Runs completely off the main UI thread.
 */

interface WorkerTask {
  id: string;
  file: File | Blob;
  targetFormat: string;
  preset?: {
    imageQuality?: number;
    imageResize?: string;
    customWidth?: number;
    customHeight?: number;
    stripMetadata?: boolean;
    preserveTransparency?: boolean;
  };
}

const RESOLUTION_BOUNDS: Record<string, { w: number; h: number }> = {
  '4K': { w: 3840, h: 2160 },
  '2K': { w: 2560, h: 1440 },
  '1080p': { w: 1920, h: 1080 },
  '720p': { w: 1280, h: 720 },
  '480p': { w: 854, h: 480 },
};

self.onmessage = async (e: MessageEvent<WorkerTask>) => {
  const { id, file, targetFormat, preset } = e.data;

  try {
    // 1. Asynchronous background decoding using createImageBitmap
    const bitmap = await createImageBitmap(file);
    const origWidth = bitmap.width;
    const origHeight = bitmap.height;

    let targetWidth = origWidth;
    let targetHeight = origHeight;

    // 2. Proportional aspect-ratio resolution scaling
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

    // Ensure dimensions are positive integers
    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    // 3. Render onto OffscreenCanvas
    const offscreen = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = offscreen.getContext('2d');

    if (!ctx) {
      throw new Error('OffscreenCanvas 2D context unavailable in worker');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Flatten background if transparency is disabled
    if (preset?.preserveTransparency === false) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // Draw bitmap into canvas (stripping EXIF metadata cleanly)
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    // 4. Resolve MIME type and quality
    let mimeType = 'image/png';
    const target = targetFormat.toUpperCase();
    if (target.includes('JPEG') || target.includes('JPG')) {
      mimeType = 'image/jpeg';
    } else if (target.includes('WEBP')) {
      mimeType = 'image/webp';
    } else if (target.includes('AVIF')) {
      mimeType = 'image/avif';
    }

    const qualityFraction = (preset?.imageQuality ?? 90) / 100;

    let blob: Blob;
    try {
      blob = await offscreen.convertToBlob({
        type: mimeType,
        quality: qualityFraction,
      });
    } catch {
      // Fallback to webp/png if browser's OffscreenCanvas doesn't support specific mime
      blob = await offscreen.convertToBlob({
        type: 'image/webp',
        quality: qualityFraction,
      });
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
