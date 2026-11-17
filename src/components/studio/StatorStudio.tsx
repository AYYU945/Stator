import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Plus,
  Trash2,
  Sparkles,
  PanelLeft,
  PanelRight,
  Scissors,
  Grid,
  Combine,
  AlertTriangle,
  CheckSquare,
  Square,
  Play,
  Pause,
  Zap,
  History,
  ArrowUp,
  ArrowDown,
  SplitSquareHorizontal,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Minimize2,
} from 'lucide-react';
import {
  CompressionGoal,
  DEFAULT_PRESET_SETTINGS,
  FileTypeCategory,
  PresetSettings,
  QueueItem,
  TARGET_FORMAT_OPTIONS,
  formatFileSize,
} from '../../types/queue.ts';
import { ProjectRecord } from '../../types/project.ts';
import { NavToolId } from '../../types/settings.ts';
import { STATOR_TRANSITION } from '../../lib/motion.ts';
import { applyCompressionGoalToPreset } from '../../utils/compressionEngine.ts';
import { ffmpegManager } from '../../utils/ffmpegManager.ts';
import { generateIconPackZip, generateSpriteSheet } from '../../utils/converter.ts';
import { BeforeAfterSlider } from '../inspector/BeforeAfterSlider.tsx';
import { CropOverlayCanvas } from './CropOverlayCanvas.tsx';
import { AudioWaveformBar } from './AudioWaveformBar.tsx';
import { StudioInspector } from './StudioInspector.tsx';

export interface StatorStudioProps {
  activeTool: NavToolId;
  project: ProjectRecord | null;
  queue: QueueItem[];
  activeItemId: string | null;
  onSelectActiveItem: (id: string) => void;
  onFilesDropped: (files: File[]) => void;
  onAddFilesClick: () => void;
  onLoadSamples: () => void;
  onRemoveItem: (id: string) => void;
  onReorderItem: (id: string, dir: 'up' | 'down') => void;
  onUpdateTargetFormat: (id: string, fmt: string) => void;
  onBatchUpdateFormat: (category: FileTypeCategory, fmt: string) => void;
  onUpdatePresetSettings: (id: string, settings: PresetSettings, label?: string) => void;
  onStartConversion: (id: string) => void;
  onCancelConversion: (id: string) => void;
  onConvertAll: () => void;
  onTogglePause: () => void;
  isPaused: boolean;
  onReconnectFile: (id: string, file: File) => void;
  onSplitClip: (id: string, splitSec: number) => void;
  onMergeClips: (ids: string[], mode: 'video' | 'audio', targetFormat: string) => void;
  onReplaceVideoAudio: (id: string, audioFile: File) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  leftWidth: number;
  rightWidth: number;
  onResizeLeft: (w: number) => void;
  onResizeRight: (w: number) => void;
  showCheckerboardDefault: boolean;
  wasmLoadProgress: string | null;
  onToast: (msg: string) => void;
}

