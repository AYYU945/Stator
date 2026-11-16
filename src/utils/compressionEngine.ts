import { CompressionGoal, FileTypeCategory, PresetSettings } from '../types/queue.ts';

export interface CompressionFeasibility {
  feasible: boolean;
  estimatedVideoKbps?: number;
  warning?: string;
}

export function applyCompressionGoalToPreset(
  current: PresetSettings,
  goal: CompressionGoal,
  typeCategory: FileTypeCategory,
  targetMaxSizeMb?: number
): PresetSettings {
  if (goal === 'smaller') {
    return {
      ...current,
      compressionGoal: goal,
      targetMaxSizeMb: undefined,
      imageQuality: 68,
      videoBitrate: 'compact',
      audioBitrate: '128k',
      videoAudioBitrate: current.videoAudioBitrate === 'mute' ? 'mute' : '128k',
    };
  }
  if (goal === 'balanced') {
    return {
      ...current,
      compressionGoal: goal,
      targetMaxSizeMb: undefined,
      imageQuality: 84,
      videoBitrate: 'balanced',
      audioBitrate: '192k',
      videoAudioBitrate: current.videoAudioBitrate === 'mute' ? 'mute' : '192k',
    };
  }
  if (goal === 'highest') {
    return {
      ...current,
      compressionGoal: goal,
      targetMaxSizeMb: undefined,
      imageQuality: 95,
      videoBitrate: typeCategory === 'video' ? 'high' : current.videoBitrate,
      audioBitrate: '320k',
      videoAudioBitrate: current.videoAudioBitrate === 'mute' ? 'mute' : '320k',
    };
  }
  if (goal === 'target-size') {
    return {
      ...current,
      compressionGoal: 'target-size',
      targetMaxSizeMb: targetMaxSizeMb && targetMaxSizeMb > 0 ? targetMaxSizeMb : current.targetMaxSizeMb || 10,
    };
  }
  return {
    ...current,
    compressionGoal: 'custom',
  };
}

/**
 * Evaluates whether a target maximum file size (MB) is realistically achievable
 * before launching a heavy FFmpeg transcode. Never guarantees exact byte output.
 */
export function evaluateTargetSizeFeasibility(
  typeCategory: FileTypeCategory,
  targetMaxSizeMb?: number,
  durationSeconds?: number,
  sourceSizeBytes?: number
): CompressionFeasibility {
  if (!targetMaxSizeMb || targetMaxSizeMb <= 0) {
    return { feasible: true };
  }

  const targetBytes = targetMaxSizeMb * 1024 * 1024;
  if (sourceSizeBytes && targetBytes < sourceSizeBytes * 0.03) {
    return {
      feasible: false,
      warning: `Target ${targetMaxSizeMb} MB is under 3% of the source size and may produce heavy compression artifacts or miss the budget.`,
    };
  }

  if (typeCategory === 'video' && durationSeconds && durationSeconds > 0) {
    const totalKbps = (targetMaxSizeMb * 8192) / durationSeconds;
    const estVideoKbps = Math.round(totalKbps - 128);
    if (estVideoKbps < 140) {
      return {
        feasible: false,
        estimatedVideoKbps: Math.max(0, estVideoKbps),
        warning: `For a ${Math.round(durationSeconds)}s video, ${targetMaxSizeMb} MB requires ~${Math.max(
          0,
          estVideoKbps
        )} kbps video bitrate, which is below practical H.264/VP9 floor. Consider trimming or lowering resolution to 480p/720p.`,
      };
    }
    return {
      feasible: true,
      estimatedVideoKbps: estVideoKbps,
    };
  }

  return { feasible: true };
}
