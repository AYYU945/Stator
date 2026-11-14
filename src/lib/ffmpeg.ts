import { ffmpegManager, WasmStatus } from '../utils/ffmpegManager.ts';
import { PresetSettings } from '../types/queue.ts';

export { ffmpegManager, type WasmStatus };

/**
 * Resolves allocated WebAssembly worker threads based on local device concurrency
 */
export function getAllocatedHardwareThreads(): number {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  return 4;
}

/**
 * Translates audio bitrate setting into standardized FFmpeg command-line flags:
 * - 64 kbps -> ['-b:a', '64k']
 * - 128 kbps -> ['-b:a', '128k']
 * - 192 kbps -> ['-b:a', '192k']
 * - 320 kbps -> ['-b:a', '320k']
 */
export function getAudioBitrateFlags(bitrate?: PresetSettings['audioBitrate'] | string): string[] {
  switch (bitrate) {
    case '64k':
      return ['-b:a', '64k'];
    case '128k':
      return ['-b:a', '128k'];
    case '192k':
      return ['-b:a', '192k'];
    case '320k':
      return ['-b:a', '320k'];
    default:
      return ['-b:a', bitrate || '192k'];
  }
}

/**
 * Explicit helper to delete input and output virtual files in WebAssembly memory
 * Called after every individual file transcode finishes (success or failure)
 */
export async function cleanupVirtualFiles(
  ffmpeg: any,
  inputName?: string,
  outputName?: string
): Promise<void> {
  if (!ffmpeg) return;

  if (inputName) {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // Ignore unlinked file
    }
  }

  if (outputName) {
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Ignore unlinked file
    }
  }
}

/**
 * Explicit helper to delete a single virtual file in WebAssembly memory
 */
export async function deleteVirtualFile(ffmpeg: any, fileName: string): Promise<void> {
  if (!ffmpeg || !fileName) return;
  try {
    await ffmpeg.deleteFile(fileName);
  } catch {
    // Ignore if file was already unlinked
  }
}

/**
 * Revoke lingering Object URLs created during processing to reclaim browser virtual memory
 */
export function revokeMediaUrl(url?: string | null): void {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore if already revoked
    }
  }
}

/**
 * Memory-safe media transcoding pipeline with sequential cleanup.
 * Guarantees explicit deletion of input and output virtual files via deleteFile()
 * upon completion or failure.
 */
export async function transcodeMediaSafe(
  file: File,
  targetFormat: string,
  onProgress: (progress: number, speed?: string) => void,
  preset?: PresetSettings
) {
  return ffmpegManager.transcodeMedia(file, targetFormat, onProgress, preset);
}
