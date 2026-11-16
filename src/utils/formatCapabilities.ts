import { detectTypeCategory, formatFileSize } from '../types/queue.ts';

export const LARGE_FILE_WARNING_BYTES = 500 * 1024 * 1024; // 500 MB soft caution
export const HARD_MEMFS_LIMIT_BYTES = 1800 * 1024 * 1024; // ~1.8 GB WASM32 MEMFS guardrail

const RAW_EXTENSIONS = new Set([
  'RAW', 'ARW', 'CR2', 'CR3', 'NEF', 'DNG', 'RAF', 'ORF', 'RW2', 'SR2', 'PEF',
]);

const SUPPORTED_IMAGE_EXTS = new Set([
  'PNG', 'JPG', 'JPEG', 'WEBP', 'AVIF', 'GIF', 'BMP', 'ICO', 'SVG',
]);

const SUPPORTED_VIDEO_EXTS = new Set([
  'MP4', 'MOV', 'MKV', 'WEBM', 'AVI', 'M4V', 'FLV', 'TS', 'OGV',
]);

const SUPPORTED_AUDIO_EXTS = new Set([
  'MP3', 'WAV', 'AAC', 'OGG', 'FLAC', 'M4A', 'OPUS', 'WMA',
]);

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
  warning?: string;
}

export function sanitizeFilename(name: string): string {
  const cleaned = (name || 'media_file')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return cleaned || 'media_file';
}

export function buildOutputFilename(sourceName: string, targetFormat: string): string {
  const sanitized = sanitizeFilename(sourceName);
  const stem = sanitized.replace(/\.[^/.]+$/, '') || 'output';
  const ext = (targetFormat || 'bin')
    .toLowerCase()
    .split(' ')[0]
    .replace(/[^a-z0-9]/g, '') || 'bin';
  return `${stem}.${ext}`;
}

export function getTargetMimeForFormat(fmt: string): string {
  switch (fmt.toUpperCase().split(' ')[0]) {
    case 'MOV':
      return 'video/quicktime';
    case 'AVI':
      return 'video/x-msvideo';
    case 'MP4':
      return 'video/mp4';
    case 'WEBM':
      return 'video/webm';
    case 'MKV':
      return 'video/x-matroska';
    case 'GIF':
      return 'image/gif';
    case 'MP3':
      return 'audio/mpeg';
    case 'WAV':
      return 'audio/wav';
    case 'AAC':
      return 'audio/aac';
    case 'OGG':
      return 'audio/ogg';
    case 'FLAC':
      return 'audio/flac';
    case 'ICO':
      return 'image/x-icon';
    case 'TIFF':
    case 'TIF':
      return 'image/tiff';
    case 'BMP':
      return 'image/bmp';
    case 'PNG':
      return 'image/png';
    case 'JPEG':
    case 'JPG':
      return 'image/jpeg';
    case 'WEBP':
      return 'image/webp';
    case 'AVIF':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

export function validateIncomingFile(file: File): FileValidationResult {
  if (!file || file.size <= 0) {
    return {
      valid: false,
      reason: `"${file?.name || 'File'}" is empty (0 bytes) and cannot be converted.`,
    };
  }

  const ext = file.name.split('.').pop()?.toUpperCase() || '';
  if (RAW_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: `${ext} camera RAW files require a native demosaicer and are not supported directly in browser Canvas/WASM. Export DNG/RAW to PNG or JPEG first.`,
    };
  }

  const detected = detectTypeCategory(file);
  const isMedia =
    detected.typeCategory === 'image' ||
    detected.typeCategory === 'video' ||
    detected.typeCategory === 'audio';

  if (
    !isMedia &&
    !SUPPORTED_IMAGE_EXTS.has(ext) &&
    !SUPPORTED_VIDEO_EXTS.has(ext) &&
    !SUPPORTED_AUDIO_EXTS.has(ext)
  ) {
    return {
      valid: false,
      reason: `Unsupported file type ".${ext || 'unknown'}". Stator converts image, video, and audio streams locally.`,
    };
  }

  if (file.size > HARD_MEMFS_LIMIT_BYTES) {
    return {
      valid: false,
      reason: `"${file.name}" (${formatFileSize(file.size)}) exceeds the 1.8 GB browser WASM memory ceiling.`,
    };
  }

  if (file.size >= LARGE_FILE_WARNING_BYTES) {
    return {
      valid: true,
      warning: `Large file (${formatFileSize(file.size)}): close unused tabs to keep WASM memory under 1.8 GB.`,
    };
  }

  return { valid: true };
}

const encoderSupportCache = new Map<string, Promise<boolean>>();

/**
 * Probes genuine browser encoder support for a MIME type (e.g. image/avif, image/webp).
 * Returns false if the browser throws or silently substitutes image/png.
 */
export function probeImageEncoderSupport(mimeType: string): Promise<boolean> {
  const norm = mimeType.toLowerCase();
  if (norm === 'image/png' || norm === 'image/jpeg') {
    return Promise.resolve(true);
  }
  if (norm === 'image/bmp' || norm === 'image/tiff' || norm === 'image/x-icon') {
    return Promise.resolve(true);
  }

  const cached = encoderSupportCache.get(norm);
  if (cached) return cached;

  const probe = (async (): Promise<boolean> => {
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        const c = new OffscreenCanvas(2, 2);
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#18181b';
          ctx.fillRect(0, 0, 2, 2);
          const blob = await c.convertToBlob({ type: norm, quality: 0.8 });
          return blob.size > 0 && blob.type.toLowerCase() === norm;
        }
      }
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = 2;
        c.height = 2;
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res, norm, 0.8));
        return Boolean(blob && blob.size > 0 && blob.type.toLowerCase() === norm);
      }
      return false;
    } catch {
      return false;
    }
  })();

  encoderSupportCache.set(norm, probe);
  return probe;
}

