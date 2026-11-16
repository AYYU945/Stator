import { PresetSettings, DEFAULT_PRESET_SETTINGS } from '../types/queue.ts';

export type TargetResolution = 'Original' | '4K (2160p)' | '2K (1440p)' | '1080p' | '720p';

export interface GlobalPreset {
  imageQuality: number;
  targetResolution: TargetResolution;
  stripExif: boolean;
  videoBitrate?: string;
  audioBitrate?: string;
}

export const DEFAULT_PRESET: GlobalPreset = {
  imageQuality: 90,
  targetResolution: 'Original',
  stripExif: true,
};

export const GLOBAL_PRESET_STORAGE_KEY = 'stator_global_preset';
export const FALLBACK_PRESET_STORAGE_KEY = 'omniconvert_global_preset';
export const TELEMETRY_STORAGE_KEY = 'stator_telemetry_consent';

const VALID_IMAGE_RESIZE = new Set(['original', '4K', '2K', '1080p', '720p', 'custom']);
const VALID_VIDEO_RES = new Set(['original', '4K', '2K', '1080p', '720p', '480p']);
const VALID_VIDEO_BITRATE = new Set(['lossless', 'high', 'balanced', 'compact']);
const VALID_FPS = new Set(['original', '120', '60', '30', '24']);
const VALID_AUDIO_BITRATE = new Set(['320k', '256k', '192k', '128k', '64k']);
const VALID_VIDEO_AUDIO_BITRATE = new Set(['original', '320k', '192k', '128k', '64k', 'mute']);
const VALID_ASPECT_CROP = new Set(['original', '9:16', '1:1', '4:5', '16:9']);
const VALID_GIF_FPS = new Set(['10', '12', '15', '20', '24', '30']);
const VALID_GIF_DITHER = new Set(['sierra2_4a', 'bayer', 'none']);
const VALID_GIF_LOOP = new Set(['loop', 'boomerang']);
const VALID_ROTATIONS = new Set([0, 90, 180, 270]);

