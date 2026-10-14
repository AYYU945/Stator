import { PresetSettings, DEFAULT_PRESET_SETTINGS, FileTypeCategory } from '../types/queue.ts';

export type TargetResolution = 'Original' | '4K (2160p)' | '2K (1440p)' | '1080p' | '720p';

export interface GlobalPreset {
  imageQuality: number; // e.g. 90
  targetResolution: TargetResolution;
  stripExif: boolean;
  videoBitrate?: string;
  audioBitrate?: string;
}

export const DEFAULT_PRESET: GlobalPreset = {
  imageQuality: 90,
  targetResolution: 'Original',
  stripExif: false,
};

export const GLOBAL_PRESET_STORAGE_KEY = 'stator_global_preset';
export const FALLBACK_PRESET_STORAGE_KEY = 'omniconvert_global_preset';
export const TELEMETRY_STORAGE_KEY = 'stator_telemetry_consent';

/**
 * Maps human-readable TargetResolution to PresetSettings resize key
 */
export function resolutionToResizeKey(res?: string): PresetSettings['imageResize'] {
  if (!res) return 'original';
  const clean = res.trim().toLowerCase();
  if (clean.includes('4k') || clean.includes('2160')) return '4K';
  if (clean.includes('2k') || clean.includes('1440')) return '2K';
  if (clean.includes('1080')) return '1080p';
  if (clean.includes('720')) return '720p';
  return 'original';
}

/**
 * Maps PresetSettings resize key to human-readable TargetResolution
 */
export function resizeKeyToResolution(key?: string): TargetResolution {
  if (!key) return 'Original';
  const clean = key.trim().toLowerCase();
  if (clean === '4k' || clean.includes('2160')) return '4K (2160p)';
  if (clean === '2k' || clean.includes('1440')) return '2K (1440p)';
  if (clean === '1080p' || clean.includes('1080')) return '1080p';
  if (clean === '720p' || clean.includes('720')) return '720p';
  return 'Original';
}

/**
 * Loads the active GlobalPreset from localStorage or returns default
 */
export function getStoredGlobalPreset(): GlobalPreset {
  if (typeof window === 'undefined') return { ...DEFAULT_PRESET };
  try {
    const raw =
      localStorage.getItem(GLOBAL_PRESET_STORAGE_KEY) ||
      localStorage.getItem(FALLBACK_PRESET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRESET };
    const parsed = JSON.parse(raw);
    return {
      imageQuality: typeof parsed.imageQuality === 'number' ? parsed.imageQuality : DEFAULT_PRESET.imageQuality,
      targetResolution: resizeKeyToResolution(parsed.targetResolution || parsed.imageResize),
      stripExif: typeof parsed.stripExif === 'boolean' ? parsed.stripExif : (typeof parsed.stripMetadata === 'boolean' ? parsed.stripMetadata : DEFAULT_PRESET.stripExif),
      videoBitrate: parsed.videoBitrate || DEFAULT_PRESET.videoBitrate,
      audioBitrate: parsed.audioBitrate || DEFAULT_PRESET.audioBitrate,
    };
  } catch (err) {
    console.warn('Failed to parse global preset from localStorage:', err);
    return { ...DEFAULT_PRESET };
  }
}

/**
 * Persists the active GlobalPreset to localStorage and notifies listeners
 */
export function saveGlobalPreset(preset: GlobalPreset): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GLOBAL_PRESET_STORAGE_KEY, JSON.stringify(preset));
    window.dispatchEvent(new CustomEvent('stator_preset_changed', { detail: preset }));
    window.dispatchEvent(new CustomEvent('omniconvert_preset_changed', { detail: preset }));
  } catch (err) {
    console.warn('Failed to save global preset to localStorage:', err);
  }
}

/**
 * Converts a GlobalPreset into a full PresetSettings object
 */
export function globalPresetToSettings(preset: GlobalPreset): PresetSettings {
  const resize = resolutionToResizeKey(preset.targetResolution);
  return {
    ...DEFAULT_PRESET_SETTINGS,
    imageQuality: preset.imageQuality,
    imageResize: resize,
    videoResolution: resize === 'custom' ? 'original' : (resize as any),
    stripMetadata: preset.stripExif,
    videoBitrate: (preset.videoBitrate as any) || DEFAULT_PRESET_SETTINGS.videoBitrate,
    audioBitrate: (preset.audioBitrate as any) || DEFAULT_PRESET_SETTINGS.audioBitrate,
  };
}

/**
 * Converts a PresetSettings object into a GlobalPreset
 */
export function settingsToGlobalPreset(settings: PresetSettings): GlobalPreset {
  return {
    imageQuality: settings.imageQuality,
    targetResolution: resizeKeyToResolution(settings.imageResize || settings.videoResolution),
    stripExif: Boolean(settings.stripMetadata),
    videoBitrate: settings.videoBitrate,
    audioBitrate: settings.audioBitrate,
  };
}
