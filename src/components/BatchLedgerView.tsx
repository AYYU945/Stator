import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import {
  Zap,
  TrendingDown,
  FolderArchive,
  Plus,
  Check,
  Loader2,
  Pause,
  Play,
  ChevronDown,
  Maximize2,
  Trash2,
  X,
  Download,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  ArrowRight,
  Camera,
  Video,
  Music,
  FileText,
  FileBox,
  FileImage,
  Volume2,
  RotateCw,
  FlipHorizontal2,
} from 'lucide-react';
import {
  QueueItem,
  FileTypeCategory,
  TARGET_FORMAT_OPTIONS,
  formatFileSize,
  PresetSettings,
  DEFAULT_PRESET_SETTINGS,
  RotationDegrees,
} from '../types/queue.ts';
import {
  buildOutputFilename,
  probeImageEncoderSupport,
} from '../utils/formatCapabilities.ts';
import { STATOR_SPRING, STATOR_TRANSITION, getRowStaggerDelay } from '../lib/motion.ts';
import { BeforeAfterSlider } from './inspector/BeforeAfterSlider.tsx';
import { ToggleSwitch } from './ui/Primitives.tsx';
import { CustomSelect } from './CustomSelect.tsx';

export interface BatchLedgerViewProps {
  queue: QueueItem[];
  onFilesDropped: (files: File[]) => void;
  onAddFilesClick: () => void;
  onRemoveItem: (id: string) => void;
  onReorderItem?: (id: string, direction: 'up' | 'down') => void;
  onClearQueue: () => void;
  onUpdateTargetFormat: (id: string, targetFormat: string) => void;
  onUpdatePresetSettings: (id: string, settings: PresetSettings) => void;
  onBatchUpdateFormat?: (category: FileTypeCategory, targetFormat: string) => void;
  onStartConversion: (
    id: string,
    overrideFormat?: string,
    overrideSettings?: PresetSettings
  ) => void;
  onCancelConversion: (id: string) => void;
  onConvertAll: () => void;
  onTogglePause?: () => void;
  isPaused?: boolean;
  onOpenFocusStage: (id: string) => void;
  onToast?: (message: string) => void;
  wasmLoadProgress?: string | null;
}

