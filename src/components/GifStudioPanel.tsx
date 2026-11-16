import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  Share2,
  Check,
  Palette,
  Sparkles,
  Play,
  Pause,
  Copy,
  Grid,
} from 'lucide-react';
import { ffmpegManager } from '../utils/ffmpegManager.ts';
import { generateSpriteSheet } from '../utils/converter.ts';
import { probeImageEncoderSupport } from '../utils/formatCapabilities.ts';
import { formatFileSize, PresetSettings, DEFAULT_PRESET_SETTINGS } from '../types/queue.ts';
import {
  BrandKit,
  getStoredBrandKit,
  saveBrandKit,
  encodePresetRecipeUrl,
} from '../lib/presets.ts';

interface SequenceFrame {
  id: string;
  file: File;
  previewUrl: string;
  durationMs: number;
}

export interface GifStudioPanelProps {
  onToast: (message: string) => void;
  onApplyCreatorRecipe: (settings: PresetSettings, label: string, targetFormat?: string) => void;
}

const CREATOR_RECIPES: Array<{
  id: string;
  title: string;
  summary: string;
  targetFormat: string;
  settings: Partial<PresetSettings>;
}> = [
  {
    id: 'shorts-9-16',
    title: 'YouTube Shorts / Reels (9:16)',
    summary: '1080p · 60fps · CRF 18 · Center 9:16 crop',
    targetFormat: 'MP4',
    settings: {
      videoResolution: '1080p',
      fpsLimiter: '60',
      videoBitrate: 'high',
      aspectCrop: '9:16',
      videoAudioBitrate: '192k',
    },
  },
  {
    id: 'discord-gif',
    title: 'Discord / Slack GIF (<10 MB)',
    summary: '720p · 15fps · Bayer dither · Infinite loop',
    targetFormat: 'GIF',
    settings: {
      videoResolution: '720p',
      gifFps: '15',
      gifDither: 'bayer',
      gifLoopMode: 'loop',
    },
  },
  {
    id: 'square-feed',
    title: 'Square Social Feed (1:1)',
    summary: '1080p · 30fps · Balanced CRF 23 · 1:1 crop',
    targetFormat: 'MP4',
    settings: {
      videoResolution: '1080p',
      fpsLimiter: '30',
      videoBitrate: 'balanced',
      aspectCrop: '1:1',
    },
  },
  {
    id: 'web-avif',
    title: 'Crisp Thumbnail Pack (AVIF)',
    summary: '90% Quality · Strip EXIF · Preserved Alpha',
    targetFormat: 'AVIF',
    settings: {
      imageQuality: 90,
      imageResize: 'original',
      stripMetadata: true,
      preserveTransparency: true,
    },
  },
];

