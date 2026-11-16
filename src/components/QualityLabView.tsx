import React, { useEffect, useRef, useState } from 'react';
import {
  FlaskConical,
  Upload,
  Play,
  Loader2,
  Download,
  Check,
  Columns,
  SplitSquareHorizontal,
} from 'lucide-react';
import {
  DEFAULT_PRESET_SETTINGS,
  PresetSettings,
  QueueItem,
  formatFileSize,
} from '../types/queue.ts';
import { convertClientImage, computeImagePSNR } from '../utils/converter.ts';
import { probeImageEncoderSupport } from '../utils/formatCapabilities.ts';
import { ffmpegManager } from '../utils/ffmpegManager.ts';
import { BeforeAfterSlider } from './inspector/BeforeAfterSlider.tsx';

interface CandidateOutput {
  id: string;
  label: string;
  targetFormat: string;
  preset: PresetSettings;
  url: string;
  blob: Blob;
  sizeBytes: number;
  psnrDb?: number | null;
  elapsedSec: string;
  dimensions?: string;
}

export interface QualityLabViewProps {
  queue: QueueItem[];
  onApplyCandidatePreset: (format: string, preset: PresetSettings) => void;
  onToast: (msg: string) => void;
}

export const QualityLabView: React.FC<QualityLabViewProps> = ({
  queue,
  onApplyCandidatePreset,
  onToast,
}) => {
  const availableSources = queue.filter((q) => Boolean(q.file));
  const [selectedQueueId, setSelectedQueueId] = useState<string>(availableSources[0]?.id || '');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateOutput[]>([]);
  const [activeCandidateId, setActiveCandidateId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const [isRunning, setIsRunning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const candidatesRef = useRef<CandidateOutput[]>([]);
  candidatesRef.current = candidates;

  const activeSourceFile: File | null =
    localFile || availableSources.find((q) => q.id === selectedQueueId)?.file || null;

  useEffect(() => {
    if (!activeSourceFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(activeSourceFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [activeSourceFile]);

  useEffect(() => {
    return () => {
      candidatesRef.current.forEach((c) => URL.revokeObjectURL(c.url));
    };
  }, []);

  const clearCandidates = () => {
    candidates.forEach((c) => URL.revokeObjectURL(c.url));
    setCandidates([]);
    setActiveCandidateId('');
  };

  const runComparison = async () => {
    if (!activeSourceFile) {
      onToast('Select or upload a file to benchmark.');
      return;
    }
    clearCandidates();
    setIsRunning(true);

    try {
      const isImage = activeSourceFile.type.startsWith('image/');
      const isAudio = activeSourceFile.type.startsWith('audio/');

      if (isImage) {
        const avifOk = await probeImageEncoderSupport('image/avif');
        const specs: Array<{ label: string; format: string; preset: PresetSettings }> = [
          {
            label: 'WebP Balanced (82%)',
            format: 'WEBP',
            preset: { ...DEFAULT_PRESET_SETTINGS, imageQuality: 82 },
          },
          avifOk
            ? {
                label: 'AVIF High Efficiency (74%)',
                format: 'AVIF',
                preset: { ...DEFAULT_PRESET_SETTINGS, imageQuality: 74 },
              }
            : {
                label: 'WebP Compact (62%)',
                format: 'WEBP',
                preset: { ...DEFAULT_PRESET_SETTINGS, imageQuality: 62 },
              },
          {
            label: 'JPEG High (86%)',
            format: 'JPEG',
            preset: { ...DEFAULT_PRESET_SETTINGS, imageQuality: 86 },
          },
        ];

        const built: CandidateOutput[] = [];
        for (const spec of specs) {
          const t0 = performance.now();
          const res = await convertClientImage(activeSourceFile, spec.format, spec.preset);
          const psnr = await computeImagePSNR(activeSourceFile, res.blob);
          built.push({
            id: `cand-${built.length}-${Date.now()}`,
            label: spec.label,
            targetFormat: spec.format,
            preset: spec.preset,
            url: res.url,
            blob: res.blob,
            sizeBytes: res.sizeBytes,
            psnrDb: psnr,
            elapsedSec: `${((performance.now() - t0) / 1000).toFixed(2)}s`,
            dimensions: `${res.width} × ${res.height}`,
          });
        }
        setCandidates(built);
        setActiveCandidateId(built[0]?.id || '');
        onToast(`Encoded ${built.length} real candidates for visual & PSNR comparison`);
      } else if (isAudio) {
        const specs = [
          {
            label: 'MP3 192 kbps (-16 LUFS)',
            format: 'MP3',
            preset: { ...DEFAULT_PRESET_SETTINGS, audioBitrate: '192k' as const, normalizeAudio: true },
          },
          {
            label: 'MP3 128 kbps Compact',
            format: 'MP3',
            preset: { ...DEFAULT_PRESET_SETTINGS, audioBitrate: '128k' as const, normalizeAudio: false },
          },
        ];
        const built: CandidateOutput[] = [];
        for (const spec of specs) {
          const res = await ffmpegManager.transcodeMedia(activeSourceFile, spec.format, () => {}, spec.preset);
          built.push({
            id: `cand-${built.length}-${Date.now()}`,
            label: spec.label,
            targetFormat: spec.format,
            preset: spec.preset,
            url: res.url,
            blob: res.blob,
            sizeBytes: res.sizeBytes,
            elapsedSec: res.duration,
          });
        }
        setCandidates(built);
        setActiveCandidateId(built[0]?.id || '');
        onToast('Audio candidates ready for A/B listening');
      } else {
        const specs = [
          {
            label: 'MP4 High (CRF 18)',
            format: 'MP4',
            preset: { ...DEFAULT_PRESET_SETTINGS, videoBitrate: 'high' as const },
          },
          {
            label: 'MP4 Compact (CRF 28)',
            format: 'MP4',
            preset: { ...DEFAULT_PRESET_SETTINGS, videoBitrate: 'compact' as const },
          },
        ];
        const built: CandidateOutput[] = [];
        for (const spec of specs) {
          const res = await ffmpegManager.transcodeMedia(activeSourceFile, spec.format, () => {}, spec.preset);
          built.push({
            id: `cand-${built.length}-${Date.now()}`,
            label: spec.label,
            targetFormat: spec.format,
            preset: spec.preset,
            url: res.url,
            blob: res.blob,
            sizeBytes: res.sizeBytes,
            elapsedSec: res.duration,
          });
        }
        setCandidates(built);
        setActiveCandidateId(built[0]?.id || '');
        onToast('Video comparison encodes complete');
      }
    } catch (err: any) {
      onToast(err?.message || 'Quality Lab benchmark failed');
    } finally {
      setIsRunning(false);
    }
  };

  const activeCandidate = candidates.find((c) => c.id === activeCandidateId) || candidates[0] || null;
  const isImageSource = activeSourceFile?.type.startsWith('image/');

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setLocalFile(f);
            clearCandidates();
          }
          e.target.value = '';
        }}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[var(--stator-border)]">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-subtle)] mb-1 inline-flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>Encoder Comparison &amp; Visual Verification</span>
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--stator-fg)]">
            Quality Lab
          </h2>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1">
            Run real parallel encodes across codecs and bitrates, inspect pixel PSNR (dB) on images, and pick the best size-to-quality trade-off.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableSources.length > 0 && (
            <select
              value={localFile ? '__local__' : selectedQueueId}
              onChange={(e) => {
                setLocalFile(null);
                setSelectedQueueId(e.target.value);
                clearCandidates();
              }}
              aria-label="Choose source from active studio"
              className="h-9 px-3 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] max-w-[220px]"
            >
              {availableSources.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({q.sizeFormatted})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Choose File</span>
          </button>
          <button
            type="button"
            disabled={!activeSourceFile || isRunning}
            onClick={runComparison}
            className="h-9 px-4 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] disabled:opacity-45 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isRunning ? 'Encoding Candidates…' : 'Run Real Comparison'}</span>
          </button>
        </div>
      </div>

      {!activeSourceFile ? (
        <div className="rounded-xl border border-dashed border-[var(--stator-border-strong)] bg-[var(--stator-surface)] py-16 text-center space-y-3">
          <p className="text-sm font-semibold text-[var(--stator-fg)]">No media selected for comparison</p>
          <p className="text-xs text-[var(--stator-fg-muted)]">
            Choose an image, video, or audio file to generate real candidate outputs and inspect differences.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-4 rounded-lg bg-[var(--stator-accent)] text-white text-xs font-medium cursor-pointer"
          >
            Browse Media File
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Source Summary Strip */}
          <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-mono uppercase text-[var(--stator-fg-subtle)] mr-2">Reference:</span>
              <span className="font-semibold text-[var(--stator-fg)]">{activeSourceFile.name}</span>
              <span className="font-mono text-[var(--stator-fg-muted)] ml-2">
                {formatFileSize(activeSourceFile.size)}
              </span>
            </div>

            {isImageSource && candidates.length > 0 && (
              <div className="inline-flex rounded-lg border border-[var(--stator-border)] bg-[var(--stator-surface-2)] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-[var(--stator-surface)] text-[var(--stator-fg)] shadow-xs'
                      : 'text-[var(--stator-fg-muted)]'
                  }`}
                >
                  <SplitSquareHorizontal className="w-3.5 h-3.5" />
                  <span>Split Slider</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('side-by-side')}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                    viewMode === 'side-by-side'
                      ? 'bg-[var(--stator-surface)] text-[var(--stator-fg)] shadow-xs'
                      : 'text-[var(--stator-fg-muted)]'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Side-by-Side</span>
                </button>
              </div>
            )}
          </div>

          {/* Candidate Results Grid */}
          {candidates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {candidates.map((cand) => {
                const deltaPct = Math.round(
                  ((activeSourceFile.size - cand.sizeBytes) / activeSourceFile.size) * 100
                );
                const isSelected = cand.id === activeCandidate?.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => setActiveCandidateId(cand.id)}
                    className={`rounded-xl bg-[var(--stator-surface)] border p-4 space-y-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[var(--stator-accent)] ring-1 ring-[var(--stator-accent)]/30'
                        : 'border-[var(--stator-border)] hover:border-[var(--stator-border-strong)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[var(--stator-fg)]">{cand.label}</p>
                        <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)] mt-0.5">
                          {cand.dimensions ? `${cand.dimensions} · ` : ''}
                          {cand.elapsedSec}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--stator-surface-2)] text-[var(--stator-fg)]">
                        {cand.targetFormat}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between font-mono tabular-nums">
                      <span className="text-lg font-semibold text-[var(--stator-fg)]">
                        {formatFileSize(cand.sizeBytes)}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          deltaPct >= 0 ? 'text-[var(--stator-success)]' : 'text-[var(--stator-warning)]'
                        }`}
                      >
                        {deltaPct >= 0 ? `↓ -${deltaPct}%` : `↑ +${Math.abs(deltaPct)}%`}
                      </span>
                    </div>

                    {typeof cand.psnrDb === 'number' && (
                      <p className="text-[11px] font-mono text-[var(--stator-fg-muted)]">
                        Pixel Fidelity: <strong>{cand.psnrDb} dB PSNR</strong>
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--stator-border)]">
                      <a
                        href={cand.url}
                        download={`${activeSourceFile.name.replace(/\.[^/.]+$/, '')}.${cand.targetFormat.toLowerCase()}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 h-8 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyCandidatePreset(cand.targetFormat, cand.preset);
                        }}
                        className="flex-1 h-8 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Use Preset</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visual / Playback Stage */}
          {activeCandidate && localPreviewUrl && (
            <div className="rounded-xl bg-[#0D0E11] border border-[#292C33] p-4">
              {isImageSource ? (
                viewMode === 'split' ? (
                  <BeforeAfterSlider
                    originalUrl={localPreviewUrl}
                    convertedUrl={activeCandidate.url}
                    originalLabel={`Source · ${formatFileSize(activeSourceFile.size)}`}
                    convertedLabel={`${activeCandidate.label} · ${formatFileSize(activeCandidate.sizeBytes)}`}
                    heightClass="h-[320px] sm:h-[400px]"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[11px] font-mono text-[#A4AAB5]">
                        Reference ({formatFileSize(activeSourceFile.size)})
                      </p>
                      <div className="h-[320px] rounded-lg stator-checkerboard border border-[#292C33] flex items-center justify-center overflow-hidden">
                        <img src={localPreviewUrl} alt="Original" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-mono text-[#A4AAB5]">
                        {activeCandidate.label} ({formatFileSize(activeCandidate.sizeBytes)})
                      </p>
                      <div className="h-[320px] rounded-lg stator-checkerboard border border-[#292C33] flex items-center justify-center overflow-hidden">
                        <img src={activeCandidate.url} alt="Candidate" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                  </div>
                )
              ) : activeSourceFile.type.startsWith('audio/') ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                  <div className="p-3 rounded-lg bg-[#17191D] border border-[#292C33] space-y-2">
                    <p className="text-xs font-mono text-[#A4AAB5]">
                      Original ({formatFileSize(activeSourceFile.size)})
                    </p>
                    <audio src={localPreviewUrl} controls className="w-full" />
                  </div>
                  <div className="p-3 rounded-lg bg-[#17191D] border border-[#292C33] space-y-2">
                    <p className="text-xs font-mono text-[#A4AAB5]">
                      {activeCandidate.label} ({formatFileSize(activeCandidate.sizeBytes)})
                    </p>
                    <audio src={activeCandidate.url} controls className="w-full" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-[#A4AAB5]">
                      Original ({formatFileSize(activeSourceFile.size)})
                    </p>
                    <video src={localPreviewUrl} controls className="w-full max-h-[300px] rounded-lg bg-black" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-[#A4AAB5]">
                      {activeCandidate.label} ({formatFileSize(activeCandidate.sizeBytes)})
                    </p>
                    <video src={activeCandidate.url} controls className="w-full max-h-[300px] rounded-lg bg-black" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
