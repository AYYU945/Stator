import { formatFileSize } from '../types/queue.ts';

export interface ExtractedMetadata {
  dimensions?: string;
  duration?: string;
  durationSeconds?: number;
  technicalTag: string;
}

export function formatDurationMMSS(durationSeconds: number): string {
  if (!durationSeconds || isNaN(durationSeconds) || !isFinite(durationSeconds)) {
    return '';
  }
  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export async function extractFileMetadata(file: File): Promise<ExtractedMetadata> {
  const sizeFormatted = formatFileSize(file.size);
  const isImage =
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|avif|gif|bmp|svg|ico)$/i.test(file.name);
  const isVideo =
    file.type.startsWith('video/') ||
    /\.(mp4|webm|mkv|mov|avi|wmv|m4v|ts|ogv)$/i.test(file.name);
  const isAudio =
    file.type.startsWith('audio/') ||
    /\.(mp3|wav|ogg|aac|flac|m4a|opus|wma)$/i.test(file.name);

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
        const dur = Number.isFinite(video.duration) ? video.duration : undefined;
        const durFormatted = dur ? formatDurationMMSS(dur) : '';
        cleanup();

        const parts: string[] = [];
        if (w && h) parts.push(`${w}x${h}`);
        if (durFormatted) parts.push(durFormatted);
        parts.push(sizeFormatted);

        resolve({
          dimensions: w && h ? `${w}x${h}` : undefined,
          duration: durFormatted || undefined,
          durationSeconds: dur,
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
        const dur = Number.isFinite(audio.duration) ? audio.duration : undefined;
        const durFormatted = dur ? formatDurationMMSS(dur) : '';
        cleanup();

        const parts: string[] = [];
        if (durFormatted) parts.push(durFormatted);
        parts.push(sizeFormatted);

        resolve({
          duration: durFormatted || undefined,
          durationSeconds: dur,
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
