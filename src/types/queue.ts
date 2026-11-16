export type FileTypeCategory = 'image' | 'video' | 'audio' | 'document' | 'other';
export type QueueItemStatus = 'ready' | 'converting' | 'completed' | 'error';

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface StreamMetadataSummary {
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  fps?: string;
  sampleRate?: string;
  bitrate?: string;
}

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
  trimStart?: number; // seconds
  trimEnd?: number; // seconds
  aspectCrop?: 'original' | '9:16' | '1:1' | '4:5' | '16:9';
  gifFps?: '10' | '12' | '15' | '20' | '24' | '30';
  gifDither?: 'sierra2_4a' | 'bayer' | 'none';
  gifLoopMode?: 'loop' | 'boomerang';
  audioBitrate: '320k' | '256k' | '192k' | '128k' | '64k';
  audioChannels?: 'stereo' | 'mono';
  // Release 1.2 & 2.0 additions
  targetMaxSizeMb?: number;
  rotation?: RotationDegrees;
  flipH?: boolean;
  normalizeAudio?: boolean;
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
  trimStart: 0,
  trimEnd: undefined,
  aspectCrop: 'original',
  gifFps: '15',
  gifDither: 'sierra2_4a',
  gifLoopMode: 'loop',
  audioBitrate: '192k',
  audioChannels: 'stereo',
  targetMaxSizeMb: undefined,
  rotation: 0,
  flipH: false,
  normalizeAudio: false,
};

export function getPresetLabel(
  preset: PresetSettings,
  typeCategory?: FileTypeCategory
): string {
  const rotSuffix = preset.rotation ? ` · ${preset.rotation}°` : '';
  const sizeSuffix =
    typeof preset.targetMaxSizeMb === 'number' && preset.targetMaxSizeMb > 0
      ? ` · ≤${preset.targetMaxSizeMb}MB`
      : '';

  if (typeCategory === 'image') {
    if (preset.imageResize !== 'original') {
      if (preset.imageResize === '4K') return `4K UHD (${preset.imageQuality}%)${rotSuffix}${sizeSuffix}`;
      if (preset.imageResize === '2K') return `2K QHD (${preset.imageQuality}%)${rotSuffix}${sizeSuffix}`;
      return `${preset.imageResize.toUpperCase()} (${preset.imageQuality}%)${rotSuffix}${sizeSuffix}`;
    }
    return preset.imageQuality >= 90
      ? `Lossless (${preset.imageQuality}%)${rotSuffix}${sizeSuffix}`
      : `Quality (${preset.imageQuality}%)${rotSuffix}${sizeSuffix}`;
  }

  if (typeCategory === 'video') {
    const cropSuffix =
      preset.aspectCrop && preset.aspectCrop !== 'original' ? ` · ${preset.aspectCrop}` : '';
    const normSuffix = preset.normalizeAudio ? ' · -16 LUFS' : '';
    if (preset.videoResolution !== 'original') {
      const fps = preset.fpsLimiter !== 'original' ? ` @ ${preset.fpsLimiter}fps` : '';
      if (preset.videoResolution === '4K') return `4K UHD${fps}${cropSuffix}${rotSuffix}${sizeSuffix}${normSuffix}`;
      if (preset.videoResolution === '2K') return `2K QHD${fps}${cropSuffix}${rotSuffix}${sizeSuffix}${normSuffix}`;
      return `${preset.videoResolution}${fps}${cropSuffix}${rotSuffix}${sizeSuffix}${normSuffix}`;
    }
    switch (preset.videoBitrate) {
      case 'lossless':
        return `Lossless Copy${cropSuffix}${rotSuffix}${sizeSuffix}${normSuffix}`;
      case 'high':
        return `High (CRF 18)${cropSuffix}${rotSuffix}${sizeSuffix}${normSuffix}`;
      case 'balanced':
        return `Balanced (CRF 23)${cropSuffix}${rotSuffix}${sizeSuffix}${normSuffix}`;
      case 'compact':
        return `Compact (CRF 28)${cropSuffix}${rotSuffix}${sizeSuffix}${normSuffix}`;
    }
  }

  if (typeCategory === 'audio') {
    const normSuffix = preset.normalizeAudio ? ' · -16 LUFS' : '';
    return `${preset.audioBitrate}bps${normSuffix}`;
  }

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
  durationSeconds?: number;
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
  streamMetadata?: StreamMetadataSummary;
  warningMessage?: string;
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
  document: [],
  other: [],
};

export const DEFAULT_TARGET_FORMAT: Record<FileTypeCategory, string> = {
  image: 'PNG',
  video: 'MP4',
  audio: 'MP3',
  document: 'PDF',
  other: 'MP4',
};

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function detectTypeCategory(file: File): {
  typeCategory: FileTypeCategory;
  formatBadge: string;
  defaultTarget: string;
} {
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

  // Camera RAW containers are not browser-decodable without dedicated RAW demosaicers
  if (['RAW', 'ARW', 'CR2', 'CR3', 'NEF', 'DNG', 'RAF', 'ORF', 'RW2'].includes(ext)) {
    return {
      typeCategory: 'other',
      formatBadge: ext === 'ARW' ? 'SONY ARW' : `${ext} RAW`,
      defaultTarget: 'PNG',
    };
  }

  if (
    mime.startsWith('image/') ||
    ['PNG', 'JPG', 'JPEG', 'WEBP', 'AVIF', 'GIF', 'BMP', 'ICO', 'SVG'].includes(ext)
  ) {
    return {
      typeCategory: 'image',
      formatBadge: ext,
      defaultTarget: ext === 'PNG' ? 'WEBP' : 'PNG',
    };
  }

  if (
    mime.startsWith('video/') ||
    ['MP4', 'MOV', 'MKV', 'WEBM', 'AVI', 'M4V', 'FLV', 'TS', 'OGV'].includes(ext)
  ) {
    return {
      typeCategory: 'video',
      formatBadge: ext === 'MOV' ? 'MOV' : ext,
      defaultTarget: ext === 'MP4' ? 'WEBM' : 'MP4',
    };
  }

  if (
    mime.startsWith('audio/') ||
    ['MP3', 'WAV', 'AAC', 'OGG', 'FLAC', 'M4A', 'OPUS', 'WMA'].includes(ext)
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
      defaultTarget: 'PDF',
    };
  }

  return {
    typeCategory: 'other',
    formatBadge: ext,
    defaultTarget: 'MP4',
  };
}