export const StatorStudio: React.FC<StatorStudioProps> = ({
  activeTool,
  project,
  queue,
  activeItemId,
  onSelectActiveItem,
  onFilesDropped,
  onAddFilesClick,
  onLoadSamples,
  onRemoveItem,
  onReorderItem,
  onUpdateTargetFormat,
  onBatchUpdateFormat,
  onUpdatePresetSettings,
  onStartConversion,
  onCancelConversion,
  onConvertAll,
  onTogglePause,
  isPaused,
  onReconnectFile,
  onSplitClip,
  onMergeClips,
  onReplaceVideoAudio,
  onRestoreSnapshot,
  leftWidth,
  rightWidth,
  onResizeLeft,
  onResizeRight,
  showCheckerboardDefault,
  wasmLoadProgress,
  onToast,
}) => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [showCheckerboard, setShowCheckerboard] = useState(showCheckerboardDefault);
  const [compareMode, setCompareMode] = useState<'edit' | 'split'>('split');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mediaCurrentSec, setMediaCurrentSec] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);

  useEffect(() => {
    setShowCheckerboard(showCheckerboardDefault);
  }, [showCheckerboardDefault]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const activeItem = useMemo(
    () => queue.find((q) => q.id === activeItemId) || queue[0] || null,
    [queue, activeItemId]
  );

  // Create safe ObjectURLs for active video/audio files
  const [mediaObjectUrl, setMediaObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    setMediaCurrentSec(0);
    if (!activeItem?.file) {
      setMediaObjectUrl(null);
      return;
    }
    if (activeItem.typeCategory === 'video' || activeItem.typeCategory === 'audio') {
      const url = URL.createObjectURL(activeItem.file);
      setMediaObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setMediaObjectUrl(null);
  }, [activeItem?.id, activeItem?.file, activeItem?.typeCategory]);

  // Switch back to split compare automatically when a newly converted image finishes
  useEffect(() => {
    if (activeItem?.typeCategory === 'image' && activeItem.status === 'completed' && activeItem.outputUrl) {
      setCompareMode('split');
    } else {
      setCompareMode('edit');
    }
  }, [activeItem?.id, activeItem?.status, activeItem?.outputUrl, activeItem?.typeCategory]);

  const activePreset = activeItem?.presetSettings || DEFAULT_PRESET_SETTINGS;

  // Compute active subtitle cue matching video playhead
  const activeSubtitleCue = useMemo(() => {
    if (!activePreset.subtitleCues?.length) return null;
    return (
      activePreset.subtitleCues.find(
        (c) => mediaCurrentSec >= c.startSec && mediaCurrentSec <= c.endSec
      ) || null
    );
  }, [activePreset.subtitleCues, mediaCurrentSec]);

  const handleDragResizeLeft = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leftCollapsed) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev: PointerEvent) =>
      onResizeLeft(Math.min(340, Math.max(220, startW + (ev.clientX - startX))));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleDragResizeRight = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rightCollapsed) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev: PointerEvent) =>
      onResizeRight(Math.min(400, Math.max(280, startW - (ev.clientX - startX))));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedItems = queue.filter((i) => selectedIds.includes(i.id) && i.file);
  const canMergeSelected =
    selectedItems.length >= 2 &&
    (selectedItems.every((i) => i.typeCategory === 'video') ||
      selectedItems.every((i) => i.typeCategory === 'audio'));
  const canSpriteSheet =
    selectedItems.length >= 2 && selectedItems.every((i) => i.typeCategory === 'image');

  const handleCreateSpriteSheet = async () => {
    try {
      const files = selectedItems.map((i) => i.file!).filter(Boolean);
      const sheet = await generateSpriteSheet(files, Math.min(4, files.length), 256, 8);
      const a = document.createElement('a');
      a.href = sheet.url;
      a.download = sheet.filename;
      a.click();
      URL.revokeObjectURL(sheet.url);
      onToast(`Generated ${sheet.width}×${sheet.height} sprite sheet PNG`);
    } catch (err: any) {
      onToast(err?.message || 'Failed to generate sprite sheet');
    }
  };

  const handleGenerateIconPack = async (item: QueueItem) => {
    if (!item.file) return;
    try {
      const pack = await generateIconPackZip(item.file);
      const a = document.createElement('a');
      a.href = pack.url;
      a.download = pack.filename;
      a.click();
      URL.revokeObjectURL(pack.url);
      onToast(`Downloaded ${pack.filename}`);
    } catch (err: any) {
      onToast(err?.message || 'Failed to build Icon Pack ZIP');
    }
  };

  const handleExtractFrame = async (item: QueueItem) => {
    if (!item.file) return;
    try {
      onToast('Capturing PNG frame locally…');
      const res = await ffmpegManager.extractVideoFramePng(item.file, mediaCurrentSec);
      onFilesDropped([res.file]);
      onToast(`Captured frame ${res.file.name} into studio`);
    } catch (err: any) {
      onToast(err?.message || 'Frame capture failed');
    }
  };

  const readyCount = queue.filter((i) => (i.status === 'ready' || i.status === 'error') && !i.needsReconnect).length;
  const showBatchTable = activeTool === 'batch' || queue.length > 1;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        const rel = e.relatedTarget as Node | null;
        if (rel && e.currentTarget.contains(rel)) return;
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onFilesDropped(Array.from(e.dataTransfer.files));
        }
      }}
      className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)] w-full overflow-hidden relative"
    >
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={STATOR_TRANSITION.micro}
            className="absolute inset-0 z-40 bg-[var(--stator-cta-bg)]/10 border-2 border-dashed border-[var(--stator-cta-bg)] pointer-events-none flex items-center justify-center"
          >
            <div className="px-5 py-3 rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] shadow-xl text-sm font-semibold text-[var(--stator-fg)]">
              Drop files into {project?.name || 'Stator Studio'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT ASSET & TOOL RAIL */}
      {!leftCollapsed && (
        <aside
          style={{ width: leftWidth }}
          className="hidden xl:flex flex-col shrink-0 bg-[var(--stator-surface)] border-r border-[var(--stator-border)] relative"
        >
          <div className="px-3.5 py-2.5 border-b border-[var(--stator-border)] flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--stator-fg-muted)]">
              Media Bin ({queue.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onAddFilesClick}
                title="Add media files"
                aria-label="Add media files"
                className="p-1 rounded hover:bg-[var(--stator-surface-2)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLeftCollapsed(true)}
                title="Collapse Media Bin"
                aria-label="Collapse Media Bin"
                className="p-1 rounded hover:bg-[var(--stator-surface-2)] text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] cursor-pointer"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {queue.length === 0 ? (
              <div className="py-10 px-3 text-center space-y-2.5">
                <p className="text-xs text-[var(--stator-fg-muted)]">
                  Drop media here or add files to begin editing.
                </p>
                <button
                  type="button"
                  onClick={onAddFilesClick}
                  className="w-full h-8 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium cursor-pointer transition-colors"
                >
                  Choose Files
                </button>
                <button
                  type="button"
                  onClick={onLoadSamples}
                  className="w-full h-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[var(--stator-fg)]" />
                  <span>Load Samples</span>
                </button>
              </div>
            ) : (
              queue.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isActive = activeItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`group rounded-lg p-2 border transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-[var(--stator-surface-2)] border-[var(--stator-border-control)]'
                        : 'bg-transparent border-transparent hover:bg-[var(--stator-surface-2)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelectId(item.id)}
                      aria-label={`Select ${item.name}`}
                      className="text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectActiveItem(item.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] overflow-hidden flex items-center justify-center shrink-0">
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                        ) : item.typeCategory === 'video' ? (
                          <VideoIcon className="w-3.5 h-3.5 text-[var(--stator-fg-muted)]" />
                        ) : item.typeCategory === 'audio' ? (
                          <Music className="w-3.5 h-3.5 text-[var(--stator-fg-muted)]" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-[var(--stator-fg-muted)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--stator-fg)] truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--stator-fg-subtle)] truncate">
                          {item.needsReconnect ? (
                            <span className="text-[var(--stator-warning)]">Reconnect</span>
                          ) : (
                            <>
                              {item.formatBadge} → {item.targetFormat}
                            </>
                          )}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Multi-select contextual actions (Merge / Sprite Sheet) */}
          {(canMergeSelected || canSpriteSheet || (project?.snapshots.length || 0) > 0) && (
            <div className="p-2.5 border-t border-[var(--stator-border)] space-y-1.5">
              {canMergeSelected && (
                <button
                  type="button"
                  onClick={() => {
                    const mode = selectedItems[0].typeCategory === 'audio' ? 'audio' : 'video';
                    onMergeClips(
                      selectedItems.map((i) => i.id),
                      mode,
                      mode === 'audio' ? 'MP3' : 'MP4'
                    );
                  }}
                  className="w-full h-8 px-2.5 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Combine className="w-3.5 h-3.5" />
                  <span>Merge {selectedItems.length} Clips</span>
                </button>
              )}
              {canSpriteSheet && (
                <button
                  type="button"
                  onClick={handleCreateSpriteSheet}
                  className="w-full h-8 px-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                  <span>Sprite Sheet ({selectedItems.length})</span>
                </button>
              )}
              {project && project.snapshots.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSnapshots((s) => !s)}
                    className="w-full h-7 px-2 rounded text-[11px] font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] flex items-center justify-between cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Snapshots ({project.snapshots.length})
                    </span>
                  </button>
                  {showSnapshots && (
                    <div className="mt-1 space-y-1 max-h-28 overflow-y-auto">
                      {project.snapshots.map((snap) => (
                        <button
                          key={snap.id}
                          type="button"
                          onClick={() => onRestoreSnapshot(snap.id)}
                          className="w-full px-2 py-1 rounded bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] text-left text-[11px] text-[var(--stator-fg)] truncate cursor-pointer"
                        >
                          Restore: {snap.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={handleDragResizeLeft}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--stator-border-control)]"
          />
        </aside>
      )}

      {/* CENTER WORKSPACE (CANVAS + CONTEXT-AWARE BOTTOM WORKSPACE) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--stator-bg)] overflow-y-auto">
        {/* Studio Canvas Toolbar */}
        <div className="px-4 py-2 border-b border-[var(--stator-border)] bg-[var(--stator-surface)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {leftCollapsed && (
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                className="hidden xl:inline-flex h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] items-center gap-1 cursor-pointer"
              >
                <PanelLeft className="w-3.5 h-3.5" />
                <span>Bin</span>
              </button>
            )}
            <button
              type="button"
              onClick={onAddFilesClick}
              className="xl:hidden h-7 px-2.5 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Files</span>
            </button>
            {activeItem && (
              <span className="text-xs font-mono text-[var(--stator-fg-muted)] truncate">
                {activeItem.name} · {activeItem.technicalTag || activeItem.sizeFormatted}
              </span>
            )}
            {wasmLoadProgress && (
              <span className="text-[11px] font-mono text-[var(--stator-fg)]">
                {wasmLoadProgress}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {activeItem?.typeCategory === 'image' && activeItem.outputUrl && activeItem.previewUrl && (
              <button
                type="button"
                onClick={() => setCompareMode((m) => (m === 'split' ? 'edit' : 'split'))}
                className={`h-7 px-2.5 rounded border text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                  compareMode === 'split'
                    ? 'bg-[var(--stator-cta-bg)] text-[var(--stator-cta-fg)] border-transparent'
                    : 'bg-[var(--stator-surface-2)] border-[var(--stator-border-control)] text-[var(--stator-fg)]'
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                <span>{compareMode === 'split' ? 'Comparing Output' : 'Edit Canvas'}</span>
              </button>
            )}

            {rightCollapsed && (
              <button
                type="button"
                onClick={() => setRightCollapsed(false)}
                className="hidden lg:inline-flex h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] items-center gap-1 cursor-pointer"
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span>Inspector</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Asset Strip (when Media Bin rail is collapsed below xl) */}
        {queue.length > 1 && (
          <div className="xl:hidden px-4 py-2 border-b border-[var(--stator-border)] bg-[var(--stator-surface)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {queue.map((item) => {
              const isActive = activeItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectActiveItem(item.id)}
                  className={`h-7 px-2.5 rounded-md border text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[var(--stator-cta-bg)] border-transparent text-[var(--stator-cta-fg)]'
                      : 'bg-[var(--stator-surface-2)] border-[var(--stator-border)] text-[var(--stator-fg-muted)]'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Central Media Viewport */}
        <div className="p-4 sm:p-5 space-y-4">
          {activeTool === 'compressor' && queue.length > 0 && (
            <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Minimize2 className="w-4 h-4 text-[var(--stator-fg)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--stator-fg)]">
                    Batch Size Optimization ·{' '}
                    <span className="font-mono tabular-nums text-[var(--stator-fg-muted)]">
                      {formatFileSize(queue.reduce((sum, i) => sum + (i.sizeBytes || 0), 0))} source
                    </span>
                  </p>
                  <p className="text-[11px] text-[var(--stator-fg-subtle)]">
                    Apply a compression profile across {activeItem ? activeItem.name : 'queued items'} or set a Target MB cap in the Inspector.
                  </p>
                </div>
              </div>
              {activeItem && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {(['smaller', 'balanced', 'highest'] as CompressionGoal[]).map((goal) => {
                    const isCurrent = (activePreset.compressionGoal || 'balanced') === goal;
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() =>
                          onUpdatePresetSettings(
                            activeItem.id,
                            applyCompressionGoalToPreset(activePreset, goal, activeItem.typeCategory),
                            `Compressor: ${goal}`
                          )
                        }
                        className={`h-7 px-2.5 rounded-md border text-[11px] font-medium capitalize cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-[var(--stator-cta-bg)] border-transparent text-[var(--stator-cta-fg)]'
                            : 'bg-[var(--stator-surface-2)] border-[var(--stator-border-control)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                        }`}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {!activeItem ? (
            <div className="rounded-xl border border-dashed border-[var(--stator-border-control)] bg-[var(--stator-surface)] py-16 px-6 text-center space-y-3">
              <p className="text-base font-semibold text-[var(--stator-fg)]">
                Studio Canvas Empty
              </p>
              <p className="text-xs text-[var(--stator-fg-muted)] max-w-md mx-auto">
                Drop video, audio, or image files anywhere here, or load local sample assets to start editing immediately.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onAddFilesClick}
                  className="h-9 px-4 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium cursor-pointer transition-colors"
                >
                  Select Media Files
                </button>
                <button
                  type="button"
                  onClick={onLoadSamples}
                  className="h-9 px-3.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--stator-fg)]" />
                  <span>Load Samples</span>
                </button>
              </div>
            </div>
          ) : activeItem.needsReconnect ? (
            <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] py-14 px-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[var(--stator-warning)] mx-auto" />
              <p className="text-sm font-semibold text-[var(--stator-fg)]">
                Reconnect “{activeItem.name}” to resume editing
              </p>
              <p className="text-xs text-[var(--stator-fg-muted)] max-w-md mx-auto">
                All your non-destructive crop, trim, and compression settings are preserved. Re-select the local file from disk to unlock live preview &amp; export.
              </p>
              <label className="inline-flex h-9 px-4 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium items-center gap-1.5 cursor-pointer transition-colors">
                <span>Choose Local File</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onReconnectFile(activeItem.id, f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          ) : activeItem.typeCategory === 'image' && activeItem.previewUrl ? (
            <div className="rounded-xl bg-[#101112] border border-[#313338] p-3.5 sm:p-4">
              {compareMode === 'split' && activeItem.outputUrl ? (
                <BeforeAfterSlider
                  originalUrl={activeItem.previewUrl}
                  convertedUrl={activeItem.outputUrl}
                  originalLabel={`Original · ${activeItem.sizeFormatted}`}
                  convertedLabel={`${activeItem.targetFormat} · ${activeItem.outputSizeFormatted || ''}`}
                  heightClass="h-[300px] sm:h-[380px]"
                />
              ) : (
                <CropOverlayCanvas
                  imageUrl={activeItem.previewUrl}
                  alt={activeItem.name}
                  cropRect={activePreset.cropRect}
                  onChangeCropRect={(cropRect) =>
                    onUpdatePresetSettings(activeItem.id, { ...activePreset, cropRect }, 'Crop framing')
                  }
                  rotation={activePreset.rotation}
                  flipH={activePreset.flipH}
                  adjustments={activePreset.adjustments}
                  watermark={activePreset.watermark}
                  showCheckerboard={showCheckerboard}
                  onToggleCheckerboard={() => setShowCheckerboard((v) => !v)}
                />
              )}
            </div>
          ) : activeItem.typeCategory === 'video' && mediaObjectUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl bg-[#101112] border border-[#313338] overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={activeItem.outputUrl || mediaObjectUrl}
                  controls
                  onTimeUpdate={(e) => setMediaCurrentSec(e.currentTarget.currentTime)}
                  className="w-full max-h-[380px] object-contain"
                />
                {activeSubtitleCue && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 max-w-[85%] px-3 py-1 rounded bg-black/80 text-white text-xs sm:text-sm font-medium text-center pointer-events-none">
                    {activeSubtitleCue.text}
                  </div>
                )}
              </div>

              {/* Context-Aware Video Timeline */}
              <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-[var(--stator-fg-muted)] tabular-nums">
                    Playhead: {mediaCurrentSec.toFixed(1)}s / {(activeItem.durationSeconds || 0).toFixed(1)}s
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePresetSettings(
                          activeItem.id,
                          { ...activePreset, trimStart: Number(mediaCurrentSec.toFixed(2)) },
                          'Set In trim'
                        )
                      }
                      className="h-7 px-2.5 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[11px] font-mono text-[var(--stator-fg)] cursor-pointer"
                    >
                      In ({(activePreset.trimStart || 0).toFixed(1)}s)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePresetSettings(
                          activeItem.id,
                          { ...activePreset, trimEnd: Number(mediaCurrentSec.toFixed(2)) },
                          'Set Out trim'
                        )
                      }
                      className="h-7 px-2.5 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[11px] font-mono text-[var(--stator-fg)] cursor-pointer"
                    >
                      Out ({(activePreset.trimEnd || activeItem.durationSeconds || 0).toFixed(1)}s)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSplitClip(activeItem.id, mediaCurrentSec)}
                      className="h-7 px-2.5 rounded bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border-control)] text-[11px] font-medium text-[var(--stator-fg)] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>Split at Playhead</span>
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, activeItem.durationSeconds || 10)}
                  step={0.1}
                  value={mediaCurrentSec}
                  onChange={(e) => {
                    const sec = Number(e.target.value);
                    setMediaCurrentSec(sec);
                    if (videoRef.current) videoRef.current.currentTime = sec;
                  }}
                  aria-label="Video timeline scrub"
                  className="w-full stator-slider"
                />
              </div>
            </div>
          ) : activeItem.typeCategory === 'audio' && mediaObjectUrl ? (
            <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--stator-fg)]">{activeItem.name}</p>
                  <p className="text-xs font-mono text-[var(--stator-fg-muted)]">
                    {activeItem.duration || 'Audio Stream'} · {activeItem.sizeFormatted}
                  </p>
                </div>
                <audio
                  ref={audioRef}
                  src={activeItem.outputUrl || mediaObjectUrl}
                  controls
                  onTimeUpdate={(e) => setMediaCurrentSec(e.currentTarget.currentTime)}
                  className="h-9 max-w-full"
                />
              </div>

              <AudioWaveformBar
                file={activeItem.file}
                durationSeconds={activeItem.durationSeconds}
                currentTimeSec={mediaCurrentSec}
                trimStartSec={activePreset.trimStart || 0}
                trimEndSec={activePreset.trimEnd}
                onSeek={(sec) => {
                  setMediaCurrentSec(sec);
                  if (audioRef.current) audioRef.current.currentTime = sec;
                }}
                onChangeTrim={(start, end) =>
                  onUpdatePresetSettings(
                    activeItem.id,
                    { ...activePreset, trimStart: start, trimEnd: end },
                    'Audio trim'
                  )
                }
                onEnableSilenceRemoval={() =>
                  onUpdatePresetSettings(
                    activeItem.id,
                    { ...activePreset, removeSilence: true },
                    'Remove silent gaps'
                  )
                }
              />
            </div>
          ) : null}

          {/* Batch Queue Ledger (shown only when 2+ files or Batch tool active) */}
          {showBatchTable && queue.length > 0 && (
            <section className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--stator-border)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-medium text-[var(--stator-fg-muted)]">
                    Batch Queue ({queue.length})
                  </h3>
                  {queue.some((i) => i.typeCategory === 'image') && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) onBatchUpdateFormat('image', e.target.value);
                        e.target.value = '';
                      }}
                      aria-label="Bulk set all image formats"
                      className="h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[11px] text-[var(--stator-fg)] cursor-pointer"
                    >
                      <option value="">All Images → …</option>
                      {TARGET_FORMAT_OPTIONS.image.map((f) => (
                        <option key={f} value={f}>
                          All Images → {f}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="h-7 px-2.5 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[11px] font-medium text-[var(--stator-fg)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  {readyCount > 0 && (
                    <button
                      type="button"
                      onClick={onConvertAll}
                      className="h-7 px-3 rounded bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Convert All ({readyCount})</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-[var(--stator-border)]">
                {queue.map((item, idx) => {
                  const isActiveRow = activeItem?.id === item.id;
                  const formats = TARGET_FORMAT_OPTIONS[item.typeCategory] || [];
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectActiveItem(item.id)}
                      className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isActiveRow
                          ? 'bg-[var(--stator-surface-2)]'
                          : 'hover:bg-[var(--stator-surface-2)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-[var(--stator-fg-subtle)] w-4">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[var(--stator-fg)] truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)] truncate">
                            {item.sizeFormatted}
                            {item.status === 'converting'
                              ? ` · ${item.progress}%`
                              : item.status === 'completed'
                              ? ` · ${item.reductionBadge || 'Done'}`
                              : item.status === 'error'
                              ? ` · ${item.errorMessage}`
                              : ` · ${item.preset || 'Ready'}`}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={item.targetFormat}
                          onChange={(e) => onUpdateTargetFormat(item.id, e.target.value)}
                          aria-label={`Format for ${item.name}`}
                          className="h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[11px] font-mono text-[var(--stator-fg)] cursor-pointer"
                        >
                          {formats.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onReorderItem(item.id, 'up')}
                          aria-label="Move up"
                          className="p-1 text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === queue.length - 1}
                          onClick={() => onReorderItem(item.id, 'down')}
                          aria-label="Move down"
                          className="p-1 text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] disabled:opacity-25 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="p-1 text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* RIGHT CONTEXTUAL INSPECTOR */}
      {!rightCollapsed && (
        <aside
          style={{ '--stator-right-w': `${rightWidth}px` } as React.CSSProperties}
          className="w-full lg:w-[var(--stator-right-w)] shrink-0 bg-[var(--stator-surface)] border-t lg:border-t-0 lg:border-l border-[var(--stator-border)] relative flex flex-col"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            onPointerDown={handleDragResizeRight}
            className="hidden lg:block absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-[var(--stator-border-control)] z-10"
          />
          <div className="px-4 py-2.5 border-b border-[var(--stator-border)] flex items-center justify-between shrink-0">
            <span className="text-xs font-medium text-[var(--stator-fg-muted)] capitalize">
              Inspector {activeItem ? `· ${activeItem.typeCategory}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setRightCollapsed(true)}
              title="Collapse Inspector"
              aria-label="Collapse Inspector"
              className="hidden lg:inline-flex p-1 rounded hover:bg-[var(--stator-surface-2)] text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] cursor-pointer"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <StudioInspector
              item={activeItem}
              onUpdateTargetFormat={onUpdateTargetFormat}
              onUpdatePresetSettings={onUpdatePresetSettings}
              onStartConversion={onStartConversion}
              onCancelConversion={onCancelConversion}
              onReconnectFile={onReconnectFile}
              onGenerateIconPack={handleGenerateIconPack}
              onExtractVideoFrame={handleExtractFrame}
              onReplaceVideoAudio={onReplaceVideoAudio}
              onToast={onToast}
            />
          </div>
        </aside>
      )}
    </div>
  );
};