const renderCompactGlyph = (
  category: FileTypeCategory,
  targetFormat?: string,
  thumbUrl?: string
) => {
  if (thumbUrl && category === 'image') {
    return (
      <div className="w-9 h-9 rounded-md stator-checkerboard border border-[var(--stator-border)] overflow-hidden shrink-0">
        <img src={thumbUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }
  const iconProps = { className: 'w-4 h-4', strokeWidth: 1.75 };
  let icon = <Camera {...iconProps} />;
  if (targetFormat?.toUpperCase() === 'GIF') icon = <FileImage {...iconProps} />;
  else if (category === 'video') icon = <Video {...iconProps} />;
  else if (category === 'audio') icon = <Music {...iconProps} />;
  else if (category === 'document') icon = <FileText {...iconProps} />;
  else if (category === 'other') icon = <FileBox {...iconProps} />;

  return (
    <div className="w-9 h-9 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[var(--stator-fg-muted)] flex items-center justify-center shrink-0">
      {icon}
    </div>
  );
};

export const BatchLedgerView: React.FC<BatchLedgerViewProps> = ({
  queue,
  onFilesDropped,
  onAddFilesClick,
  onRemoveItem,
  onReorderItem,
  onClearQueue,
  onUpdateTargetFormat,
  onUpdatePresetSettings,
  onBatchUpdateFormat,
  onStartConversion,
  onCancelConversion,
  onConvertAll,
  onTogglePause,
  isPaused = false,
  onOpenFocusStage,
  onToast,
  wasmLoadProgress,
}) => {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isDragOverLedger, setIsDragOverLedger] = useState(false);
  const [avifSupported, setAvifSupported] = useState(true);
  const [webpSupported, setWebpSupported] = useState(true);

  useEffect(() => {
    probeImageEncoderSupport('image/avif').then(setAvifSupported);
    probeImageEncoderSupport('image/webp').then(setWebpSupported);
  }, []);

  const completedItems = queue.filter((i) => i.status === 'completed');
  const isAllCompleted = queue.length > 0 && completedItems.length === queue.length;
  const isAnyConverting = queue.some((i) => i.status === 'converting');

  const totalInputBytes = completedItems.reduce((acc, item) => acc + (item.sizeBytes || 0), 0);
  const totalOutputBytes = completedItems.reduce(
    (acc, item) => acc + (item.outputSizeBytes || 0),
    0
  );
  const netSavedBytes = totalInputBytes - totalOutputBytes;
  const savingsPercent =
    totalInputBytes > 0 ? Math.round((Math.abs(netSavedBytes) / totalInputBytes) * 100) : 0;

  const triggerDownloadFile = (item: QueueItem) => {
    if (!item.outputUrl && !item.outputBlob) {
      onToast?.('Converted output blob unavailable. Re-run conversion first.');
      return;
    }
    const filename = item.outputName || buildOutputFilename(item.name, item.targetFormat);
    let downloadUrl = item.outputUrl;
    let shouldRevoke = false;
    if (!downloadUrl && item.outputBlob) {
      downloadUrl = URL.createObjectURL(item.outputBlob);
      shouldRevoke = true;
    }
    if (!downloadUrl) return;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (shouldRevoke) URL.revokeObjectURL(downloadUrl);
    onToast?.(`Downloaded ${filename}`);
  };

  const handleDownloadAllZip = async () => {
    const downloadable = completedItems.filter((item) => item.outputBlob || item.outputUrl);
    if (downloadable.length === 0) {
      onToast?.('No converted blobs ready to archive.');
      return;
    }
    try {
      setIsZipping(true);
      const zip = new JSZip();
      for (const item of downloadable) {
        const filename = item.outputName || buildOutputFilename(item.name, item.targetFormat);
        if (item.outputBlob) {
          zip.file(filename, item.outputBlob);
        } else if (item.outputUrl) {
          const resp = await fetch(item.outputUrl);
          if (!resp.ok) throw new Error(`Failed reading output stream for ${filename}`);
          zip.file(filename, await resp.blob());
        }
      }
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Stator_bundle.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast?.(`Downloaded Stator_bundle.zip (${formatFileSize(zipBlob.size)})`);
    } catch (err: any) {
      onToast?.(err?.message || 'Error generating ZIP archive');
    } finally {
      setIsZipping(false);
    }
  };

  const readyImageCount = queue.filter(
    (i) => i.typeCategory === 'image' && i.status === 'ready'
  ).length;
  const readyVideoCount = queue.filter(
    (i) => i.typeCategory === 'video' && i.status === 'ready'
  ).length;
  const readyAudioCount = queue.filter(
    (i) => i.typeCategory === 'audio' && i.status === 'ready'
  ).length;

  const enableRowLayout = queue.length <= 40;

  return (
    <section
      aria-label="Progressive-Disclosure Batch Ledger"
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragOverLedger) setIsDragOverLedger(true);
      }}
      onDragLeave={(e) => {
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        setIsDragOverLedger(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverLedger(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onFilesDropped(Array.from(e.dataTransfer.files));
        }
      }}
      className="w-full space-y-4"
    >
      {/* Completed Editorial Summary Banner */}
      <AnimatePresence>
        {isAllCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={STATOR_SPRING.gentle}
            className="w-full bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[var(--stator-success)] flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[var(--stator-fg)] tracking-tight">
                  {completedItems.length} of {queue.length} files converted locally
                </h2>
                <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5 font-mono tabular-nums">
                  Input {formatFileSize(totalInputBytes)} → Output {formatFileSize(totalOutputBytes)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="inline-flex items-baseline gap-2 font-mono tabular-nums text-[var(--stator-success)] font-medium">
                <TrendingDown className="w-4 h-4 self-center" />
                <span className="font-serif italic text-xl font-semibold">
                  {netSavedBytes >= 0 ? `-${savingsPercent}%` : `+${savingsPercent}%`}
                </span>
                <span className="text-xs">
                  {netSavedBytes >= 0
                    ? `(${formatFileSize(netSavedBytes)} saved)`
                    : `(+${formatFileSize(Math.abs(netSavedBytes))})`}
                </span>
              </div>

              <button
                type="button"
                disabled={isZipping}
                onClick={handleDownloadAllZip}
                className="min-h-[38px] px-4 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap active:scale-[0.98]"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Archiving ZIP…</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4" />
                    <span>Download All (.ZIP)</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Single-Elevation Ledger Surface */}
      <div
        className={`rounded-2xl border bg-[var(--stator-surface)] overflow-hidden transition-colors ${
          isDragOverLedger
            ? 'border-[var(--stator-accent)] ring-2 ring-[var(--stator-accent-soft)]'
            : 'border-[var(--stator-border)]'
        }`}
      >
        {/* Ledger Header & Integrated Intake Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--stator-border)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--stator-fg)]">
              Conversion Ledger
            </h2>
            <span className="text-xs font-mono tabular-nums text-[var(--stator-fg-subtle)]">
              · {queue.length} {queue.length === 1 ? 'file' : 'files'}
            </span>
            <span className="hidden md:inline text-xs text-[var(--stator-fg-subtle)]">
              · Click any row to expand inline preview &amp; tuning
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isAnyConverting && onTogglePause && (
              <button
                type="button"
                onClick={onTogglePause}
                className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{isPaused ? 'Resume' : 'Pause Next'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAddFilesClick}
              className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
              <span>Add Files</span>
            </button>

            <button
              type="button"
              onClick={onClearQueue}
              className="text-xs text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors cursor-pointer px-1.5"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Batch Category Format Toolbar */}
        {onBatchUpdateFormat &&
          (readyImageCount >= 2 || readyVideoCount >= 2 || readyAudioCount >= 2) && (
            <div className="px-4 sm:px-5 py-2 border-b border-[var(--stator-border)] bg-[var(--stator-surface-2)]/55 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
              <span className="font-medium text-[var(--stator-fg-muted)]">Set All Ready:</span>
              {readyImageCount >= 2 && (
                <div className="flex items-center gap-1">
                  <span className="text-[var(--stator-fg-subtle)] mr-1">
                    Images ({readyImageCount}):
                  </span>
                  {TARGET_FORMAT_OPTIONS.image.slice(0, 4).map((fmt) => (
                    <button
                      key={`img-${fmt}`}
                      type="button"
                      onClick={() => onBatchUpdateFormat('image', fmt)}
                      className="px-2 py-0.5 rounded bg-[var(--stator-surface)] hover:border-[var(--stator-accent-fg)] border border-[var(--stator-border)] font-mono text-[11px] text-[var(--stator-fg)] cursor-pointer transition-colors active:scale-[0.97]"
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              )}
              {readyVideoCount >= 2 && (
                <div className="flex items-center gap-1">
                  <span className="text-[var(--stator-fg-subtle)] mr-1">
                    Video ({readyVideoCount}):
                  </span>
                  {['MP4', 'WEBM', 'GIF', 'MP3'].map((fmt) => (
                    <button
                      key={`vid-${fmt}`}
                      type="button"
                      onClick={() => onBatchUpdateFormat('video', fmt)}
                      className="px-2 py-0.5 rounded bg-[var(--stator-surface)] hover:border-[var(--stator-accent-fg)] border border-[var(--stator-border)] font-mono text-[11px] text-[var(--stator-fg)] cursor-pointer transition-colors active:scale-[0.97]"
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              )}
              {readyAudioCount >= 2 && (
                <div className="flex items-center gap-1">
                  <span className="text-[var(--stator-fg-subtle)] mr-1">
                    Audio ({readyAudioCount}):
                  </span>
                  {TARGET_FORMAT_OPTIONS.audio.slice(0, 4).map((fmt) => (
                    <button
                      key={`aud-${fmt}`}
                      type="button"
                      onClick={() => onBatchUpdateFormat('audio', fmt)}
                      className="px-2 py-0.5 rounded bg-[var(--stator-surface)] hover:border-[var(--stator-accent-fg)] border border-[var(--stator-border)] font-mono text-[11px] text-[var(--stator-fg)] cursor-pointer transition-colors active:scale-[0.97]"
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        {/* Aggregate Batch Progress Bar */}
        {(() => {
          const activeCount = queue.filter(
            (item) => item.status === 'converting' || item.status === 'ready'
          ).length;
          if (!isAnyConverting && activeCount < 2) return null;
          const totalBatchCount = queue.length;
          const completedOrErrorCount = queue.filter(
            (item) => item.status === 'completed' || item.status === 'error'
          ).length;
          const currentItemNumber = Math.min(totalBatchCount, completedOrErrorCount + 1);
          const totalProgressPercent = Math.min(
            100,
            Math.round(
              queue.reduce((acc, item) => {
                if (item.status === 'completed') return acc + 100;
                if (item.status === 'converting') return acc + (item.progress || 0);
                return acc;
              }, 0) / totalBatchCount
            )
          );
          if (!isAnyConverting && totalProgressPercent === 0) return null;
          return (
            <div className="px-4 sm:px-5 py-2 border-b border-[var(--stator-border)] bg-[var(--stator-surface-2)]/35">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[var(--stator-fg-muted)]">
                <span>
                  {isPaused
                    ? `Batch paused at #${currentItemNumber} of ${totalBatchCount}`
                    : `Batch progress · item ${currentItemNumber} of ${totalBatchCount}`}
                </span>
                <span className="text-[var(--stator-fg)] font-medium">{totalProgressPercent}%</span>
              </div>
              <div className="h-1 w-full bg-[var(--stator-surface-2)] rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-[var(--stator-accent)] origin-left transition-transform duration-150 ease-out h-full w-full"
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, totalProgressPercent / 100))})`,
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* Compact 52px Ledger Rows + Animated Inline Progressive-Disclosure Drawers */}
        <div className="divide-y divide-[var(--stator-border)]">
          <AnimatePresence initial={false}>
            {queue.map((item, idx) => {
              const isExpanded = expandedRowId === item.id;
              const isCompleted = item.status === 'completed';
              const isConverting = item.status === 'converting';
              const isError = item.status === 'error';
              const isReady = !isCompleted && !isConverting && !isError;

              const sourceExt = item.name.includes('.')
                ? item.name.split('.').pop()?.toUpperCase() || 'FILE'
                : 'FILE';
              const displayName = item.outputName || item.name;
              const formatOptions = TARGET_FORMAT_OPTIONS[item.typeCategory] || [];
              const thumbUrl =
                item.typeCategory === 'image' ? item.outputUrl || item.previewUrl : undefined;

              const settings: PresetSettings = {
                ...DEFAULT_PRESET_SETTINGS,
                ...(item.presetSettings || {}),
              };
              const rotation = (settings.rotation || 0) as RotationDegrees;
              const flipH = Boolean(settings.flipH);

              const updateRowSetting = <K extends keyof PresetSettings>(
                key: K,
                val: PresetSettings[K]
              ) => {
                onUpdatePresetSettings(item.id, { ...settings, [key]: val });
              };

              const canCompareImages =
                item.typeCategory === 'image' &&
                Boolean(item.previewUrl) &&
                Boolean(item.outputUrl) &&
                item.previewUrl !== item.outputUrl;

              return (
                <motion.div
                  key={item.id}
                  layout={enableRowLayout ? 'position' : false}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{
                    duration: STATOR_TRANSITION.micro.duration,
                    delay: getRowStaggerDelay(idx),
                    layout: STATOR_SPRING.tactile,
                  }}
                  className={`transition-colors ${
                    isError
                      ? 'bg-rose-500/[0.03]'
                      : isExpanded
                      ? 'bg-[var(--stator-surface-2)]/30'
                      : 'hover:bg-[var(--stator-surface-2)]/40'
                  }`}
                >
                  {/* Main Compact 52px Row */}
                  <div className="px-4 sm:px-5 py-2.5 md:py-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Index, Reorder, Thumbnail, Name & Inline Telemetry */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="hidden sm:inline font-mono tabular-nums text-[11px] text-[var(--stator-fg-subtle)] w-5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      {isReady && queue.length > 1 && onReorderItem && (
                        <div className="hidden lg:flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => onReorderItem(item.id, 'up')}
                            className="p-0.5 text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] disabled:opacity-25 cursor-pointer"
                            aria-label={`Move ${item.name} up`}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === queue.length - 1}
                            onClick={() => onReorderItem(item.id, 'down')}
                            className="p-0.5 text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] disabled:opacity-25 cursor-pointer"
                            aria-label={`Move ${item.name} down`}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {renderCompactGlyph(item.typeCategory, item.targetFormat, thumbUrl)}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {isCompleted && (
                            <Check className="w-3.5 h-3.5 text-[var(--stator-success)] shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRowId((curr) => (curr === item.id ? null : item.id))
                            }
                            className="font-semibold text-[var(--stator-fg)] hover:text-[var(--stator-accent-fg)] text-sm tracking-tight truncate text-left cursor-pointer transition-colors"
                          >
                            {displayName}
                          </button>
                        </div>

                        <div className="text-xs font-mono tabular-nums text-[var(--stator-fg-muted)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>
                            {item.outputDimensions || item.technicalTag || item.sizeFormatted}
                          </span>
                          {isCompleted && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[var(--stator-success)] font-medium">
                                {item.reductionBadge || item.outputSizeFormatted || 'Ready'}
                              </span>
                            </>
                          )}
                          {isConverting && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[var(--stator-accent-fg)] font-medium">
                                {wasmLoadProgress && item.progress <= 25
                                  ? wasmLoadProgress
                                  : `${item.progress}%`}
                              </span>
                              {item.speed && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.speed}</span>
                                </>
                              )}
                            </>
                          )}
                          {isError && (
                            <span className="text-[var(--stator-danger)] inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{item.errorMessage || 'Transcode failed'}</span>
                            </span>
                          )}
                          {item.warningMessage && isReady && (
                            <span className="text-[var(--stator-warning)] inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{item.warningMessage}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Format Selector, Expand Drawer Toggle, Focus Stage & Primary Action */}
                    <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-mono tabular-nums">
                        <span className="text-[var(--stator-fg-subtle)]">{sourceExt}</span>
                        <ArrowRight className="w-3 h-3 text-[var(--stator-fg-subtle)]" />
                        {formatOptions.length > 0 && !isConverting ? (
                          <select
                            aria-label={`Target format for ${item.name}`}
                            value={item.targetFormat}
                            onChange={(e) => onUpdateTargetFormat(item.id, e.target.value)}
                            className="bg-transparent text-[var(--stator-fg)] font-semibold cursor-pointer focus:outline-none pr-1"
                          >
                            {formatOptions.map((fmt) => (
                              <option
                                key={fmt}
                                value={fmt}
                                disabled={
                                  item.typeCategory === 'image' &&
                                  ((fmt === 'AVIF' && !avifSupported) ||
                                    (fmt === 'WEBP' && !webpSupported))
                                }
                                className="bg-[var(--stator-surface)] text-[var(--stator-fg)]"
                              >
                                {fmt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[var(--stator-fg)] font-semibold">
                            {item.targetFormat.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRowId((curr) => (curr === item.id ? null : item.id))
                          }
                          aria-expanded={isExpanded}
                          className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98] ${
                            isExpanded
                              ? 'bg-[var(--stator-accent-soft)] border-[var(--stator-accent)] text-[var(--stator-accent-fg)]'
                              : 'bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border-[var(--stator-border)] text-[var(--stator-fg)]'
                          }`}
                          title="Toggle inline preview and encoding settings"
                        >
                          <span>{isCompleted ? 'Compare & Tune' : 'Tune'}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-150 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenFocusStage(item.id)}
                          className="h-8 w-8 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] flex items-center justify-center cursor-pointer transition-colors active:scale-[0.96]"
                          title="Open in full-width Focus Canvas"
                          aria-label={`Open ${item.name} in Focus Canvas`}
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {isReady && (
                          <button
                            type="button"
                            onClick={() => onStartConversion(item.id)}
                            className="h-8 px-3 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Convert</span>
                          </button>
                        )}

                        {isConverting && (
                          <button
                            type="button"
                            onClick={() => onCancelConversion(item.id)}
                            className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[var(--stator-fg)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => triggerDownloadFile(item)}
                            className="h-8 px-3 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap active:scale-[0.98]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        )}

                        {isError && (
                          <button
                            type="button"
                            onClick={() => onStartConversion(item.id)}
                            className="h-8 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[var(--stator-danger)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </button>
                        )}

                        {!isConverting && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="h-8 w-8 rounded-lg bg-[var(--stator-surface)] hover:bg-rose-500/10 border border-[var(--stator-border)] text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] flex items-center justify-center cursor-pointer transition-colors active:scale-[0.96]"
                            title="Remove from queue"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress hairline for active row */}
                  {isConverting && (
                    <div className="px-4 sm:px-5 pb-2.5">
                      <div className="w-full h-1 rounded-full bg-[var(--stator-surface-2)] overflow-hidden">
                        <div
                          className="h-full w-full origin-left bg-[var(--stator-accent)] transition-transform duration-150 ease-out"
                          style={{
                            transform: `scaleX(${Math.max(0.03, Math.min(1, item.progress / 100))})`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* ANIMATED INLINE PROGRESSIVE-DISCLOSURE DRAWER */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`drawer-${item.id}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={STATOR_TRANSITION.drawer}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-[var(--stator-border)] bg-[var(--stator-surface-2)]/35 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                          {/* Left 6 cols: Live Inline Preview / Before-After Split */}
                          <div className="lg:col-span-6 space-y-2">
                            {canCompareImages && item.previewUrl && item.outputUrl ? (
                              <BeforeAfterSlider
                                originalUrl={item.previewUrl}
                                convertedUrl={item.outputUrl}
                                originalLabel={`Source · ${item.sizeFormatted}`}
                                convertedLabel={`${item.targetFormat} · ${
                                  item.outputSizeFormatted || ''
                                }`}
                                alt={item.name}
                                heightClass="h-[220px] sm:h-[250px]"
                              />
                            ) : (
                              <div className="w-full h-[210px] sm:h-[240px] rounded-xl stator-checkerboard border border-[var(--stator-stage-border)] flex items-center justify-center overflow-hidden p-3">
                                {item.typeCategory === 'image' &&
                                (item.outputUrl || item.previewUrl) ? (
                                  <motion.img
                                    src={item.outputUrl || item.previewUrl}
                                    alt={item.name}
                                    animate={{
                                      rotate: rotation,
                                      scaleX: flipH ? -1 : 1,
                                    }}
                                    transition={STATOR_SPRING.tactile}
                                    className="max-h-full max-w-full object-contain rounded"
                                  />
                                ) : item.typeCategory === 'video' && item.outputUrl ? (
                                  <video
                                    src={item.outputUrl}
                                    controls
                                    className="max-h-full max-w-full object-contain rounded bg-black"
                                  />
                                ) : item.typeCategory === 'audio' && item.outputUrl ? (
                                  <audio src={item.outputUrl} controls className="w-full max-w-xs" />
                                ) : (
                                  <div className="text-center space-y-2">
                                    <p className="text-xs font-mono text-[#A1A8B5]">
                                      {item.name} ({item.sizeFormatted})
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => onOpenFocusStage(item.id)}
                                      className="h-8 px-3 rounded-lg bg-[#2563EB] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Maximize2 className="w-3.5 h-3.5" />
                                      <span>Open Full Darkroom Stage</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right 6 cols: Contextual Inline Controls */}
                          <div className="lg:col-span-6 space-y-4 text-xs">
                            {item.typeCategory === 'image' && (
                              <>
                                {(item.targetFormat === 'WEBP' ||
                                  item.targetFormat === 'JPEG' ||
                                  item.targetFormat === 'AVIF') && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-medium text-[var(--stator-fg)]">
                                        Quality Factor
                                      </span>
                                      <span className="font-mono tabular-nums text-[var(--stator-accent-fg)] font-semibold">
                                        {settings.imageQuality}%
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min="10"
                                      max="100"
                                      value={settings.imageQuality}
                                      onChange={(e) =>
                                        updateRowSetting('imageQuality', Number(e.target.value))
                                      }
                                      className="w-full stator-slider"
                                      style={{
                                        background: `linear-gradient(to right, var(--stator-accent) ${
                                          ((settings.imageQuality - 10) / 90) * 100
                                        }%, var(--stator-border) ${
                                          ((settings.imageQuality - 10) / 90) * 100
                                        }%)`,
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <span className="font-medium text-[var(--stator-fg)] block mb-1.5">
                                      Resolution Scale
                                    </span>
                                    <div className="grid grid-cols-5 gap-1">
                                      {['original', '4K', '2K', '1080p', '720p'].map((res) => (
                                        <button
                                          key={res}
                                          type="button"
                                          onClick={() => updateRowSetting('imageResize', res as any)}
                                          className={`py-1 font-mono text-[11px] rounded border cursor-pointer ${
                                            settings.imageResize === res
                                              ? 'bg-[var(--stator-accent)] text-white border-transparent'
                                              : 'bg-[var(--stator-surface)] text-[var(--stator-fg)] border-[var(--stator-border)]'
                                          }`}
                                        >
                                          {res === 'original' ? 'Orig' : res}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <span className="font-medium text-[var(--stator-fg)] block mb-1.5">
                                      Orientation
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateRowSetting(
                                            'rotation',
                                            (((rotation + 90) % 360) as RotationDegrees)
                                          )
                                        }
                                        className="h-7 px-2.5 rounded border border-[var(--stator-border)] bg-[var(--stator-surface)] text-[var(--stator-fg)] font-mono inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <RotateCw className="w-3 h-3" />
                                        <span>{rotation}°</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateRowSetting('flipH', !flipH)}
                                        className={`h-7 px-2.5 rounded border inline-flex items-center gap-1 cursor-pointer ${
                                          flipH
                                            ? 'bg-[var(--stator-accent)] text-white border-transparent'
                                            : 'border-[var(--stator-border)] bg-[var(--stator-surface)] text-[var(--stator-fg)]'
                                        }`}
                                      >
                                        <FlipHorizontal2 className="w-3 h-3" />
                                        <span>Flip</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {item.typeCategory === 'video' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[
                                    { id: 'lossless', label: 'Copy' },
                                    { id: 'high', label: 'CRF 18' },
                                    { id: 'balanced', label: 'CRF 23' },
                                    { id: 'compact', label: 'CRF 28' },
                                  ].map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => updateRowSetting('videoBitrate', p.id as any)}
                                      className={`py-1.5 rounded border font-mono cursor-pointer ${
                                        settings.videoBitrate === p.id
                                          ? 'bg-[var(--stator-accent)] text-white border-transparent'
                                          : 'bg-[var(--stator-surface)] text-[var(--stator-fg)] border-[var(--stator-border)]'
                                      }`}
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>

                                <div className="grid grid-cols-5 gap-1">
                                  {['original', '9:16', '1:1', '4:5', '16:9'].map((crop) => (
                                    <button
                                      key={crop}
                                      type="button"
                                      onClick={() => updateRowSetting('aspectCrop', crop as any)}
                                      className={`py-1 rounded border font-mono cursor-pointer ${
                                        (settings.aspectCrop || 'original') === crop
                                          ? 'bg-[var(--stator-accent)] text-white border-transparent'
                                          : 'bg-[var(--stator-surface)] text-[var(--stator-fg)] border-[var(--stator-border)]'
                                      }`}
                                    >
                                      {crop === 'original' ? 'Orig Crop' : crop}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.typeCategory === 'audio' && (
                              <div>
                                <span className="font-medium text-[var(--stator-fg)] block mb-1.5">
                                  Audio Bitrate
                                </span>
                                <CustomSelect
                                  value={settings.audioBitrate}
                                  onChange={(b) => updateRowSetting('audioBitrate', b as any)}
                                  options={[
                                    { value: '320k', label: '320 kbps · Studio Master' },
                                    { value: '256k', label: '256 kbps · High Fidelity' },
                                    { value: '192k', label: '192 kbps · Standard' },
                                    { value: '128k', label: '128 kbps · Web' },
                                    { value: '64k', label: '64 kbps · Voice Compact' },
                                  ]}
                                />
                              </div>
                            )}

                            <div className="pt-2 border-t border-[var(--stator-border)] flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <span className="text-[var(--stator-fg-muted)]">Strip EXIF</span>
                                <ToggleSwitch
                                  checked={Boolean(settings.stripMetadata)}
                                  onChange={(next) => updateRowSetting('stripMetadata', next)}
                                  ariaLabel="Strip Metadata"
                                />
                              </div>

                              {(item.typeCategory === 'video' || item.typeCategory === 'audio') && (
                                <div className="flex items-center gap-2">
                                  <Volume2 className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
                                  <span className="text-[var(--stator-fg-muted)]">-16 LUFS</span>
                                  <ToggleSwitch
                                    checked={Boolean(settings.normalizeAudio)}
                                    onChange={(next) => updateRowSetting('normalizeAudio', next)}
                                    ariaLabel="Loudness Normalize"
                                  />
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  onStartConversion(item.id, item.targetFormat, settings)
                                }
                                className="h-8 px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white font-medium inline-flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                              >
                                <Play className="w-3 h-3 fill-white" />
                                <span>
                                  {isCompleted ? 'Re-encode Now' : 'Convert with Settings'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Desktop Ledger Footer */}
        {!isAllCompleted && (
          <div className="hidden md:flex items-center justify-between px-5 py-3.5 border-t border-[var(--stator-border)] bg-[var(--stator-surface-2)]/30">
            <span className="text-xs text-[var(--stator-fg-muted)]">
              Drop additional files anywhere on the ledger or press ⌘V to paste.
            </span>

            <button
              type="button"
              onClick={onConvertAll}
              className="min-h-[40px] px-5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white font-medium text-[13px] inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Convert All ({queue.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Sticky Primary Action */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 px-4 py-2.5 bg-[var(--stator-surface)]/95 backdrop-blur-md border-t border-[var(--stator-border)] z-40">
        {isAllCompleted ? (
          <button
            type="button"
            disabled={isZipping}
            onClick={handleDownloadAllZip}
            className="w-full min-h-[44px] px-4 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Archiving ZIP…</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-4 h-4" />
                <span>Download All (.ZIP) · {formatFileSize(totalOutputBytes)}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onConvertAll}
            className="w-full min-h-[44px] px-4 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Convert All ({queue.length})</span>
          </button>
        )}
      </div>
    </section>
  );
};
