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
    const scale = Math.min(maxW / origW, maxH / origH);
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
 * Converts an image file client-side using Web Worker with OffscreenCanvas & createImageBitmap
 * Falls back to main thread canvas if Web Worker/OffscreenCanvas is unsupported.
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
  // 1. Try OffscreenCanvas Web Worker pipeline first (non-blocking, parallel)
  try {
    return await imageWorkerPool.convertImage(file, targetFormat, preset);
  } catch (workerErr) {
    console.info('Falling back to main thread image processing:', workerErr);
  }

  // 2. Fallback to main thread Image / Canvas pipeline if needed
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
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
