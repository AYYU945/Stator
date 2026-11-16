import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen,
  Sparkles,
  SlidersHorizontal,
  ArrowUpRight,
  Film,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { PresetSettings } from '../types/queue.ts';
import { WasmStatus } from '../utils/ffmpegManager.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../lib/motion.ts';

export interface EditorialIntakeProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSampleFiles: () => void;
  globalPreset: PresetSettings;
  wasmStatus: WasmStatus;
  onOpenPresets: () => void;
  onOpenGifStudio: () => void;
}

export const EditorialIntake: React.FC<EditorialIntakeProps> = ({
  onFilesSelected,
  onLoadSampleFiles,
  globalPreset,
  onOpenPresets,
  onOpenGifStudio,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setDropNotice(null);

    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) {
      setDropNotice('No readable files detected in drop payload.');
      return;
    }
    onFilesSelected(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDropNotice(null);
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const triggerBrowse = () => {
    setDropNotice(null);
    fileInputRef.current?.click();
  };

  const resizeLabel =
    globalPreset.imageResize && globalPreset.imageResize !== 'original'
      ? globalPreset.imageResize
      : 'Original';

  return (
    <section
      aria-label="Media Intake Studio"
      className="w-full py-10 sm:py-14 lg:py-16 flex flex-col justify-between"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Asymmetric Architectural Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pb-10 sm:pb-14">
        {/* Left Rail: Editorial Lead & Primary Actions */}
        <div className="lg:col-span-7 space-y-6">
          <h1
            className="text-[clamp(2.35rem,4.6vw,3.85rem)] font-semibold tracking-tight text-[var(--stator-fg)] leading-[1.05]"
            style={{ textWrap: 'balance' }}
          >
            Local media conversion,{' '}
            <span className="font-serif italic font-normal text-[var(--stator-accent-fg)]">
              engineered for precision.
            </span>
          </h1>

          <p className="text-sm sm:text-[15px] text-[var(--stator-fg-muted)] leading-relaxed max-w-md">
            Convert video, audio, and images privately in browser memory.
          </p>

          {/* Unmistakable Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={triggerBrowse}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs whitespace-nowrap shrink-0 active:scale-[0.98]"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Choose Files</span>
            </button>

            <button
              type="button"
              onClick={onLoadSampleFiles}
              className="min-h-[44px] px-4 py-2.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-strong)] text-[var(--stator-fg)] text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
              <span>Load Samples</span>
            </button>
          </div>

          {/* Unboxed Default Pipeline & GIF Studio Links */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--stator-fg-muted)] pt-2">
            <button
              type="button"
              onClick={onOpenPresets}
              className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[var(--stator-fg)] hover:text-[var(--stator-accent-fg)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
              <span>
                {globalPreset.imageQuality}% · {resizeLabel}
              </span>
            </button>

            <span aria-hidden="true" className="text-[var(--stator-border-strong)]">
              ·
            </span>

            <button
              type="button"
              onClick={onOpenGifStudio}
              className="inline-flex items-center gap-1 text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Film className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
              <span>GIF Studio</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Column: Tactile Darkroom Drop Aperture (Establishes Canvas Identity Immediately) */}
        <div className="lg:col-span-5">
          <motion.div
            role="button"
            tabIndex={0}
            aria-label="Drop video, audio, or image files here, paste from clipboard, or press Enter to choose files"
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerBrowse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerBrowse();
              }
            }}
            animate={{
              scale: isDragActive ? 1.015 : 1,
            }}
            whileTap={{ scale: 0.99 }}
            transition={STATOR_SPRING.tactile}
            className={`relative w-full min-h-[270px] sm:min-h-[310px] rounded-xl bg-[var(--stator-stage)] text-[#F3F4F6] border transition-colors duration-150 select-none cursor-pointer flex flex-col justify-between p-6 sm:p-7 overflow-hidden ${
              isDragActive
                ? 'border-[#3B82F6] shadow-xl'
                : 'border-[var(--stator-stage-border)] hover:border-[#464D5E]'
            }`}
          >
            {/* Precision Corner Viewfinder Reticles */}
            <motion.span
              aria-hidden="true"
              animate={{
                x: isDragActive ? 4 : 0,
                y: isDragActive ? 4 : 0,
                opacity: isDragActive ? 1 : 0.45,
              }}
              transition={STATOR_SPRING.tactile}
              className="pointer-events-none absolute top-3.5 left-3.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#60A5FA]"
            />
            <motion.span
              aria-hidden="true"
              animate={{
                x: isDragActive ? -4 : 0,
                y: isDragActive ? 4 : 0,
                opacity: isDragActive ? 1 : 0.45,
              }}
              transition={STATOR_SPRING.tactile}
              className="pointer-events-none absolute top-3.5 right-3.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#60A5FA]"
            />
            <motion.span
              aria-hidden="true"
              animate={{
                x: isDragActive ? 4 : 0,
                y: isDragActive ? -4 : 0,
                opacity: isDragActive ? 1 : 0.45,
              }}
              transition={STATOR_SPRING.tactile}
              className="pointer-events-none absolute bottom-3.5 left-3.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#60A5FA]"
            />
            <motion.span
              aria-hidden="true"
              animate={{
                x: isDragActive ? -4 : 0,
                y: isDragActive ? -4 : 0,
                opacity: isDragActive ? 1 : 0.45,
              }}
              transition={STATOR_SPRING.tactile}
              className="pointer-events-none absolute bottom-3.5 right-3.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#60A5FA]"
            />

            {/* Aperture Top Readout */}
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#8E95A5]">
              <span>ON-DEVICE</span>
              <span>MAX 1.8 GB</span>
            </div>

            {/* Aperture Center Focal Prompt */}
            <div className="my-auto py-6 flex flex-col items-center text-center space-y-3">
              <motion.div
                animate={{ y: isDragActive ? -3 : 0 }}
                transition={STATOR_SPRING.tactile}
                className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-colors ${
                  isDragActive
                    ? 'bg-[#2563EB] border-transparent text-white'
                    : 'bg-[#14171D] border-[#262A36] text-[#9BA1AE]'
                }`}
              >
                <Upload className="w-4 h-4" />
              </motion.div>

              <div>
                <p className="font-serif text-lg sm:text-xl font-medium text-[#F3F4F6] tracking-tight">
                  {isDragActive ? 'Release to stage' : 'Drop media files'}
                </p>
                <p className="text-xs text-[#8E95A5] mt-1">
                  Browse or paste (⌘V)
                </p>
              </div>
            </div>

            {/* Aperture Bottom Readout / Rejection Notice */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#7F8796]">
              <span>VIDEO · AUDIO · PHOTO</span>
              <span className="text-[#60A5FA]">⌘K</span>
            </div>
          </motion.div>

          <AnimatePresence>
            {dropNotice && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={STATOR_TRANSITION.micro}
                className="mt-2.5 text-xs font-mono text-[var(--stator-danger)] inline-flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{dropNotice}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Unboxed Hairline Format Ledger */}
      <div className="border-t border-[var(--stator-border)] pt-6 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-10 text-xs">
        <div className="flex flex-col space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.07em] text-[var(--stator-accent-fg)]">
            01 · Images
          </span>
          <span className="font-mono text-[11px] text-[var(--stator-fg-muted)] tabular-nums">
            AVIF · WEBP · PNG · JPEG · ICO · TIFF · BMP
          </span>
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.07em] text-[var(--stator-accent-fg)]">
            02 · Video
          </span>
          <span className="font-mono text-[11px] text-[var(--stator-fg-muted)] tabular-nums">
            MP4 · WEBM · MOV · MKV · GIF · AVI
          </span>
        </div>

        <div className="flex flex-col space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.07em] text-[var(--stator-accent-fg)]">
            03 · Audio
          </span>
          <span className="font-mono text-[11px] text-[var(--stator-fg-muted)] tabular-nums">
            MP3 · WAV · AAC · OGG · FLAC · -16 LUFS
          </span>
        </div>
      </div>
    </section>
  );
};