/**
 * Verifies output Blob non-emptiness, MIME alignment, and container/image magic bytes.
 */
export async function verifyOutputBlob(
  blob: Blob,
  targetFormat: string
): Promise<{ ok: boolean; error?: string }> {
  if (!blob || blob.size <= 0) {
    return { ok: false, error: 'Encoder produced an empty output file.' };
  }

  const fmt = targetFormat.toUpperCase().split(' ')[0];
  const expectedMime = getTargetMimeForFormat(fmt);

  // Guard against silent image/png fallback when requesting AVIF/WEBP/JPEG
  if (
    blob.type &&
    expectedMime.startsWith('image/') &&
    fmt !== 'ICO' &&
    fmt !== 'TIFF' &&
    fmt !== 'BMP' &&
    blob.type.toLowerCase() !== expectedMime
  ) {
    return {
      ok: false,
      error: `Browser returned ${blob.type} instead of requested ${expectedMime}.`,
    };
  }

  const headerLen = Math.min(32, blob.size);
  const bytes = new Uint8Array(await blob.slice(0, headerLen).arrayBuffer());

  if (fmt === 'PNG') {
    const isPng =
      bytes.length >= 4 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    if (!isPng) return { ok: false, error: 'Output failed PNG header validation.' };
  } else if (fmt === 'JPEG' || fmt === 'JPG') {
    const isJpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isJpg) return { ok: false, error: 'Output failed JPEG header validation.' };
  } else if (fmt === 'BMP') {
    const isBmp = bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d;
    if (!isBmp) return { ok: false, error: 'Output failed BMP header validation.' };
  } else if (fmt === 'TIFF' || fmt === 'TIF') {
    const isTiff =
      bytes.length >= 4 &&
      ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
        (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a));
    if (!isTiff) return { ok: false, error: 'Output failed TIFF header validation.' };
  } else if (fmt === 'ICO') {
    const isIco =
      bytes.length >= 4 &&
      bytes[0] === 0x00 &&
      bytes[1] === 0x00 &&
      bytes[2] === 0x01 &&
      bytes[3] === 0x00;
    if (!isIco) return { ok: false, error: 'Output failed ICO header validation.' };
  } else if (fmt === 'GIF') {
    const isGif = bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
    if (!isGif) return { ok: false, error: 'Output failed GIF header validation.' };
  } else if (fmt === 'WEBP' || fmt === 'WAV' || fmt === 'AVI') {
    const isRiff =
      bytes.length >= 4 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    if (!isRiff) return { ok: false, error: `Output failed ${fmt} RIFF header validation.` };
  } else if (fmt === 'OGG') {
    const isOgg =
      bytes.length >= 4 &&
      bytes[0] === 0x4f &&
      bytes[1] === 0x67 &&
      bytes[2] === 0x67 &&
      bytes[3] === 0x53;
    if (!isOgg) return { ok: false, error: 'Output failed OGG header validation.' };
  } else if (fmt === 'FLAC') {
    const isFlac =
      bytes.length >= 4 &&
      bytes[0] === 0x66 &&
      bytes[1] === 0x4c &&
      bytes[2] === 0x61 &&
      bytes[3] === 0x43;
    if (!isFlac) return { ok: false, error: 'Output failed FLAC header validation.' };
  }

  return { ok: true };
}
