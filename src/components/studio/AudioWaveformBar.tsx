import React, { useEffect, useRef, useState } from 'react';
import { Loader2, VolumeX, Scissors } from 'lucide-react';
import { analyzeAudioWaveform, WaveformAnalysisResult } from '../../utils/audioAnalyzer.ts';

export interface AudioWaveformBarProps {
  file?: File;
  durationSeconds?: number;
  currentTimeSec: number;
  trimStartSec: number;
  trimEndSec?: number;
  onSeek: (sec: number) => void;
  onChangeTrim: (startSec: number, endSec?: number) => void;
  onEnableSilenceRemoval?: () => void;
}

export const AudioWaveformBar: React.FC<AudioWaveformBarProps> = ({
  file,
  durationSeconds = 0,
  currentTimeSec,
  trimStartSec,
  trimEndSec,
  onSeek,
  onChangeTrim,
  onEnableSilenceRemoval,
}) => {
  const [analysis, setAnalysis] = useState<WaveformAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<1 | 2>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!file) {
      setAnalysis(null);
      return;
    }
    setLoading(true);
    analyzeAudioWaveform(file, 160)
      .then((res) => {
        if (!cancelled) setAnalysis(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const totalDur = analysis?.durationSeconds || durationSeconds || 1;
  const effectiveEnd = typeof trimEndSec === 'number' && trimEndSec > 0 ? Math.min(totalDur, trimEndSec) : totalDur;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 88;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const peaks = analysis?.peaks || Array.from({ length: 120 }, () => 0.14);
    const midY = height / 2;

    // Silent segments overlay
    if (analysis?.silentSegments) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
      for (const seg of analysis.silentSegments) {
        const sx = (seg.startSec / totalDur) * width;
        const sw = Math.max(2, ((seg.endSec - seg.startSec) / totalDur) * width);
        ctx.fillRect(sx, 0, sw, height);
      }
    }

    // Trimmed-out shaded regions
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    const trimStartX = (trimStartSec / totalDur) * width;
    const trimEndX = (effectiveEnd / totalDur) * width;
    if (trimStartX > 0) ctx.fillRect(0, 0, trimStartX, height);
    if (trimEndX < width) ctx.fillRect(trimEndX, 0, width - trimEndX, height);

    // Waveform bars
    const barStep = width / peaks.length;
    const barW = Math.max(1.5, barStep * 0.68);
    const playX = (currentTimeSec / totalDur) * width;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barStep;
      const amp = Math.max(0.06, peaks[i]);
      const barH = Math.max(4, amp * (height * 0.82));
      const inTrim = x >= trimStartX && x <= trimEndX;
      if (x <= playX && inTrim) {
        ctx.fillStyle = '#EEEDE9';
      } else if (inTrim) {
        ctx.fillStyle = '#8A8C91';
      } else {
        ctx.fillStyle = 'rgba(130, 138, 152, 0.35)';
      }
      ctx.fillRect(x, midY - barH / 2, barW, barH);
    }

    // Playhead line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, height);
    ctx.stroke();

    // In / Out markers
    ctx.fillStyle = '#10B981';
    ctx.fillRect(Math.max(0, trimStartX - 1), 0, 2.5, height);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(Math.min(width - 2.5, trimEndX - 1), 0, 2.5, height);
  }, [analysis, currentTimeSec, trimStartSec, effectiveEnd, totalDur]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Number((ratio * totalDur).toFixed(2)));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[var(--stator-fg-muted)]">
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--stator-fg)]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Decoding Web Audio waveform…
            </span>
          ) : analysis ? (
            <span>
              {analysis.sampleRate} Hz · {analysis.channels === 1 ? 'Mono' : 'Stereo'} ·{' '}
              {analysis.silentSegments.length} silent region
              {analysis.silentSegments.length === 1 ? '' : 's'} detected
            </span>
          ) : (
            <span>Audio waveform ready when source file is loaded</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {analysis && analysis.silentSegments.length > 0 && onEnableSilenceRemoval && (
            <button
              type="button"
              onClick={onEnableSilenceRemoval}
              className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] text-amber-500 inline-flex items-center gap-1 cursor-pointer"
            >
              <VolumeX className="w-3 h-3" />
              <span>Trim {analysis.silentSegments.length} Silent Gaps</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onChangeTrim(Number(currentTimeSec.toFixed(2)), trimEndSec)}
            className="px-2 py-1 rounded bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[11px] text-[var(--stator-fg)] inline-flex items-center gap-1 cursor-pointer"
          >
            <Scissors className="w-3 h-3 text-emerald-500" />
            <span>Set In ({trimStartSec.toFixed(1)}s)</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTrim(trimStartSec, Number(currentTimeSec.toFixed(2)))}
            className="px-2 py-1 rounded bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[11px] text-[var(--stator-fg)] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Set Out ({effectiveEnd.toFixed(1)}s)</span>
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
            className="px-2 py-1 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[11px] text-[var(--stator-fg-muted)] cursor-pointer"
          >
            {zoom}×
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-[#101112] border border-[#313338] p-2">
        <div style={{ width: zoom === 2 ? '180%' : '100%' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-[88px] block cursor-crosshair"
            aria-label="Audio waveform timeline"
          />
        </div>
      </div>
    </div>
  );
};