export function sanitizePresetSettings(raw: unknown): Partial<PresetSettings> {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<PresetSettings> = {};

  if (typeof input.imageQuality === 'number' && Number.isFinite(input.imageQuality)) {
    out.imageQuality = Math.min(100, Math.max(10, Math.round(input.imageQuality)));
  }
  if (typeof input.imageResize === 'string' && VALID_IMAGE_RESIZE.has(input.imageResize)) {
    out.imageResize = input.imageResize as PresetSettings['imageResize'];
  }
  if (typeof input.customWidth === 'number' && Number.isFinite(input.customWidth)) {
    out.customWidth = Math.min(8192, Math.max(16, Math.round(input.customWidth)));
  }
  if (typeof input.customHeight === 'number' && Number.isFinite(input.customHeight)) {
    out.customHeight = Math.min(8192, Math.max(16, Math.round(input.customHeight)));
  }
  if (typeof input.stripMetadata === 'boolean') {
    out.stripMetadata = input.stripMetadata;
  }
  if (typeof input.preserveTransparency === 'boolean') {
    out.preserveTransparency = input.preserveTransparency;
  }
  if (typeof input.videoBitrate === 'string' && VALID_VIDEO_BITRATE.has(input.videoBitrate)) {
    out.videoBitrate = input.videoBitrate as PresetSettings['videoBitrate'];
  }
  if (typeof input.videoResolution === 'string' && VALID_VIDEO_RES.has(input.videoResolution)) {
    out.videoResolution = input.videoResolution as PresetSettings['videoResolution'];
  }
  if (typeof input.fpsLimiter === 'string' && VALID_FPS.has(input.fpsLimiter)) {
    out.fpsLimiter = input.fpsLimiter as PresetSettings['fpsLimiter'];
  }
  if (typeof input.videoAudioBitrate === 'string' && VALID_VIDEO_AUDIO_BITRATE.has(input.videoAudioBitrate)) {
    out.videoAudioBitrate = input.videoAudioBitrate as PresetSettings['videoAudioBitrate'];
  }
  if (typeof input.trimStart === 'number' && Number.isFinite(input.trimStart) && input.trimStart >= 0) {
    out.trimStart = Math.min(86400, input.trimStart);
  }
  if (typeof input.trimEnd === 'number' && Number.isFinite(input.trimEnd) && input.trimEnd > 0) {
    out.trimEnd = Math.min(86400, input.trimEnd);
  }
  if (typeof input.aspectCrop === 'string' && VALID_ASPECT_CROP.has(input.aspectCrop)) {
    out.aspectCrop = input.aspectCrop as PresetSettings['aspectCrop'];
  }
  if (typeof input.gifFps === 'string' && VALID_GIF_FPS.has(input.gifFps)) {
    out.gifFps = input.gifFps as PresetSettings['gifFps'];
  }
  if (typeof input.gifDither === 'string' && VALID_GIF_DITHER.has(input.gifDither)) {
    out.gifDither = input.gifDither as PresetSettings['gifDither'];
  }
  if (typeof input.gifLoopMode === 'string' && VALID_GIF_LOOP.has(input.gifLoopMode)) {
    out.gifLoopMode = input.gifLoopMode as PresetSettings['gifLoopMode'];
  }
  if (typeof input.audioBitrate === 'string' && VALID_AUDIO_BITRATE.has(input.audioBitrate)) {
    out.audioBitrate = input.audioBitrate as PresetSettings['audioBitrate'];
  }
  if (input.audioChannels === 'stereo' || input.audioChannels === 'mono') {
    out.audioChannels = input.audioChannels;
  }
  if (
    typeof input.targetMaxSizeMb === 'number' &&
    Number.isFinite(input.targetMaxSizeMb) &&
    input.targetMaxSizeMb > 0
  ) {
    out.targetMaxSizeMb = Math.min(2000, Math.max(0.05, Number(input.targetMaxSizeMb.toFixed(2))));
  }
  if (typeof input.rotation === 'number' && VALID_ROTATIONS.has(input.rotation)) {
    out.rotation = input.rotation as PresetSettings['rotation'];
  }
  if (typeof input.flipH === 'boolean') {
    out.flipH = input.flipH;
  }
  if (typeof input.normalizeAudio === 'boolean') {
    out.normalizeAudio = input.normalizeAudio;
  }

  return out;
}

export function resolutionToResizeKey(res?: string): PresetSettings['imageResize'] {
  if (!res) return 'original';
  const clean = res.trim().toLowerCase();
  if (clean.includes('4k') || clean.includes('2160')) return '4K';
  if (clean.includes('2k') || clean.includes('1440')) return '2K';
  if (clean.includes('1080')) return '1080p';
  if (clean.includes('720')) return '720p';
  return 'original';
}

export function resizeKeyToResolution(key?: string): TargetResolution {
  if (!key) return 'Original';
  const clean = key.trim().toLowerCase();
  if (clean === '4k' || clean.includes('2160')) return '4K (2160p)';
  if (clean === '2k' || clean.includes('1440')) return '2K (1440p)';
  if (clean === '1080p' || clean.includes('1080')) return '1080p';
  if (clean === '720p' || clean.includes('720')) return '720p';
  return 'Original';
}

export function getStoredGlobalPreset(): GlobalPreset {
  if (typeof window === 'undefined') return { ...DEFAULT_PRESET };
  try {
    const raw =
      localStorage.getItem(GLOBAL_PRESET_STORAGE_KEY) ||
      localStorage.getItem(FALLBACK_PRESET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRESET };
    const parsed = JSON.parse(raw);
    const quality =
      typeof parsed.imageQuality === 'number'
        ? Math.min(100, Math.max(10, Math.round(parsed.imageQuality)))
        : DEFAULT_PRESET.imageQuality;
    return {
      imageQuality: quality,
      targetResolution: resizeKeyToResolution(parsed.targetResolution || parsed.imageResize),
      stripExif:
        typeof parsed.stripExif === 'boolean'
          ? parsed.stripExif
          : typeof parsed.stripMetadata === 'boolean'
          ? parsed.stripMetadata
          : DEFAULT_PRESET.stripExif,
      videoBitrate: parsed.videoBitrate || DEFAULT_PRESET.videoBitrate,
      audioBitrate: parsed.audioBitrate || DEFAULT_PRESET.audioBitrate,
    };
  } catch (err) {
    console.warn('Failed to parse global preset from localStorage:', err);
    return { ...DEFAULT_PRESET };
  }
}

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

