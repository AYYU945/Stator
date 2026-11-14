export type FileTypeCategory = 'image' | 'video' | 'audio' | 'document' | 'other';
export type QueueItemStatus = 'ready' | 'converting' | 'completed' | 'error';

export interface PresetSettings {
  imageQuality: number; // 10 to 100, default 90
  imageResize: 'original' | '4K' | '2K' | '1080p' | '720p' | 'custom';
  customWidth?: number;
  customHeight?: number;
  stripMetadata: boolean; // default true
  preserveTransparency?: boolean; // default true
  videoBitrate: 'lossless' | 'high' | 'balanced' | 'compact';
  videoResolution: 'original' | '4K' | '2K' | '1080p' | '720p' | '480p';
  fpsLimiter: 'original' | '120' | '60' | '30' | '24';
  videoAudioBitrate?: 'original' | '320k' | '192k' | '128k' | '64k' | 'mute';
  audioBitrate: '320k' | '256k' | '192k' | '128k' | '64k';
  audioChannels?: 'stereo' | 'mono';
}

export const DEFAULT_PRESET_SETTINGS: PresetSettings = {
  imageQuality: 90,
  imageResize: 'original',
  customWidth: 1920,
  customHeight: 1080,
  stripMetadata: true,
  preserveTransparency: true,
  videoBitrate: 'high',
  videoResolution: 'original',
  fpsLimiter: 'original',
  videoAudioBitrate: 'original',
  audioBitrate: '192k',
  audioChannels: 'stereo',
};

export function getPresetLabel(
  preset: PresetSettings,
  typeCategory?: FileTypeCategory
): string {
  if (typeCategory === 'image') {
    if (preset.imageResize !== 'original') {
      if (preset.imageResize === '4K') return `4K UHD (${preset.imageQuality}%)`;
      if (preset.imageResize === '2K') return `2K QHD (${preset.imageQuality}%)`;
      return `${preset.imageResize.toUpperCase()} (${preset.imageQuality}%)`;
    }
    return preset.imageQuality >= 90
      ? `Lossless (${preset.imageQuality}%)`
      : `Quality (${preset.imageQuality}%)`;
  }

  if (typeCategory === 'video') {
    if (preset.videoResolution !== 'original') {
      const fps = preset.fpsLimiter !== 'original' ? ` @ ${preset.fpsLimiter}fps` : '';
      if (preset.videoResolution === '4K') return `4K UHD${fps}`;
      if (preset.videoResolution === '2K') return `2K QHD${fps}`;
      return `${preset.videoResolution}${fps}`;
    }
    switch (preset.videoBitrate) {
      case 'lossless':
        return 'Lossless Copy';
      case 'high':
        return 'High (CRF 18)';
      case 'balanced':
        return 'Balanced (CRF 23)';
      case 'compact':
        return 'Compact (CRF 28)';
    }
  }

  if (typeCategory === 'audio') {
    return `${preset.audioBitrate}bps`;
  }

  // Global / general label
  return preset.videoBitrate === 'lossless'
    ? 'Lossless Copy'
    : `Quality (${preset.imageQuality}%)`;
}

export interface QueueItem {
  id: string;
  file?: File;
  name: string;
  sizeFormatted: string;
  sizeBytes?: number;
  typeCategory: FileTypeCategory;
  formatBadge: string;
  metadata?: string;
  targetFormat: string;
  preset?: string;
  presetSettings?: PresetSettings;
  status: QueueItemStatus;
  progress: number;
  outputUrl?: string;
  outputBlob?: Blob;
  previewUrl?: string;
  dimensions?: string;
  outputDimensions?: string;
  outputName?: string;
  outputSizeBytes?: number;
  outputSizeFormatted?: string;
  reductionBadge?: string;
  speed?: string;
  workers?: number;
  eta?: string;
  pass?: string;
  conversionTime?: string;
  codecDetail?: string;
  errorMessage?: string;
  quality?: number;
  resolution?: 'Original' | '4K (2160p)' | '2K (1440p)' | '1080p' | '720p' | string;
  stripExif?: boolean;
  duration?: string;
  technicalTag?: string;
}

export const TARGET_FORMAT_OPTIONS: Record<FileTypeCategory, string[]> = {
  image: ['WEBP', 'PNG', 'JPEG', 'AVIF', 'ICO', 'TIFF', 'BMP'],
  video: ['MP4', 'WEBM', 'MOV', 'MKV', 'GIF', 'AVI', 'MP3', 'WAV'],
  audio: ['MP3', 'WAV', 'AAC', 'OGG', 'FLAC'],
  document: ['PDF', 'TXT'],
  other: ['ZIP', 'TXT', 'BIN'],
};

export const DEFAULT_TARGET_FORMAT: Record<FileTypeCategory, string> = {
  image: 'PNG',
  video: 'MP4',
  audio: 'MP3',
  document: 'PDF',
  other: 'ZIP',
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function detectTypeCategory(file: File): {
  typeCategory: FileTypeCategory;
  formatBadge: string;
  defaultTarget: string;
} {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

  if (
    mime.startsWith('image/') ||
    ['PNG', 'JPG', 'JPEG', 'WEBP', 'AVIF', 'SVG', 'RAW', 'ARW', 'CR2', 'NEF', 'TIFF', 'DNG'].includes(ext)
  ) {
    return {
      typeCategory: 'image',
      formatBadge: ext === 'ARW' ? 'SONY ARW' : ext,
      defaultTarget: ext === 'PNG' ? 'WEBP' : 'PNG',
    };
  }

  if (
    mime.startsWith('video/') ||
    ['MP4', 'MOV', 'MKV', 'WEBM', 'AVI', 'M4V', 'FLV'].includes(ext)
  ) {
    return {
      typeCategory: 'video',
      formatBadge: ext === 'MOV' ? 'PRORES 422' : ext,
      defaultTarget: ext === 'MP4' ? 'WEBM' : 'MP4',
    };
  }

  if (
    mime.startsWith('audio/') ||
    ['MP3', 'WAV', 'AAC', 'OGG', 'FLAC', 'M4A'].includes(ext)
  ) {
    return {
      typeCategory: 'audio',
      formatBadge: ext,
      defaultTarget: ext === 'MP3' ? 'WAV' : 'MP3',
    };
  }

  if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime.includes('text') ||
    ['PDF', 'DOC', 'DOCX', 'TXT', 'MD', 'RTF', 'EPUB'].includes(ext)
  ) {
    return {
      typeCategory: 'document',
      formatBadge: ext,
      defaultTarget: ext === 'PDF' ? 'TXT' : 'PDF',
    };
  }

  return {
    typeCategory: 'other',
    formatBadge: ext,
    defaultTarget: 'ZIP',
  };
}
