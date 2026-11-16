import { PresetSettings, StreamMetadataSummary } from '../types/queue.ts';

export interface BuildFFmpegArgsInput {
  inputName: string;
  outputName: string;
  inputExt: string;
  targetFormat: string;
  preset?: PresetSettings;
  threads: number;
  durationSeconds?: number;
}

export interface BuiltFFmpegArgs {
  remuxArgs: string[] | null;
  transcodeArgs: string[];
  isAudioOnly: boolean;
  targetBitrateKbps?: number;
}

function getAspectCropFilter(
  aspectCrop?: PresetSettings['aspectCrop'],
  cropRect?: PresetSettings['cropRect']
): string {
  if (cropRect && cropRect.w > 0.02 && cropRect.h > 0.02 && (cropRect.w < 0.99 || cropRect.h < 0.99)) {
    const x = Math.max(0, Math.min(0.98, cropRect.x)).toFixed(4);
    const y = Math.max(0, Math.min(0.98, cropRect.y)).toFixed(4);
    const w = Math.max(0.02, Math.min(1, cropRect.w)).toFixed(4);
    const h = Math.max(0.02, Math.min(1, cropRect.h)).toFixed(4);
    return `crop='trunc(iw*${w}/2)*2':'trunc(ih*${h}/2)*2':'trunc(iw*${x}/2)*2':'trunc(ih*${y}/2)*2'`;
  }
  switch (aspectCrop) {
    case '9:16':
      return "crop='trunc(min(iw,ih*9/16)/2)*2':'trunc(min(ih,iw*16/9)/2)*2'";
    case '1:1':
      return "crop='trunc(min(iw,ih)/2)*2':'trunc(min(iw,ih)/2)*2'";
    case '4:5':
      return "crop='trunc(min(iw,ih*4/5)/2)*2':'trunc(min(ih,iw*5/4)/2)*2'";
    case '16:9':
      return "crop='trunc(min(iw,ih*16/9)/2)*2':'trunc(min(ih,iw*9/16)/2)*2'";
    default:
      return '';
  }
}

function getRotationFilters(rotation?: PresetSettings['rotation'], flipH?: boolean): string[] {
  const filters: string[] = [];
  if (rotation === 90) filters.push('transpose=1');
  else if (rotation === 180) filters.push('hflip', 'vflip');
  else if (rotation === 270) filters.push('transpose=2');
  if (flipH) filters.push('hflip');
  return filters;
}

function getScaleFilter(resolution?: PresetSettings['videoResolution']): string {
  switch (resolution) {
    case '4K':
      return 'scale=3840:2160:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
    case '2K':
      return 'scale=2560:1440:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
    case '1080p':
      return 'scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
    case '720p':
      return 'scale=1280:720:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
    case '480p':
      return 'scale=854:480:force_original_aspect_ratio=decrease:flags=lanczos,pad=ceil(iw/2)*2:ceil(ih/2)*2';
    default:
      return '';
  }
}

function getVideoEqFilter(preset?: PresetSettings): string {
  const adj = preset?.adjustments;
  if (!adj) return '';
  const hasBrightness = adj.exposure !== 0;
  const hasContrast = adj.contrast !== 0;
  const hasSat = adj.saturation !== 0;
  if (!hasBrightness && !hasContrast && !hasSat) return '';

  const brightness = Math.max(-0.5, Math.min(0.5, adj.exposure / 200)).toFixed(2);
  const contrast = Math.max(0.2, Math.min(2.0, 1 + adj.contrast / 100)).toFixed(2);
  const saturation = Math.max(0, Math.min(2.5, 1 + adj.saturation / 100)).toFixed(2);
  return `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`;
}

function buildAtempoChain(speed: number): string[] {
  if (!Number.isFinite(speed) || Math.abs(speed - 1) < 0.01) return [];
  const clamped = Math.max(0.25, Math.min(2.0, speed));
  if (clamped >= 0.5) {
    return [`atempo=${clamped.toFixed(2)}`];
  }
  return ['atempo=0.5', `atempo=${(clamped / 0.5).toFixed(2)}`];
}

