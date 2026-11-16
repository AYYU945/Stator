import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
} from 'lucide-react';
import { ffmpegManager } from '../utils/ffmpegManager.ts';
import { formatFileSize, PresetSettings, DEFAULT_PRESET_SETTINGS } from '../types/queue.ts';
import {
  BrandKit,
  getStoredBrandKit,
  saveBrandKit,
  encodePresetRecipeUrl,
} from '../lib/presets.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../lib/motion.ts';

interface SequenceFrame {
  id: string;
  file: File;
  previewUrl: string;
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
  const [loopMode, setLoopMode] = useState<'loop' | 'boomerang'>('loop');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isDragOverSeq, setIsDragOverSeq] = useState(false);
  const [resultGif, setResultGif] = useState<{
    url: string;
    sizeBytes: number;
    outputName: string;
    dimensions: string;
  } | null>(null);

  const [brandKit, setBrandKit] = useState<BrandKit>(() => getStoredBrandKit());
  const [copiedRecipeId, setCopiedRecipeId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const framesRef = useRef<SequenceFrame[]>([]);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    resultUrlRef.current = resultGif?.url || null;
  }, [resultGif]);

  useEffect(() => {
    return () => {
      framesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const handleAddFrames = (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const valid = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(f.name)
    );
    if (valid.length === 0) {
      onToast('Please select PNG, JPEG, or WEBP images for the GIF sequence.');
      return;
    }
    const added: SequenceFrame[] = valid.map((file) => ({
      id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFrames((prev) => [...prev, ...added]);
    setResultGif(null);
  };

  const handleLoadSampleSequence = async () => {
    const colors = [
      ['#0F172A', '#1D4ED8'],
      ['#1E1B4B', '#3B82F6'],
      ['#064E3B', '#10B981'],
      ['#3B0764', '#8B5CF6'],
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
        ctx.fillText('2-Pass Palettegen + Paletteuse Dither Test', 56, 212);
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

  const removeFrame = (id: string) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearFrames = () => {
    frames.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFrames([]);
    setResultGif(null);
  };

  const handleBuildGif = async () => {
    if (frames.length < 2) {
      onToast('Add at least 2 images to compile an animated GIF.');
      return;
    }
    try {
      setIsBuilding(true);
      setBuildProgress(5);
      const output = await ffmpegManager.createGifFromImages(
        frames.map((f) => f.file),
        { fps, maxWidth, dither, loopMode },
        (pct) => setBuildProgress(pct)
      );
      if (resultGif?.url) URL.revokeObjectURL(resultGif.url);
      setResultGif(output);
      onToast(`Animated GIF built (${formatFileSize(output.sizeBytes)})`);
    } catch (err: any) {
      console.error('GIF Sequence build error:', err);
      onToast(err?.message || 'Failed to build animated GIF');
    } finally {
      setIsBuilding(false);
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
      onToast('Clipboard access denied — copy preset URL from address bar.');
    }
  };

  const handleSaveBrandKit = (updated: BrandKit) => {
    setBrandKit(updated);
    saveBrandKit(updated);
  };

  return (
    <div className="w-full py-6 sm:py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--stator-border)]">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-muted)] mb-2">
            <Film className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>2-Pass Palettegen Sequencer &amp; Preset Recipes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)]">
            GIF{' '}
            <span className="font-serif italic font-normal text-[var(--stator-accent-fg)]">
              Sequence Studio
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1 max-w-2xl">
            Assemble PNG, JPEG, or WebP still frames into an adaptive 256-color animated GIF, or
            apply shareable creator preset pipelines to your conversion ledger.
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
            className="h-9 px-3 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>Load 4 Sample Frames</span>
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-9 px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Image Frames</span>
          </button>
        </div>
      </div>

      {/* Main Darkroom Sequencer Vessel */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDragOverSeq) setIsDragOverSeq(true);
        }}
        onDragLeave={(e) => {
          const related = e.relatedTarget as Node | null;
          if (related && e.currentTarget.contains(related)) return;
          setIsDragOverSeq(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverSeq(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleAddFrames(e.dataTransfer.files);
          }
        }}
        className={`rounded-xl overflow-hidden border bg-[#0B0C0E] text-[#F3F4F6] shadow-xl transition-colors ${
          isDragOverSeq ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/30' : 'border-[#1E212A]'
        }`}
      >
        {/* Top Sequencer Status Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-[#1E212A] bg-[#111318] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums text-[#9BA1AE]">
            <span className="text-[#F3F4F6] font-medium">
              {frames.length} {frames.length === 1 ? 'Frame' : 'Frames'} Staged
            </span>
            <span>·</span>
            <span>{(frames.length / fps).toFixed(1)}s Loop</span>
            <span>·</span>
            <span>{fps} FPS</span>
            <span>·</span>
            <span>{maxWidth}px Max</span>
          </div>

          {frames.length > 0 && (
            <button
              type="button"
              onClick={clearFrames}
              className="text-[11px] font-mono text-[#9BA1AE] hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Frames</span>
            </button>
          )}
        </div>

        {/* Darkroom Frame Strip / Compiled Result */}
        <div className="p-5 sm:p-6 space-y-5">
          {frames.length === 0 ? (
            <motion.div
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              whileTap={{ scale: 0.995 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className="relative border border-dashed border-[#272B36] hover:border-[#3B82F6] rounded-xl py-14 px-4 text-center cursor-pointer transition-colors bg-[#111318]/50"
            >
              <p className="font-serif text-lg font-medium text-[#F3F4F6]">
                {isDragOverSeq
                  ? 'Release frames onto timeline'
                  : 'Drop or select 2+ image frames to sequence'}
              </p>
              <p className="text-xs text-[#9BA1AE] mt-1.5 max-w-md mx-auto">
                PNG, JPEG, or WebP frames are compiled locally using FFmpeg 2-pass palettegen for
                crisp, zero-banding animated GIFs.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <AnimatePresence initial={false}>
                {frames.map((frame, index) => (
                  <motion.div
                    key={frame.id}
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={STATOR_SPRING.tactile}
                    className="rounded-lg border border-[#222630] overflow-hidden bg-[#12141A] flex flex-col"
                  >
                    <div className="aspect-square stator-checkerboard flex items-center justify-center p-1.5">
                      <img
                        src={frame.previewUrl}
                        alt={frame.file.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="px-2.5 py-1.5 border-t border-[#222630] flex items-center justify-between text-[11px] font-mono tabular-nums text-[#9BA1AE]">
                      <span>#{index + 1}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveFrame(index, -1)}
                          className="p-1 rounded hover:bg-[#1E222D] hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move earlier"
                          aria-label="Move frame earlier"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === frames.length - 1}
                          onClick={() => moveFrame(index, 1)}
                          className="p-1 rounded hover:bg-[#1E222D] hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move later"
                          aria-label="Move frame later"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFrame(frame.id)}
                          className="p-1 rounded hover:text-rose-400 cursor-pointer"
                          title="Remove frame"
                          aria-label="Remove frame"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Compiled Result Preview */}
          <AnimatePresence>
            {resultGif && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={STATOR_TRANSITION.view}
                className="p-4 rounded-xl bg-[#12141A] border border-[#272B36] flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-24 h-24 rounded-lg stator-checkerboard border border-[#272B36] flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={resultGif.url}
                      alt="Compiled animated GIF"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-emerald-400">
                      Compiled Output Ready
                    </span>
                    <p className="text-sm font-medium text-[#F3F4F6] truncate mt-0.5">
                      {resultGif.outputName}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#9BA1AE] mt-0.5">
                      {resultGif.dimensions} · {formatFileSize(resultGif.sizeBytes)}
                    </p>
                  </div>
                </div>

                <a
                  href={resultGif.url}
                  download={resultGif.outputName}
                  className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors active:scale-[0.98]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download GIF</span>
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom HUD Control Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-[#1E212A] bg-[#111318] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#8E95A5] mb-1">
                Frame Rate
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded-md bg-[#161922] border border-[#262A36] text-xs font-mono tabular-nums text-[#F3F4F6] cursor-pointer"
              >
                {[5, 10, 12, 15, 20, 24, 30].map((v) => (
                  <option key={v} value={v}>
                    {v} FPS
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#8E95A5] mb-1">
                Max Width
              </label>
              <select
                value={maxWidth}
                onChange={(e) => setMaxWidth(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded-md bg-[#161922] border border-[#262A36] text-xs font-mono tabular-nums text-[#F3F4F6] cursor-pointer"
              >
                <option value={480}>480 px (Compact)</option>
                <option value={720}>720 px (Social HD)</option>
                <option value={1080}>1080 px (Full HD)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#8E95A5] mb-1">
                Palette Dither
              </label>
              <select
                value={dither}
                onChange={(e) => setDither(e.target.value as any)}
                className="w-full h-8 px-2.5 rounded-md bg-[#161922] border border-[#262A36] text-xs text-[#F3F4F6] cursor-pointer"
              >
                <option value="sierra2_4a">Smooth (Sierra2)</option>
                <option value="bayer">Crisp UI (Bayer)</option>
                <option value="none">Flat (Smallest)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.06em] text-[#8E95A5] mb-1">
                Loop Mode
              </label>
              <select
                value={loopMode}
                onChange={(e) => setLoopMode(e.target.value as any)}
                className="w-full h-8 px-2.5 rounded-md bg-[#161922] border border-[#262A36] text-xs text-[#F3F4F6] cursor-pointer"
              >
                <option value="loop">Infinite Loop</option>
                <option value="boomerang">Boomerang</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={isBuilding || frames.length < 2}
            onClick={handleBuildGif}
            className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
          >
            {isBuilding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="font-mono tabular-nums">Compiling ({buildProgress}%)</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5" />
                <span>Compile Animated GIF</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Hairline Ledger: Creator Preset Recipes & Brand Kit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[var(--stator-border)] flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-[0.07em] text-[var(--stator-fg-muted)]">
              Shareable Creator Preset Pipelines
            </h2>
            <span className="text-[11px] font-mono text-[var(--stator-fg-subtle)]">
              URL-Encoded State
            </span>
          </div>

          <div className="divide-y divide-[var(--stator-border)]">
            {CREATOR_RECIPES.map((recipe) => (
              <div
                key={recipe.id}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--stator-surface-2)]/35 transition-colors"
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
                  <p className="text-[11px] font-mono tabular-nums text-[var(--stator-fg-subtle)] mt-0.5">
                    {recipe.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onApplyCreatorRecipe(
                        { ...DEFAULT_PRESET_SETTINGS, ...recipe.settings },
                        recipe.title,
                        recipe.targetFormat
                      )
                    }
                    className="h-8 px-3 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
                  >
                    Apply to Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyRecipeLink(recipe)}
                    className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[var(--stator-fg)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
                    title="Copy shareable preset URL"
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

        {/* Local Brand Kit */}
        <section className="bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[var(--stator-border)] flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-[var(--stator-accent-fg)] shrink-0" />
            <h2 className="text-xs font-mono uppercase tracking-[0.07em] text-[var(--stator-fg-muted)]">
              Local Brand Defaults
            </h2>
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
                  },
                  `${brandKit.brandName} Brand Defaults`
                );
              }}
              className="w-full h-9 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] cursor-pointer transition-colors active:scale-[0.98]"
            >
              Apply Framing to Queue
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
