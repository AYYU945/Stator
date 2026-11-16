import { ffmpegManager, WasmStatus, TranscodeTelemetry } from '../utils/ffmpegManager.ts';
import { PresetSettings } from '../types/queue.ts';

export { ffmpegManager, type WasmStatus, type TranscodeTelemetry };

export function getAllocatedHardwareThreads(): number {
  return ffmpegManager.getAllocatedThreads();
}

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

export async function cleanupVirtualFiles(
  ffmpeg: any,
  inputName?: string,
  outputName?: string
): Promise<void> {
  if (!ffmpeg) return;
  if (inputName) {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}
  }
  if (outputName) {
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {}
  }
}

export async function deleteVirtualFile(ffmpeg: any, fileName: string): Promise<void> {
  if (!ffmpeg || !fileName) return;
  try {
    await ffmpeg.deleteFile(fileName);
  } catch {}
}

export function revokeMediaUrl(url?: string | null): void {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}

export async function transcodeMediaSafe(
  file: File,
  targetFormat: string,
  onProgress: (progress: number, telemetry?: TranscodeTelemetry) => void,
  preset?: PresetSettings,
  signal?: AbortSignal,
  durationSeconds?: number
) {
  return ffmpegManager.transcodeMedia(
    file,
    targetFormat,
    onProgress,
    preset,
    signal,
    durationSeconds
  );
}