function buildAudioFilterChain(preset?: PresetSettings, durationSeconds?: number): string[] {
  const filters: string[] = [];

  if (preset?.removeSilence) {
    filters.push('silenceremove=start_periods=1:start_silence=0.2:start_threshold=-42dB:stop_periods=-1:stop_duration=0.45:stop_threshold=-42dB');
  }
  if (preset?.noiseReduce) {
    filters.push('highpass=f=85,lowpass=f=14000');
  }
  if (preset?.eqPreset === 'voice') {
    filters.push('equalizer=f=2800:t=q:w=1.2:g=3.5');
  } else if (preset?.eqPreset === 'bass') {
    filters.push('equalizer=f=90:t=q:w=1.0:g=4.5');
  } else if (preset?.eqPreset === 'treble') {
    filters.push('equalizer=f=7500:t=q:w=1.0:g=4.0');
  }
  if (preset?.dynamicCompress) {
    filters.push('acompressor=threshold=-20dB:ratio=3:attack=10:release=120');
  }
  if (typeof preset?.volumePercent === 'number' && preset.volumePercent !== 100) {
    const vol = Math.max(0, Math.min(2, preset.volumePercent / 100)).toFixed(2);
    filters.push(`volume=${vol}`);
  }
  if (typeof preset?.audioFadeInSec === 'number' && preset.audioFadeInSec > 0) {
    filters.push(`afade=t=in:st=0:d=${preset.audioFadeInSec.toFixed(2)}`);
  }
  if (
    typeof preset?.audioFadeOutSec === 'number' &&
    preset.audioFadeOutSec > 0 &&
    typeof durationSeconds === 'number' &&
    durationSeconds > preset.audioFadeOutSec
  ) {
    const effectiveEnd =
      typeof preset.trimEnd === 'number' && preset.trimEnd > (preset.trimStart || 0)
        ? preset.trimEnd - (preset.trimStart || 0)
        : durationSeconds - (preset.trimStart || 0);
    const fadeStart = Math.max(0, effectiveEnd - preset.audioFadeOutSec);
    filters.push(`afade=t=out:st=${fadeStart.toFixed(2)}:d=${preset.audioFadeOutSec.toFixed(2)}`);
  }
  if (typeof preset?.playbackSpeed === 'number' && Math.abs(preset.playbackSpeed - 1) >= 0.01) {
    filters.push(...buildAtempoChain(preset.playbackSpeed));
  }
  if (preset?.normalizeAudio) {
    filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  }

  return filters;
}

