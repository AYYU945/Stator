export interface WaveformAnalysisResult {
  peaks: number[]; // Normalized 0..1 amplitude buckets
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  silentSegments: Array<{ startSec: number; endSec: number }>;
}

/**
 * Decodes an audio/video file locally via Web Audio API to extract real waveform peaks
 * and genuine dB-threshold silent segments.
 */
export async function analyzeAudioWaveform(
  file: File,
  bucketCount: number = 140,
  silenceThresholdDb: number = -42,
  minSilenceSec: number = 0.45
): Promise<WaveformAnalysisResult | null> {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  const ctx = new AudioCtx();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const durationSeconds = audioBuffer.duration;
    const safeBuckets = Math.max(24, Math.min(360, bucketCount));
    const samplesPerBucket = Math.max(1, Math.floor(totalSamples / safeBuckets));

    const peaks: number[] = [];
    for (let i = 0; i < safeBuckets; i++) {
      const start = i * samplesPerBucket;
      const end = Math.min(totalSamples, start + samplesPerBucket);
      let maxAmp = 0;
      const stride = Math.max(1, Math.floor((end - start) / 32));
      for (let s = start; s < end; s += stride) {
        const v = Math.abs(channelData[s]);
        if (v > maxAmp) maxAmp = v;
      }
      peaks.push(Math.min(1, maxAmp));
    }

    // Silence detection over 50ms windows
    const windowSize = Math.max(256, Math.floor(audioBuffer.sampleRate * 0.05));
    const ampThreshold = Math.pow(10, silenceThresholdDb / 20);
    const silentSegments: Array<{ startSec: number; endSec: number }> = [];
    let silenceStartSample: number | null = null;

    for (let offset = 0; offset < totalSamples; offset += windowSize) {
      const end = Math.min(totalSamples, offset + windowSize);
      let peak = 0;
      for (let i = offset; i < end; i += 4) {
        const abs = Math.abs(channelData[i]);
        if (abs > peak) peak = abs;
      }
      if (peak < ampThreshold) {
        if (silenceStartSample === null) silenceStartSample = offset;
      } else if (silenceStartSample !== null) {
        const dur = (offset - silenceStartSample) / audioBuffer.sampleRate;
        if (dur >= minSilenceSec) {
          silentSegments.push({
            startSec: Number((silenceStartSample / audioBuffer.sampleRate).toFixed(2)),
            endSec: Number((offset / audioBuffer.sampleRate).toFixed(2)),
          });
        }
        silenceStartSample = null;
      }
    }

    if (silenceStartSample !== null) {
      const dur = (totalSamples - silenceStartSample) / audioBuffer.sampleRate;
      if (dur >= minSilenceSec) {
        silentSegments.push({
          startSec: Number((silenceStartSample / audioBuffer.sampleRate).toFixed(2)),
          endSec: Number(durationSeconds.toFixed(2)),
        });
      }
    }

    return {
      peaks,
      durationSeconds,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      silentSegments,
    };
  } catch {
    return null;
  } finally {
    try {
      await ctx.close();
    } catch {}
  }
}
