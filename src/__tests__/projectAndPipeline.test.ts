import { describe, it, expect } from 'vitest';
import {
  migrateProjectRecord,
  exportProjectBundleJson,
  parseProjectBundleJson,
  inferProjectTypeFromFiles,
} from '../utils/projectStorage.ts';
import { sanitizeStatorSettings, applyFilenameTemplate } from '../lib/settingsStore.ts';
import {
  BUILT_IN_PIPELINES,
  compilePipelineToPreset,
  isPipelineCompatibleWithCategory,
} from '../lib/pipelineRecipes.ts';
import {
  parseSubtitlesText,
  serializeCuesToSrt,
  serializeCuesToVtt,
} from '../utils/subtitles.ts';
import {
  applyCompressionGoalToPreset,
  evaluateTargetSizeFeasibility,
} from '../utils/compressionEngine.ts';
import { DEFAULT_PRESET_SETTINGS } from '../types/queue.ts';
import { PROJECT_SCHEMA_VERSION, ProjectRecord } from '../types/project.ts';

describe('Stator 3.0 Project & Pipeline Architecture', () => {
  it('migrates valid project records and strips cached blob flags on bundle transfer', () => {
    const raw = {
      id: 'proj-alpha',
      name: '  Podcast Episode 12  ',
      type: 'audio',
      pinned: true,
      assets: [
        {
          id: 'asset-1',
          name: 'voice.wav',
          mimeType: 'audio/wav',
          sizeBytes: 1024000,
          sizeFormatted: '1.00 MB',
          typeCategory: 'audio',
          formatBadge: 'WAV',
          targetFormat: 'MP3',
          hasCachedBlob: true,
          presetSettings: { normalizeAudio: true },
        },
      ],
    };

    const migrated = migrateProjectRecord(raw);
    expect(migrated).not.toBeNull();
    expect(migrated!.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(migrated!.name).toBe('Podcast Episode 12');
    expect(migrated!.assets[0].hasCachedBlob).toBe(true);
    expect(migrated!.assets[0].presetSettings.normalizeAudio).toBe(true);

    const bundleJson = exportProjectBundleJson(migrated as ProjectRecord);
    const parsedBundle = JSON.parse(bundleJson);
    expect(parsedBundle.statorProjectBundle).toBe(3);
    expect(parsedBundle.project.assets[0].hasCachedBlob).toBe(false);

    const imported = parseProjectBundleJson(bundleJson);
    expect(imported).not.toBeNull();
    expect(imported!.id).not.toBe('proj-alpha');
    expect(imported!.assets[0].hasCachedBlob).toBe(false);
    expect(imported!.assets[0].presetSettings.normalizeAudio).toBe(true);
  });

  it('infers project types accurately from staged file categories', () => {
    expect(inferProjectTypeFromFiles([])).toBe('blank');
    expect(inferProjectTypeFromFiles([{ typeCategory: 'video' }])).toBe('video');
    expect(inferProjectTypeFromFiles([{ typeCategory: 'image' }, { typeCategory: 'image' }])).toBe('image');
    expect(inferProjectTypeFromFiles([{ typeCategory: 'audio' }])).toBe('audio');
    expect(inferProjectTypeFromFiles([{ typeCategory: 'image' }, { typeCategory: 'video' }])).toBe('batch');
    expect(
      inferProjectTypeFromFiles([
        { typeCategory: 'image' },
        { typeCategory: 'image' },
        { typeCategory: 'image' },
      ])
    ).toBe('batch');
  });

  it('sanitizes Stator settings and renders safe filename templates', () => {
    const clean = sanitizeStatorSettings({
      theme: 'light',
      density: 'compact',
      fontScale: 105,
      sidebarWidth: 999,
      maxImageWorkers: 20,
      cacheSmallMediaThresholdMb: 1,
      pinnedTools: ['converter', 'invalid-tool', 'gif-studio'],
      defaultCompressionGoal: 'smaller',
      defaultNormalizeAudio: true,
      defaultStripMetadata: false,
    });

    expect(clean.theme).toBe('light');
    expect(clean.density).toBe('compact');
    expect(clean.fontScale).toBe(105);
    expect(clean.sidebarWidth).toBe(300);
    expect(clean.maxImageWorkers).toBe(4);
    expect(clean.cacheSmallMediaThresholdMb).toBe(5);
    expect(clean.pinnedTools).toEqual(['converter', 'gif-studio']);
    expect(clean.defaultCompressionGoal).toBe('smaller');
    expect(clean.defaultNormalizeAudio).toBe(true);
    expect(clean.defaultStripMetadata).toBe(false);

    expect(applyFilenameTemplate('clip/../../raw:01.mov', 'MP4', '{name}_{res}_{format}', '1080p')).toBe(
      'clip_.._.._raw_01_1080p_mp4.mp4'
    );
    expect(applyFilenameTemplate('hero.png', 'WEBP', '{name}_web')).toBe('hero_web.webp');
  });

  it('compiles enabled smart pipeline steps into a single-pass preset and checks compatibility', () => {
    const socialVideo = BUILT_IN_PIPELINES.find((p) => p.id === 'pipe-video-social-vertical')!;
    expect(isPipelineCompatibleWithCategory(socialVideo, 'video')).toBe(true);
    expect(isPipelineCompatibleWithCategory(socialVideo, 'audio')).toBe(false);

    const compiled = compilePipelineToPreset(socialVideo, DEFAULT_PRESET_SETTINGS);
    expect(compiled.aspectCrop).toBe('9:16');
    expect(compiled.videoResolution).toBe('1080p');
    expect(compiled.fpsLimiter).toBe('60');
    expect(compiled.normalizeAudio).toBe(true);
    expect(compiled.videoBitrate).toBe('high');
    expect(compiled.stripMetadata).toBe(true);

    const partial = {
      ...socialVideo,
      steps: socialVideo.steps.map((s) => (s.id === 's3' ? { ...s, enabled: false } : s)),
    };
    const compiledPartial = compilePipelineToPreset(partial, DEFAULT_PRESET_SETTINGS);
    expect(compiledPartial.normalizeAudio).toBe(false);
  });

  it('parses SRT and VTT subtitles and serializes cues cleanly', () => {
    const sampleSrt = `1
00:00:01,250 --> 00:00:03,500
Hello Stator Studio

2
00:00:04,000 --> 00:00:06,200
Privacy-first conversion`;

    const cues = parseSubtitlesText(sampleSrt);
    expect(cues).toHaveLength(2);
    expect(cues[0].startSec).toBe(1.25);
    expect(cues[0].endSec).toBe(3.5);
    expect(cues[0].text).toBe('Hello Stator Studio');

    const vtt = serializeCuesToVtt(cues);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:01.250 --> 00:00:03.500');

    const roundtripSrt = serializeCuesToSrt(parseSubtitlesText(vtt));
    expect(roundtripSrt).toContain('00:00:01,250 --> 00:00:03,500');
    expect(roundtripSrt).toContain('Privacy-first conversion');
  });

  it('applies compression goals and flags unrealistic target-size budgets honestly', () => {
    const compact = applyCompressionGoalToPreset(DEFAULT_PRESET_SETTINGS, 'smaller', 'image');
    expect(compact.imageQuality).toBe(68);
    expect(compact.videoBitrate).toBe('compact');

    const infeasibleLongVideo = evaluateTargetSizeFeasibility('video', 1, 120, 50 * 1024 * 1024);
    expect(infeasibleLongVideo.feasible).toBe(false);
    expect(infeasibleLongVideo.warning).toBeTruthy();

    const feasibleShortVideo = evaluateTargetSizeFeasibility('video', 15, 20, 40 * 1024 * 1024);
    expect(feasibleShortVideo.feasible).toBe(true);
    expect(feasibleShortVideo.estimatedVideoKbps).toBeGreaterThan(1000);
  });
});