function parseKbps(bitrateStr?: string): number {
  if (!bitrateStr || bitrateStr === 'original' || bitrateStr === 'mute') return 192;
  const num = parseInt(bitrateStr.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(num) && num > 0 ? num : 192;
}

/**
 * Pure FFmpeg CLI argument generator (unit-testable, zero global state).
 * Never silently drops requested trim, crop, rotation, speed, tone, audio processing, or metadata flags.
 */
export function buildFFmpegTranscodeArgs(input: BuildFFmpegArgsInput): BuiltFFmpegArgs {
  const { inputName, outputName, inputExt, targetFormat, preset, threads, durationSeconds } = input;
  const cleanTarget = targetFormat.toUpperCase().split(' ')[0].replace(/[^A-Z0-9]/g, '');
  const normInputExt = inputExt.toLowerCase();
  const normTargetExt = cleanTarget.toLowerCase();

  const trimArgs: string[] = [];
  if (typeof preset?.trimStart === 'number' && preset.trimStart > 0) {
    trimArgs.push('-ss', preset.trimStart.toString());
  }
  if (
    typeof preset?.trimEnd === 'number' &&
    preset.trimEnd > 0 &&
    preset.trimEnd > (preset.trimStart || 0)
  ) {
    trimArgs.push('-to', preset.trimEnd.toString());
  }

  const metadataArgs: string[] = preset?.stripMetadata ? ['-map_metadata', '-1'] : [];
  if (!preset?.stripMetadata) {
    if (preset?.audioMetaTitle?.trim()) metadataArgs.push('-metadata', `title=${preset.audioMetaTitle.trim()}`);
    if (preset?.audioMetaArtist?.trim()) metadataArgs.push('-metadata', `artist=${preset.audioMetaArtist.trim()}`);
    if (preset?.audioMetaAlbum?.trim()) metadataArgs.push('-metadata', `album=${preset.audioMetaAlbum.trim()}`);
  }

  const rotFilters = getRotationFilters(preset?.rotation, preset?.flipH);
  const aspectCropFilter = getAspectCropFilter(preset?.aspectCrop, preset?.cropRect);
  const videoScaleFilter = getScaleFilter(preset?.videoResolution);
  const eqFilter = getVideoEqFilter(preset);
  const speedFilter =
    typeof preset?.playbackSpeed === 'number' && Math.abs(preset.playbackSpeed - 1) >= 0.01
      ? `setpts=PTS/${Math.max(0.25, Math.min(2, preset.playbackSpeed)).toFixed(2)}`
      : '';

  const combinedVideoFilter = [
    ...rotFilters,
    aspectCropFilter,
    videoScaleFilter,
    eqFilter,
    speedFilter,
  ]
    .filter(Boolean)
    .join(',');

  const audioBitrate = preset?.audioBitrate || '192k';
  const channelArgs: string[] = [];
  if (preset?.audioChannels === 'mono') {
    channelArgs.push('-ac', '1');
  } else if (preset?.audioChannels === 'stereo') {
    channelArgs.push('-ac', '2');
  }

  const sampleRateArgs: string[] =
    preset?.audioSampleRate && preset.audioSampleRate !== 'original'
      ? ['-ar', preset.audioSampleRate]
      : [];

  const audioFilters = buildAudioFilterChain(preset, durationSeconds);
  const audioFilterArgs: string[] = audioFilters.length > 0 ? ['-af', audioFilters.join(',')] : [];

  const threadArgs = ['-threads', Math.max(1, Math.min(8, threads || 4)).toString()];

  const isAudioTarget = ['MP3', 'AAC', 'FLAC', 'OGG', 'WAV'].includes(cleanTarget);

  let targetBitrateKbps: number | undefined;
  if (
    !isAudioTarget &&
    cleanTarget !== 'GIF' &&
    typeof preset?.targetMaxSizeMb === 'number' &&
    preset.targetMaxSizeMb > 0 &&
    typeof durationSeconds === 'number' &&
    durationSeconds > 0
  ) {
    const trimmedDur =
      typeof preset.trimEnd === 'number' && preset.trimEnd > (preset.trimStart || 0)
        ? preset.trimEnd - (preset.trimStart || 0)
        : Math.max(1, durationSeconds - (preset.trimStart || 0));
    const speedFactor = preset.playbackSpeed && preset.playbackSpeed > 0 ? preset.playbackSpeed : 1;
    const effectiveDur = Math.max(0.5, trimmedDur / speedFactor);
    const audioKbps =
      preset.videoAudioBitrate === 'mute' ? 0 : parseKbps(preset.videoAudioBitrate || audioBitrate);
    const totalKbps = (preset.targetMaxSizeMb * 8192) / effectiveDur;
    targetBitrateKbps = Math.max(150, Math.round(totalKbps - audioKbps));
  }

  const hasVideoTransform = Boolean(
    trimArgs.length > 0 ||
      combinedVideoFilter ||
      targetBitrateKbps !== undefined ||
      (preset?.fpsLimiter && preset.fpsLimiter !== 'original') ||
      preset?.videoBitrate === 'balanced' ||
      preset?.videoBitrate === 'compact'
  );

  const hasAudioTransform = Boolean(
    audioFilters.length > 0 ||
      sampleRateArgs.length > 0 ||
      preset?.videoAudioBitrate === 'mute' ||
      (preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original') ||
      (preset?.audioChannels && preset.audioChannels !== 'stereo') ||
      (preset?.audioBitrate && preset.audioBitrate !== '192k')
  );

  const canRemux =
    !isAudioTarget &&
    cleanTarget !== 'GIF' &&
    !hasVideoTransform &&
    !hasAudioTransform &&
    (((normInputExt === 'mkv' || normInputExt === 'mov' || normInputExt === 'm4v') &&
      normTargetExt === 'mp4') ||
      (normInputExt === 'webm' && normTargetExt === 'mkv') ||
      ((normInputExt === 'mp4' || normInputExt === 'mov') && normTargetExt === 'mkv'));

  const remuxArgs = canRemux ? ['-i', inputName, '-c', 'copy', ...metadataArgs, outputName] : null;

  if (cleanTarget === 'GIF') {
    let scaleH = '480';
    if (preset?.videoResolution === '4K') scaleH = '2160';
    else if (preset?.videoResolution === '2K') scaleH = '1440';
    else if (preset?.videoResolution === '1080p') scaleH = '1080';
    else if (preset?.videoResolution === '720p') scaleH = '720';
    const fps =
      preset?.gifFps ||
      (preset?.fpsLimiter !== 'original' && preset?.fpsLimiter ? preset.fpsLimiter : '15');
    const dither = preset?.gifDither || 'sierra2_4a';
    const ditherOpt =
      dither === 'none'
        ? 'dither=none'
        : dither === 'bayer'
        ? 'dither=bayer:bayer_scale=3'
        : 'dither=sierra2_4a';
    const baseChain = [
      `fps=${fps}`,
      ...rotFilters,
      aspectCropFilter || null,
      eqFilter || null,
      `scale=-2:${scaleH}:flags=lanczos`,
    ]
      .filter(Boolean)
      .join(',');
    const gifFilter =
      preset?.gifLoopMode === 'boomerang'
        ? `${baseChain},split[fwd][rev0];[rev0]reverse[rev];[fwd][rev]concat=n=2:v=1:a=0,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=${ditherOpt}`
        : `${baseChain},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=${ditherOpt}`;

    return {
      remuxArgs: null,
      transcodeArgs: [...trimArgs, '-i', inputName, '-vf', gifFilter, '-loop', '0', ...metadataArgs, outputName],
      isAudioOnly: false,
    };
  }

  if (isAudioTarget) {
    if (cleanTarget === 'MP3') {
      const bitrateArgs = audioBitrate ? ['-b:a', audioBitrate] : ['-q:a', '2'];
      return {
        remuxArgs: null,
        transcodeArgs: [
          ...trimArgs,
          '-i',
          inputName,
          '-vn',
          ...audioFilterArgs,
          '-c:a',
          'libmp3lame',
          ...bitrateArgs,
          ...channelArgs,
          ...sampleRateArgs,
          ...metadataArgs,
          outputName,
        ],
        isAudioOnly: true,
      };
    }
    if (cleanTarget === 'AAC') {
      if (
        (normInputExt === 'm4a' || normInputExt === 'aac') &&
        trimArgs.length === 0 &&
        audioFilters.length === 0 &&
        sampleRateArgs.length === 0 &&
        channelArgs.length === 0
      ) {
        return {
          remuxArgs: null,
          transcodeArgs: ['-i', inputName, '-vn', '-c:a', 'copy', ...metadataArgs, outputName],
          isAudioOnly: true,
        };
      }
      return {
        remuxArgs: null,
        transcodeArgs: [
          ...trimArgs,
          '-i',
          inputName,
          '-vn',
          ...audioFilterArgs,
          '-c:a',
          'aac',
          '-b:a',
          audioBitrate,
          ...channelArgs,
          ...sampleRateArgs,
          ...metadataArgs,
          outputName,
        ],
        isAudioOnly: true,
      };
    }
    if (cleanTarget === 'FLAC') {
      return {
        remuxArgs: null,
        transcodeArgs: [
          ...trimArgs,
          '-i',
          inputName,
          '-vn',
          ...audioFilterArgs,
          '-c:a',
          'flac',
          ...channelArgs,
          ...sampleRateArgs,
          ...metadataArgs,
          outputName,
        ],
        isAudioOnly: true,
      };
    }
    if (cleanTarget === 'OGG') {
      return {
        remuxArgs: null,
        transcodeArgs: [
          ...trimArgs,
          '-i',
          inputName,
          '-vn',
          ...audioFilterArgs,
          '-c:a',
          'libvorbis',
          '-b:a',
          audioBitrate,
          ...channelArgs,
          ...sampleRateArgs,
          ...metadataArgs,
          outputName,
        ],
        isAudioOnly: true,
      };
    }
    return {
      remuxArgs: null,
      transcodeArgs: [
        ...trimArgs,
        '-i',
        inputName,
        '-vn',
        ...audioFilterArgs,
        '-c:a',
        'pcm_s16le',
        ...channelArgs,
        ...sampleRateArgs,
        ...metadataArgs,
        outputName,
      ],
      isAudioOnly: true,
    };
  }

  // Video outputs (MP4, MOV, MKV, WEBM, AVI)
  const crf =
    preset?.videoBitrate === 'lossless'
      ? '0'
      : preset?.videoBitrate === 'balanced'
      ? '23'
      : preset?.videoBitrate === 'compact'
      ? '28'
      : '18';

  const args: string[] = [...trimArgs, '-i', inputName, ...threadArgs];
  if (combinedVideoFilter) {
    args.push('-vf', combinedVideoFilter);
  }
  if (preset?.fpsLimiter && preset.fpsLimiter !== 'original') {
    args.push('-r', preset.fpsLimiter);
  }

  if (cleanTarget === 'WEBM') {
    if (targetBitrateKbps) {
      args.push(
        '-c:v',
        'libvpx-vp9',
        '-b:v',
        `${targetBitrateKbps}k`,
        '-maxrate',
        `${Math.round(targetBitrateKbps * 1.25)}k`,
        '-bufsize',
        `${targetBitrateKbps * 2}k`
      );
    } else {
      args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
    }
    if (preset?.videoAudioBitrate === 'mute') {
      args.push('-an');
    } else {
      if (audioFilterArgs.length) args.push(...audioFilterArgs);
      args.push(
        '-c:a',
        'libopus',
        '-b:a',
        preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original'
          ? preset.videoAudioBitrate
          : '128k'
      );
    }
  } else if (cleanTarget === 'AVI') {
    args.push('-c:v', 'mpeg4', '-vtag', 'xvid');
    if (targetBitrateKbps) {
      args.push('-b:v', `${targetBitrateKbps}k`);
    }
    if (preset?.videoAudioBitrate === 'mute') {
      args.push('-an');
    } else {
      if (audioFilterArgs.length) args.push(...audioFilterArgs);
      const ab =
        preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original'
          ? preset.videoAudioBitrate
          : '192k';
      args.push('-c:a', 'libmp3lame', '-b:a', ab);
    }
  } else {
    args.push('-c:v', 'libx264', '-preset', 'fast');
    if (targetBitrateKbps) {
      args.push(
        '-b:v',
        `${targetBitrateKbps}k`,
        '-maxrate',
        `${Math.round(targetBitrateKbps * 1.2)}k`,
        '-bufsize',
        `${targetBitrateKbps * 2}k`
      );
    } else {
      args.push('-crf', crf);
    }
    if (cleanTarget === 'MP4') {
      args.push('-tune', 'fastdecode');
    }
    args.push('-pix_fmt', 'yuv420p');

    if (preset?.videoAudioBitrate === 'mute') {
      args.push('-an');
    } else if (audioFilterArgs.length > 0 || sampleRateArgs.length > 0) {
      args.push(
        ...audioFilterArgs,
        '-c:a',
        'aac',
        '-b:a',
        preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original'
          ? preset.videoAudioBitrate
          : audioBitrate,
        ...sampleRateArgs
      );
    } else if (preset?.videoAudioBitrate && preset.videoAudioBitrate !== 'original') {
      args.push('-c:a', 'aac', '-b:a', preset.videoAudioBitrate);
    } else if (
      cleanTarget === 'MP4' &&
      (normInputExt === 'mp4' || normInputExt === 'm4v' || normInputExt === 'mov' || normInputExt === 'mkv')
    ) {
      args.push('-c:a', 'copy');
    } else {
      args.push('-c:a', 'aac', '-b:a', audioBitrate);
    }
  }

  args.push(...metadataArgs, outputName);

  return {
    remuxArgs,
    transcodeArgs: args,
    isAudioOnly: false,
    targetBitrateKbps,
  };
}

export function computeTelemetryStats(
  fileBytes: number,
  progressFraction: number,
  elapsedMs: number
): { speed: string; eta: string } {
  if (progressFraction <= 0.02 || elapsedMs <= 200 || fileBytes <= 0) {
    return { speed: 'Initializing...', eta: 'Calculating...' };
  }
  const processedBytes = fileBytes * Math.min(1, progressFraction);
  const elapsedSec = elapsedMs / 1000;
  const bytesPerSec = processedBytes / elapsedSec;
  const speedStr =
    bytesPerSec >= 1024 * 1024
      ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
      : `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`;

  const remainingFraction = Math.max(0, 1 - progressFraction);
  const etaSeconds = Math.max(0, Math.round((elapsedSec / progressFraction) * remainingFraction));
  const etaStr =
    etaSeconds >= 60
      ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s remaining`
      : `${etaSeconds}s remaining`;

  return { speed: speedStr, eta: etaStr };
}

export function parseFFmpegStreamMetadata(logLines: string[]): StreamMetadataSummary {
  const joined = logLines.join('\n');
  const summary: StreamMetadataSummary = {};

  const videoMatch = joined.match(/Stream #\d+:\d+.*?: Video:\s*([a-zA-Z0-9_]+)/i);
  if (videoMatch) {
    summary.videoCodec = videoMatch[1].toUpperCase();
  }
  const resMatch = joined.match(/Video:.*?,\s*(\d{2,5}x\d{2,5})/i);
  if (resMatch) {
    summary.resolution = resMatch[1];
  }
  const fpsMatch = joined.match(/Video:.*?(\d+(?:\.\d+)?)\s*fps/i);
  if (fpsMatch) {
    summary.fps = `${fpsMatch[1]} fps`;
  }

  const audioMatch = joined.match(/Stream #\d+:\d+.*?: Audio:\s*([a-zA-Z0-9_]+)/i);
  if (audioMatch) {
    summary.audioCodec = audioMatch[1].toUpperCase();
  }
  const srMatch = joined.match(/Audio:.*?(\d+)\s*Hz/i);
  if (srMatch) {
    summary.sampleRate = `${(parseInt(srMatch[1], 10) / 1000).toFixed(1).replace(/\.0$/, '')} kHz`;
  }
  const bitrateMatch = joined.match(/bitrate:\s*(\d+\s*kb\/s)/i);
  if (bitrateMatch) {
    summary.bitrate = bitrateMatch[1];
  }

  return summary;
}
