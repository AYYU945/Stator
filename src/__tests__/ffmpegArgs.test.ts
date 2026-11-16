import { describe, it, expect } from 'vitest';
import {
  buildFFmpegTranscodeArgs,
  computeTelemetryStats,
  parseFFmpegStreamMetadata,
} from '../utils/ffmpegArgs.ts';
import { DEFAULT_PRESET_SETTINGS } from '../types/queue.ts';

describe('ffmpegArgs', () => {
  it('enables fast stream-copy remuxing for compatible containers when no transforms exist', () => {
    const built = buildFFmpegTranscodeArgs({
      inputName: 'input.mkv',
      outputName: 'output.mp4',
      inputExt: 'mkv',
      targetFormat: 'MP4',
      preset: { ...DEFAULT_PRESET_SETTINGS, stripMetadata: true },
      threads: 4,
      durationSeconds: 30,
    });

    expect(built.remuxArgs).toEqual(['-i', 'input.mkv', '-c', 'copy', '-map_metadata', '-1', 'output.mp4']);
    expect(built.transcodeArgs).toContain('-threads');
    expect(built.transcodeArgs).toContain('4');
  });

  it('disables remuxing and preserves rotation, flip, aspect crop, trim, loudnorm, and metadata flags', () => {
    const built = buildFFmpegTranscodeArgs({
      inputName: 'clip.mkv',
      outputName: 'out.mp4',
      inputExt: 'mkv',
      targetFormat: 'MP4',
      preset: {
        ...DEFAULT_PRESET_SETTINGS,
        trimStart: 2.5,
        trimEnd: 12.5,
        rotation: 90,
        flipH: true,
        aspectCrop: '9:16',
        normalizeAudio: true,
        stripMetadata: true,
        targetMaxSizeMb: 5,
      },
      threads: 4,
      durationSeconds: 30,
    });

    expect(built.remuxArgs).toBeNull();
    expect(built.transcodeArgs).toContain('-ss');
    expect(built.transcodeArgs).toContain('2.5');
    expect(built.transcodeArgs).toContain('-to');
    expect(built.transcodeArgs).toContain('12.5');
    expect(built.transcodeArgs).toContain('-map_metadata');
    expect(built.transcodeArgs).toContain('-af');
    expect(built.transcodeArgs).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
    expect(built.targetBitrateKbps).toBeGreaterThan(150);

    const vfIdx = built.transcodeArgs.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const vf = built.transcodeArgs[vfIdx + 1];
    expect(vf).toContain('transpose=1');
    expect(vf).toContain('hflip');
    expect(vf).toContain("crop='trunc(min(iw,ih*9/16)/2)*2'");
  });

  it('builds boomerang palettegen filtergraph for GIF targets', () => {
    const built = buildFFmpegTranscodeArgs({
      inputName: 'demo.mp4',
      outputName: 'demo.gif',
      inputExt: 'mp4',
      targetFormat: 'GIF',
      preset: {
        ...DEFAULT_PRESET_SETTINGS,
        gifFps: '20',
        gifLoopMode: 'boomerang',
        gifDither: 'bayer',
      },
      threads: 2,
    });

    expect(built.remuxArgs).toBeNull();
    const vfIdx = built.transcodeArgs.indexOf('-vf');
    const filter = built.transcodeArgs[vfIdx + 1];
    expect(filter).toContain('fps=20');
    expect(filter).toContain('[rev0]reverse[rev]');
    expect(filter).toContain('paletteuse=dither=bayer:bayer_scale=3');
  });

  it('builds lossless/compressed audio extraction flags with loudnorm support', () => {
    const mp3 = buildFFmpegTranscodeArgs({
      inputName: 'video.mp4',
      outputName: 'audio.mp3',
      inputExt: 'mp4',
      targetFormat: 'MP3',
      preset: {
        ...DEFAULT_PRESET_SETTINGS,
        audioBitrate: '320k',
        audioChannels: 'mono',
        normalizeAudio: true,
      },
      threads: 4,
    });

    expect(mp3.isAudioOnly).toBe(true);
    expect(mp3.transcodeArgs).toContain('-vn');
    expect(mp3.transcodeArgs).toContain('libmp3lame');
    expect(mp3.transcodeArgs).toContain('320k');
    expect(mp3.transcodeArgs).toContain('-ac');
    expect(mp3.transcodeArgs).toContain('1');
    expect(mp3.transcodeArgs).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
  });

  it('computes real throughput speed & remaining ETA from progress and wall time', () => {
    expect(computeTelemetryStats(10 * 1024 * 1024, 0.01, 50)).toEqual({
      speed: 'Initializing...',
      eta: 'Calculating...',
    });

    const stats = computeTelemetryStats(20 * 1024 * 1024, 0.5, 2000);
    expect(stats.speed).toBe('5.0 MB/s');
    expect(stats.eta).toBe('2s remaining');
  });

  it('parses FFmpeg stderr stream headers into codec, resolution, fps, and sample rate', () => {
    const parsed = parseFFmpegStreamMetadata([
      'Input #0, mov,mp4,m4a,3gp,3g2,mj2, from input.mp4:',
      '  Duration: 00:00:12.40, start: 0.000000, bitrate: 4820 kb/s',
      '  Stream #0:0(und): Video: h264 (High), yuv420p, 1920x1080, 4680 kb/s, 60 fps, 60 tbr',
      '  Stream #0:1(und): Audio: aac (LC), 48000 Hz, stereo, fltp, 128 kb/s',
    ]);

    expect(parsed).toEqual({
      bitrate: '4820 kb/s',
      videoCodec: 'H264',
      resolution: '1920x1080',
      fps: '60 fps',
      audioCodec: 'AAC',
      sampleRate: '48 kHz',
    });
  });

  it('builds Stator 3.0 cropRect, eq tonal filters, playbackSpeed, silenceremove, and afade flags', () => {
    const built = buildFFmpegTranscodeArgs({
      inputName: 'podcast.mp4',
      outputName: 'podcast_edited.mp4',
      inputExt: 'mp4',
      targetFormat: 'MP4',
      threads: 4,
      durationSeconds: 40,
      preset: {
        ...DEFAULT_PRESET_SETTINGS,
        cropRect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
        playbackSpeed: 1.5,
        removeSilence: true,
        audioFadeInSec: 1.5,
        audioFadeOutSec: 2,
        adjustments: {
          exposure: 20,
          contrast: 10,
          saturation: 15,
          temperature: 0,
          sharpen: 0,
          blur: 0,
        },
      },
    });

    expect(built.remuxArgs).toBeNull();

    const vfIdx = built.transcodeArgs.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const vf = built.transcodeArgs[vfIdx + 1];
    expect(vf).toContain("crop='trunc(iw*0.8000/2)*2':'trunc(ih*0.8000/2)*2':'trunc(iw*0.1000/2)*2':'trunc(ih*0.1000/2)*2'");
    expect(vf).toContain('eq=brightness=0.10:contrast=1.10:saturation=1.15');
    expect(vf).toContain('setpts=PTS/1.50');

    const afIdx = built.transcodeArgs.indexOf('-af');
    expect(afIdx).toBeGreaterThan(-1);
    const af = built.transcodeArgs[afIdx + 1];
    expect(af).toContain('silenceremove=');
    expect(af).toContain('afade=t=in:st=0:d=1.50');
    expect(af).toContain('afade=t=out:st=38.00:d=2.00');
    expect(af).toContain('atempo=1.50');
  });
});

