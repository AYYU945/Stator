import { formatFileSize } from '../types/queue.ts';

export interface ExtractedMetadata {
  dimensions?: string;
  duration?: string;
  technicalTag: string;
}

/**
 * Format duration in seconds to standard MM:SS display
 */
export function formatDurationMMSS(durationSeconds: number): string {
  if (!durationSeconds || isNaN(durationSeconds) || !isFinite(durationSeconds)) {
    return '';
  }
  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Extract basic container metadata before conversion begins
 * Images: natural width and height via Image or createImageBitmap
 * Videos: dimensions and duration via hidden video element with temporary object URL
 */
export async function extractFileMetadata(file: File): Promise<ExtractedMetadata> {
  const sizeFormatted = formatFileSize(file.size);
  const isImage =
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|avif|gif|bmp|svg|tiff?)$/i.test(file.name);
  const isVideo =
    file.type.startsWith('video/') ||
    /\.(mp4|webm|mkv|mov|avi|wmv|m4v)$/i.test(file.name);
  const isAudio =
    file.type.startsWith('audio/') ||
    /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(file.name);

  // 1. Image Metadata
  if (isImage) {
    try {
      if (typeof createImageBitmap !== 'undefined') {
        const bitmap = await createImageBitmap(file);
        const w = bitmap.width;
        const h = bitmap.height;
        bitmap.close();
        return {
          dimensions: `${w}x${h}`,
          technicalTag: `${w}x${h} • ${sizeFormatted}`,
        };
      } else if (typeof window !== 'undefined') {
        return await new Promise((resolve) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(url);
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            resolve({
              dimensions: `${w}x${h}`,
              technicalTag: `${w}x${h} • ${sizeFormatted}`,
            });
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ technicalTag: sizeFormatted });
          };
          img.src = url;
        });
      }
    } catch {
      return { technicalTag: sizeFormatted };
    }
  }

  // 2. Video Metadata
  if (isVideo && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.src = '';
      };

      video.onloadedmetadata = () => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        const dur = video.duration;
        const durFormatted = formatDurationMMSS(dur);
        cleanup();

        const parts: string[] = [];
        if (w && h) parts.push(`${w}x${h}`);
        if (durFormatted) parts.push(durFormatted);
        parts.push(sizeFormatted);

        resolve({
          dimensions: w && h ? `${w}x${h}` : undefined,
          duration: durFormatted || undefined,
          technicalTag: parts.join(' • '),
        });
      };

      video.onerror = () => {
        cleanup();
        resolve({ technicalTag: sizeFormatted });
      };

      video.src = url;
    });
  }

  // 3. Audio Metadata
  if (isAudio && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      const url = URL.createObjectURL(file);

      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.src = '';
      };

      audio.onloadedmetadata = () => {
        const dur = audio.duration;
        const durFormatted = formatDurationMMSS(dur);
        cleanup();

        const parts: string[] = [];
        if (durFormatted) parts.push(durFormatted);
        parts.push(sizeFormatted);

        resolve({
          duration: durFormatted || undefined,
          technicalTag: parts.join(' • '),
        });
      };

      audio.onerror = () => {
        cleanup();
        resolve({ technicalTag: sizeFormatted });
      };

      audio.src = url;
    });
  }

  return { technicalTag: sizeFormatted };
}