export const GifStudioPanel: React.FC<GifStudioPanelProps> = ({
  onToast,
  onApplyCreatorRecipe,
}) => {
  const [frames, setFrames] = useState<SequenceFrame[]>([]);
  const [fps, setFps] = useState<number>(12);
  const [maxWidth, setMaxWidth] = useState<number>(720);
  const [dither, setDither] = useState<'sierra2_4a' | 'bayer' | 'none'>('sierra2_4a');
  const [loopMode, setLoopMode] = useState<'loop' | 'boomerang' | 'reverse'>('loop');
  const [outputFormat, setOutputFormat] = useState<'GIF' | 'WEBP'>('GIF');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isDragOverSeq, setIsDragOverSeq] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewFrameIdx, setPreviewFrameIdx] = useState(0);

  const [resultGif, setResultGif] = useState<{
    url: string;
    sizeBytes: number;
    outputName: string;
    dimensions: string;
  } | null>(null);

  const [brandKit, setBrandKit] = useState<BrandKit>(() => getStoredBrandKit());
  const [copiedRecipeId, setCopiedRecipeId] = useState<string | null>(null);
  const [avifSupported, setAvifSupported] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const framesRef = useRef<SequenceFrame[]>([]);
  const resultUrlRef = useRef<string | null>(null);

  framesRef.current = frames;
  resultUrlRef.current = resultGif?.url || null;

  useEffect(() => {
    probeImageEncoderSupport('image/avif').then(setAvifSupported);
    return () => {
      framesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  // Real pre-compile animated preview timer honoring per-frame durationMs and loopMode
  useEffect(() => {
    if (!isPlayingPreview || frames.length < 2) return;
    let sequence = frames.map((_, idx) => idx);
    if (loopMode === 'reverse') {
      sequence = [...sequence].reverse();
    } else if (loopMode === 'boomerang' && sequence.length > 2) {
      sequence = [...sequence, ...sequence.slice(1, -1).reverse()];
    }

    let step = 0;
    let timer: number | null = null;
    const tick = () => {
      const targetIdx = sequence[step % sequence.length];
      setPreviewFrameIdx(targetIdx);
      const holdMs = Math.max(40, frames[targetIdx]?.durationMs || Math.round(1000 / fps));
      step += 1;
      timer = window.setTimeout(tick, holdMs);
    };
    tick();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isPlayingPreview, frames, fps, loopMode]);

  const handleAddFrames = (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const valid = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(f.name)
    );
    if (valid.length === 0) {
      onToast('Please select PNG, JPEG, or WEBP images for the sequence.');
      return;
    }
    const defaultDuration = Math.round(1000 / fps);
    const added: SequenceFrame[] = valid.map((file) => ({
      id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      durationMs: defaultDuration,
    }));
    setFrames((prev) => [...prev, ...added]);
    setResultGif(null);
  };

  const handleLoadSampleSequence = async () => {
    const colors = [
      ['#0D0E11', '#4770E8'],
      ['#17191D', '#2563EB'],
      ['#064E3B', '#10B981'],
      ['#312E81', '#6366F1'],
    ];
    const generated: File[] = [];
    for (let i = 0; i < colors.length; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 640, 360);
        grad.addColorStop(0, colors[i][0]);
        grad.addColorStop(1, colors[i][1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 360);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(28, 28, 584, 304);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 28px monospace';
        ctx.fillText(`STATOR SEQUENCE FRAME 0${i + 1}`, 56, 175);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '400 15px sans-serif';
        ctx.fillText('2-Pass Palettegen + Paletteuse Sequencer', 56, 212);
      }
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
      );
      generated.push(new File([blob], `stator-seq-0${i + 1}.png`, { type: 'image/png' }));
    }

    const added: SequenceFrame[] = generated.map((file, idx) => ({
      id: `sample-frame-${Date.now()}-${idx}`,
      file,
      previewUrl: URL.createObjectURL(file),
      durationMs: Math.round(1000 / fps),
    }));
    setFrames((prev) => [...prev, ...added]);
    setResultGif(null);
    onToast('Loaded 4 synthetic frames into GIF Studio');
  };

  const moveFrame = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= frames.length) return;
    setFrames((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const duplicateFrame = (index: number) => {
    const src = frames[index];
    if (!src) return;
    const copy: SequenceFrame = {
      id: `frame-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file: src.file,
      previewUrl: URL.createObjectURL(src.file),
      durationMs: src.durationMs,
    };
    setFrames((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearFrames = () => {
    setIsPlayingPreview(false);
    frames.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFrames([]);
    setResultGif(null);
  };

  const handleBuildGif = async () => {
    if (frames.length < 2) {
      onToast('Add at least 2 images to compile an animation.');
      return;
    }
    try {
      setIsBuilding(true);
      setBuildProgress(5);
      const output = await ffmpegManager.createGifFromImages(
        frames.map((f) => ({ file: f.file, durationMs: f.durationMs })),
        { fps, maxWidth, dither, loopMode, outputFormat },
        (pct) => setBuildProgress(pct)
      );
      if (resultGif?.url) URL.revokeObjectURL(resultGif.url);
      setResultGif(output);
      onToast(`Compiled ${outputFormat} (${formatFileSize(output.sizeBytes)})`);
    } catch (err: any) {
      onToast(err?.message || `Failed to build animated ${outputFormat}`);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleExportSpriteSheet = async () => {
    if (frames.length < 2) return;
    try {
      const sheet = await generateSpriteSheet(
        frames.map((f) => f.file),
        Math.min(4, frames.length),
        256,
        8
      );
      const a = document.createElement('a');
      a.href = sheet.url;
      a.download = sheet.filename;
      a.click();
      URL.revokeObjectURL(sheet.url);
      onToast(`Exported ${sheet.width}×${sheet.height} sprite sheet PNG`);
    } catch (err: any) {
      onToast(err?.message || 'Sprite sheet export failed');
    }
  };

  const handleCopyRecipeLink = async (recipe: (typeof CREATOR_RECIPES)[number]) => {
    const url = encodePresetRecipeUrl({
      name: recipe.title,
      targetFormat: recipe.targetFormat,
      settings: recipe.settings,
    });
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRecipeId(recipe.id);
      onToast(`Copied shareable link for ${recipe.title}`);
      window.setTimeout(() => setCopiedRecipeId(null), 2000);
    } catch {
      onToast('Clipboard access denied.');
    }
  };

  const handleSaveBrandKit = (updated: BrandKit) => {
    setBrandKit(updated);
    saveBrandKit(updated);
  };

  const activePreviewFrame = frames[previewFrameIdx] || frames[0] || null;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[var(--stator-border)]">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-subtle)] mb-1.5">
            <Film className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>2-Pass Palettegen Sequencer &amp; Animated WebP</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)]">
            GIF &amp; Animation Studio
          </h2>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1 max-w-2xl">
            Sequence still frames with per-frame durations, preview live loop timing, and compile adaptive-palette GIFs, Animated WebP, or Sprite Sheets locally.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleAddFrames(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={handleLoadSampleSequence}
            className="h-9 px-3 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>Load 4 Sample Frames</span>
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-9 px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Image Frames</span>
          </button>
        </div>
      </div>

      {/* Main Darkroom Sequencer */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDragOverSeq) setIsDragOverSeq(true);
        }}
        onDragLeave={(e) => {
          const rel = e.relatedTarget as Node | null;
          if (rel && e.currentTarget.contains(rel)) return;
          setIsDragOverSeq(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverSeq(false);
          if (e.dataTransfer.files?.length) handleAddFrames(e.dataTransfer.files);
        }}
        className={`rounded-xl overflow-hidden border bg-[#0D0E11] text-[#F2F3F5] transition-colors ${
          isDragOverSeq ? 'border-[#4770E8] ring-2 ring-[#4770E8]/30' : 'border-[#292C33]'
        }`}
      >
        <div className="px-4 sm:px-5 py-3 border-b border-[#292C33] bg-[#17191D] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums text-[#A4AAB5]">
            <span className="text-[#F2F3F5] font-medium">
              {frames.length} {frames.length === 1 ? 'Frame' : 'Frames'}
            </span>
            <span>·</span>
            <span>{fps} FPS</span>
            <span>·</span>
            <span>{maxWidth}px Max</span>
            <span>·</span>
            <span className="uppercase">{loopMode}</span>
          </div>

          <div className="flex items-center gap-2">
            {frames.length >= 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setIsPlayingPreview((p) => !p)}
                  className="h-7 px-2.5 rounded bg-[#24272D] hover:bg-[#32363F] border border-[#32363F] text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlayingPreview ? 'Stop Preview' : 'Preview Loop'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSpriteSheet}
                  className="h-7 px-2.5 rounded bg-[#24272D] hover:bg-[#32363F] border border-[#32363F] text-xs text-[#D1D5DB] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Grid className="w-3 h-3" />
                  <span>Sprite Sheet</span>
                </button>
              </>
            )}

            {frames.length > 0 && (
              <button
                type="button"
                onClick={clearFrames}
                className="text-[11px] font-mono text-[#A4AAB5] hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {frames.length >= 2 && activePreviewFrame && (
            <div className="rounded-lg bg-[#17191D] border border-[#292C33] p-3 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-52 h-32 rounded stator-checkerboard border border-[#292C33] flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={activePreviewFrame.previewUrl}
                  alt={activePreviewFrame.file.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="text-xs space-y-1 flex-1">
                <p className="font-mono text-[#7295FF] uppercase text-[10px]">
                  {isPlayingPreview ? 'Live Sequence Playback' : 'Selected Stage Frame'}
                </p>
                <p className="font-semibold text-white">{activePreviewFrame.file.name}</p>
                <p className="font-mono text-[#A4AAB5]">
                  Hold duration: {activePreviewFrame.durationMs} ms · Mode: {loopMode}
                </p>
              </div>
            </div>
          )}

          {frames.length === 0 ? (
            <div
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className="border border-dashed border-[#292C33] hover:border-[#4770E8] rounded-xl py-14 px-4 text-center cursor-pointer transition-colors bg-[#17191D]/60"
            >
              <p className="text-base font-semibold text-[#F2F3F5]">
                {isDragOverSeq
                  ? 'Release frames onto timeline'
                  : 'Drop or select 2+ image frames to sequence'}
              </p>
              <p className="text-xs text-[#A4AAB5] mt-1.5 max-w-md mx-auto">
                PNG, JPEG, or WebP frames are compiled locally using FFmpeg 2-pass palettegen.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {frames.map((frame, index) => (
                <div
                  key={frame.id}
                  className={`rounded-lg border overflow-hidden bg-[#17191D] flex flex-col ${
                    isPlayingPreview && previewFrameIdx === index
                      ? 'border-[#4770E8] ring-1 ring-[#4770E8]'
                      : 'border-[#292C33]'
                  }`}
                >
                  <div
                    onClick={() => setPreviewFrameIdx(index)}
                    className="aspect-square stator-checkerboard flex items-center justify-center p-1.5 cursor-pointer"
                  >
                    <img
                      src={frame.previewUrl}
                      alt={frame.file.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="px-2 py-1.5 border-t border-[#292C33] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#A4AAB5]">
                      <span>#{index + 1}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveFrame(index, -1)}
                          className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                          aria-label="Move earlier"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === frames.length - 1}
                          onClick={() => moveFrame(index, 1)}
                          className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                          aria-label="Move later"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateFrame(index)}
                          className="p-0.5 hover:text-white cursor-pointer"
                          title="Duplicate frame"
                          aria-label="Duplicate frame"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFrame(frame.id)}
                          className="p-0.5 hover:text-rose-400 cursor-pointer"
                          aria-label="Remove frame"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[#A4AAB5]">
                      <span>ms:</span>
                      <input
                        type="number"
                        min={40}
                        max={2000}
                        step={20}
                        value={frame.durationMs}
                        onChange={(e) => {
                          const val = Math.max(40, Number(e.target.value) || 80);
                          setFrames((prev) =>
                            prev.map((f) => (f.id === frame.id ? { ...f, durationMs: val } : f))
                          );
                        }}
                        aria-label={`Frame ${index + 1} duration milliseconds`}
                        className="w-full px-1 py-0.5 rounded bg-[#0D0E11] border border-[#292C33] text-[10px] text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resultGif && (
            <div className="p-4 rounded-xl bg-[#17191D] border border-[#292C33] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-24 h-24 rounded-lg stator-checkerboard border border-[#292C33] flex items-center justify-center overflow-hidden shrink-0">
                  <img src={resultGif.url} alt="Compiled output" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-emerald-400">
                    Compiled Output Ready
                  </span>
                  <p className="text-sm font-medium text-[#F2F3F5] truncate mt-0.5">
                    {resultGif.outputName}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-[#A4AAB5] mt-0.5">
                    {resultGif.dimensions} · {formatFileSize(resultGif.sizeBytes)}
                  </p>
                </div>
              </div>

              <a
                href={resultGif.url}
                download={resultGif.outputName}
                className="h-9 px-4 rounded-lg bg-[#4770E8] hover:bg-[#3C63DB] text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {outputFormat}</span>
              </a>
            </div>
          )}
        </div>

        {/* Bottom HUD Control Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-[#292C33] bg-[#17191D] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#A4AAB5] mb-1">
                Frame Rate
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded-md bg-[#24272D] border border-[#32363F] text-xs font-mono text-white cursor-pointer"
              >
                {[5, 10, 12, 15, 20, 24, 30].map((v) => (
                  <option key={v} value={v}>
                    {v} FPS
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#A4AAB5] mb-1">
                Max Width
              </label>
              <select
                value={maxWidth}
                onChange={(e) => setMaxWidth(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded-md bg-[#24272D] border border-[#32363F] text-xs font-mono text-white cursor-pointer"
              >
                <option value={480}>480 px</option>
                <option value={720}>720 px HD</option>
                <option value={1080}>1080 px FHD</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#A4AAB5] mb-1">
                Dither
              </label>
              <select
                value={dither}
                onChange={(e) => setDither(e.target.value as any)}
                className="w-full h-8 px-2.5 rounded-md bg-[#24272D] border border-[#32363F] text-xs text-white cursor-pointer"
              >
                <option value="sierra2_4a">Smooth (Sierra2)</option>
                <option value="bayer">Crisp UI (Bayer)</option>
                <option value="none">Flat (Smallest)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#A4AAB5] mb-1">
                Playback
              </label>
              <select
                value={loopMode}
                onChange={(e) => setLoopMode(e.target.value as any)}
                className="w-full h-8 px-2.5 rounded-md bg-[#24272D] border border-[#32363F] text-xs text-white cursor-pointer"
              >
                <option value="loop">Loop Forward</option>
                <option value="boomerang">Boomerang</option>
                <option value="reverse">Reverse</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#A4AAB5] mb-1">
                Output
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as any)}
                className="w-full h-8 px-2.5 rounded-md bg-[#24272D] border border-[#32363F] text-xs font-mono text-white cursor-pointer"
              >
                <option value="GIF">Animated GIF</option>
                <option value="WEBP">Animated WebP</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={isBuilding || frames.length < 2}
            onClick={handleBuildGif}
            className="h-9 px-4 rounded-lg bg-[#4770E8] hover:bg-[#3C63DB] disabled:opacity-40 text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isBuilding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="font-mono tabular-nums">Compiling ({buildProgress}%)</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5" />
                <span>Compile {outputFormat}</span>
              </>
            )}
          </button>
        </div>
        {outputFormat === 'WEBP' && (
          <div className="px-4 sm:px-5 py-2 border-t border-[#292C33] bg-[#131519] text-[11px] text-[#A4AAB5]">
            Animated WebP encodes lossy loop frames directly in WebAssembly via <code className="font-mono text-[#D1D5DB]">libwebp</code>.
          </div>
        )}
      </section>

      {/* Creator Recipes & Brand Kit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[var(--stator-border)] flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-[0.07em] text-[var(--stator-fg-muted)]">
              Shareable Creator Preset Recipes
            </h3>
            <span className="text-[11px] font-mono text-[var(--stator-fg-subtle)]">URL-Encoded State</span>
          </div>

          <div className="divide-y divide-[var(--stator-border)]">
            {CREATOR_RECIPES.map((recipe) => (
              <div
                key={recipe.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-[13px] font-medium text-[var(--stator-fg)]">
                      {recipe.title}
                    </p>
                    <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">
                      · {recipe.targetFormat}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)] mt-0.5">
                    {recipe.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {recipe.targetFormat === 'AVIF' && !avifSupported ? (
                    <span className="text-[11px] font-mono text-[var(--stator-fg-subtle)] px-2.5 py-1 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)]">
                      AVIF unsupported in browser
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onApplyCreatorRecipe(
                          { ...DEFAULT_PRESET_SETTINGS, ...recipe.settings },
                          recipe.title,
                          recipe.targetFormat
                        )
                      }
                      className="h-8 px-3 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium cursor-pointer"
                    >
                      Apply to Studio
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyRecipeLink(recipe)}
                    className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[var(--stator-fg)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedRecipeId === recipe.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--stator-success)]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-[var(--stator-fg-muted)]" />
                        <span>Share URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[var(--stator-border)] flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-[var(--stator-accent-fg)] shrink-0" />
            <h3 className="text-xs font-mono uppercase tracking-[0.07em] text-[var(--stator-fg-muted)]">
              Local Brand Defaults
            </h3>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1.5">
                  Studio / Channel Identifier
                </label>
                <input
                  type="text"
                  value={brandKit.brandName}
                  onChange={(e) => handleSaveBrandKit({ ...brandKit, brandName: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1.5">
                    Default Framing
                  </label>
                  <select
                    value={brandKit.defaultAspect}
                    onChange={(e) =>
                      handleSaveBrandKit({ ...brandKit, defaultAspect: e.target.value as any })
                    }
                    className="w-full h-9 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-mono text-[var(--stator-fg)] cursor-pointer"
                  >
                    <option value="original">Original</option>
                    <option value="9:16">9:16 Vertical</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="4:5">4:5 Portrait</option>
                    <option value="16:9">16:9 Wide</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[var(--stator-fg-muted)] mb-1.5">
                    Reference Swatch
                  </label>
                  <input
                    type="color"
                    value={brandKit.accentColor}
                    onChange={(e) =>
                      handleSaveBrandKit({ ...brandKit, accentColor: e.target.value })
                    }
                    className="w-full h-9 p-1 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onApplyCreatorRecipe(
                  {
                    ...DEFAULT_PRESET_SETTINGS,
                    aspectCrop: brandKit.defaultAspect,
                    videoBitrate: 'high',
                    watermark: brandKit.brandName.trim()
                      ? {
                          enabled: true,
                          text: brandKit.brandName.trim(),
                          position: 'bottom-right',
                          opacity: 0.78,
                          color: brandKit.accentColor,
                        }
                      : undefined,
                  },
                  `${brandKit.brandName} Brand Defaults`
                );
              }}
              className="w-full h-9 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] cursor-pointer"
            >
              Apply Framing &amp; Watermark to Studio
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
