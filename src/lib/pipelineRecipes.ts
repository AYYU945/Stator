import { SmartPipelineRecipe } from '../types/pipeline.ts';
import { DEFAULT_PRESET_SETTINGS, FileTypeCategory, PresetSettings } from '../types/queue.ts';

const PIPELINES_STORAGE_KEY = 'stator_smart_pipelines_v3';

export const BUILT_IN_PIPELINES: SmartPipelineRecipe[] = [
  {
    id: 'pipe-video-social-vertical',
    name: 'Vertical Social Master (9:16)',
    category: 'video',
    targetFormat: 'MP4',
    description: 'Center-crop 9:16, cap 1080p @ 60fps, normalize audio to -16 LUFS, strip metadata.',
    createdAt: 1700000000000,
    isBuiltIn: true,
    steps: [
      {
        id: 's1',
        kind: 'crop-rotate',
        label: 'Crop 9:16 Vertical',
        enabled: true,
        summary: 'aspectCrop = 9:16',
        patch: { aspectCrop: '9:16' },
      },
      {
        id: 's2',
        kind: 'resize',
        label: 'Scale to 1080p @ 60fps',
        enabled: true,
        summary: '1080p · 60fps',
        patch: { videoResolution: '1080p', fpsLimiter: '60' },
      },
      {
        id: 's3',
        kind: 'normalize-lufs',
        label: 'Broadcast Loudness (-16 LUFS)',
        enabled: true,
        summary: 'EBU R128',
        patch: { normalizeAudio: true },
      },
      {
        id: 's4',
        kind: 'compress-encode',
        label: 'High Quality H.264 + Strip Metadata',
        enabled: true,
        summary: 'CRF 18 · clean tags',
        patch: { videoBitrate: 'high', stripMetadata: true },
      },
    ],
  },
  {
    id: 'pipe-image-web-opt',
    name: 'Web Delivery Image Pipeline',
    category: 'image',
    targetFormat: 'WEBP',
    description: 'Scale down to 2K max, subtle contrast & sharpen polish, strip EXIF, encode WebP 84%.',
    createdAt: 1700000001000,
    isBuiltIn: true,
    steps: [
      {
        id: 'i1',
        kind: 'resize',
        label: 'Constrain 2K Max',
        enabled: true,
        summary: 'imageResize = 2K',
        patch: { imageResize: '2K' },
      },
      {
        id: 'i2',
        kind: 'tone-adjust',
        label: 'Crisp Web Polish',
        enabled: true,
        summary: '+6 contrast · +18 sharpen',
        patch: {
          adjustments: {
            exposure: 0,
            contrast: 6,
            saturation: 4,
            temperature: 0,
            sharpen: 18,
            blur: 0,
          },
        },
      },
      {
        id: 'i3',
        kind: 'compress-encode',
        label: 'WebP 84% · Strip EXIF',
        enabled: true,
        summary: '84% · strip EXIF',
        patch: { imageQuality: 84, stripMetadata: true, preserveTransparency: true },
      },
    ],
  },
  {
    id: 'pipe-audio-podcast',
    name: 'Podcast & Voice Mastering',
    category: 'audio',
    targetFormat: 'MP3',
    description: 'High-pass rumble filter, dynamic compression, -16 LUFS leveling, 192 kbps MP3.',
    createdAt: 1700000002000,
    isBuiltIn: true,
    steps: [
      {
        id: 'a1',
        kind: 'audio-cleanup',
        label: 'Voice Rumble Filter & Dynamics',
        enabled: true,
        summary: '85Hz high-pass · compressor',
        patch: { noiseReduce: true, dynamicCompress: true, eqPreset: 'voice' },
      },
      {
        id: 'a2',
        kind: 'normalize-lufs',
        label: 'Normalize -16 LUFS',
        enabled: true,
        summary: 'Broadcast standard',
        patch: { normalizeAudio: true },
      },
      {
        id: 'a3',
        kind: 'compress-encode',
        label: '192 kbps Stereo MP3',
        enabled: true,
        summary: '192k · 48kHz',
        patch: { audioBitrate: '192k', audioSampleRate: '48000', audioChannels: 'stereo' },
      },
    ],
  },
];

export function loadSmartPipelines(): SmartPipelineRecipe[] {
  if (typeof window === 'undefined') return [...BUILT_IN_PIPELINES];
  try {
    const raw = localStorage.getItem(PIPELINES_STORAGE_KEY);
    if (!raw) return [...BUILT_IN_PIPELINES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...BUILT_IN_PIPELINES];
    return parsed;
  } catch {
    return [...BUILT_IN_PIPELINES];
  }
}

export function saveSmartPipelines(recipes: SmartPipelineRecipe[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PIPELINES_STORAGE_KEY, JSON.stringify(recipes));
  } catch {}
}

/**
 * Compiles all enabled pipeline steps into a single-pass PresetSettings object
 * so compatible operations execute in one encoding pass (avoiding repeated lossy passes).
 */
export function compilePipelineToPreset(
  recipe: SmartPipelineRecipe,
  base: PresetSettings = DEFAULT_PRESET_SETTINGS
): PresetSettings {
  let merged: PresetSettings = { ...base };
  for (const step of recipe.steps) {
    if (!step.enabled) continue;
    merged = {
      ...merged,
      ...step.patch,
      adjustments: step.patch.adjustments
        ? {
            ...(merged.adjustments || {
              exposure: 0,
              contrast: 0,
              saturation: 0,
              temperature: 0,
              sharpen: 0,
              blur: 0,
            }),
            ...step.patch.adjustments,
          }
        : merged.adjustments,
    };
  }
  return merged;
}

export function isPipelineCompatibleWithCategory(
  recipe: SmartPipelineRecipe,
  category: FileTypeCategory
): boolean {
  if (recipe.category === 'batch') return true;
  return recipe.category === category;
}