export function settingsToGlobalPreset(settings: PresetSettings): GlobalPreset {
  return {
    imageQuality: settings.imageQuality,
    targetResolution: resizeKeyToResolution(settings.imageResize || settings.videoResolution),
    stripExif: Boolean(settings.stripMetadata),
    videoBitrate: settings.videoBitrate,
    audioBitrate: settings.audioBitrate,
  };
}

export interface BrandKit {
  brandName: string;
  accentColor: string;
  defaultAspect: 'original' | '9:16' | '1:1' | '4:5' | '16:9';
  defaultTargetFormat: string;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  brandName: 'Creator Studio',
  accentColor: '#18181B',
  defaultAspect: '9:16',
  defaultTargetFormat: 'MP4',
};

const BRAND_KIT_STORAGE_KEY = 'stator_brand_kit';

export function getStoredBrandKit(): BrandKit {
  if (typeof window === 'undefined') return { ...DEFAULT_BRAND_KIT };
  try {
    const raw = localStorage.getItem(BRAND_KIT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRAND_KIT };
    const parsed = JSON.parse(raw);
    return {
      brandName:
        typeof parsed.brandName === 'string' && parsed.brandName
          ? parsed.brandName.slice(0, 80)
          : DEFAULT_BRAND_KIT.brandName,
      accentColor:
        typeof parsed.accentColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(parsed.accentColor)
          ? parsed.accentColor
          : DEFAULT_BRAND_KIT.accentColor,
      defaultAspect: VALID_ASPECT_CROP.has(parsed.defaultAspect)
        ? parsed.defaultAspect
        : DEFAULT_BRAND_KIT.defaultAspect,
      defaultTargetFormat:
        typeof parsed.defaultTargetFormat === 'string'
          ? parsed.defaultTargetFormat
          : DEFAULT_BRAND_KIT.defaultTargetFormat,
    };
  } catch {
    return { ...DEFAULT_BRAND_KIT };
  }
}

export function saveBrandKit(kit: BrandKit): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRAND_KIT_STORAGE_KEY, JSON.stringify(kit));
  } catch (err) {
    console.warn('Failed to save Brand Kit:', err);
  }
}

export interface SharedPresetRecipe {
  name?: string;
  targetFormat?: string;
  settings: Partial<PresetSettings>;
}

export function encodePresetRecipeUrl(recipe: SharedPresetRecipe): string {
  const safeRecipe: SharedPresetRecipe = {
    name: recipe.name ? String(recipe.name).slice(0, 64) : undefined,
    targetFormat: recipe.targetFormat ? String(recipe.targetFormat).slice(0, 12) : undefined,
    settings: sanitizePresetSettings(recipe.settings),
  };
  const payload = JSON.stringify(safeRecipe);
  const encoded = btoa(unescape(encodeURIComponent(payload)));
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://stator.media/';
  return `${base}#preset=${encoded}`;
}

export function decodePresetRecipeFromHash(hash: string): SharedPresetRecipe | null {
  if (!hash || !hash.includes('preset=')) return null;
  try {
    const raw = hash.split('preset=')[1]?.split('&')[0];
    if (!raw || raw.length > 4096) return null;
    const json = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.settings) return null;
    const sanitized = sanitizePresetSettings(parsed.settings);
    return {
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 64) : undefined,
      targetFormat:
        typeof parsed.targetFormat === 'string' ? parsed.targetFormat.slice(0, 12) : undefined,
      settings: sanitized,
    };
  } catch {
    return null;
  }
}
