import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Download,
  FolderOutput,
  Archive,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Clock,
} from 'lucide-react';
import { DEFAULT_PRESET_SETTINGS, QueueItem } from '../../types/queue.ts';
import { STATOR_TRANSITION } from '../../lib/motion.ts';
import { ffmpegManager } from '../../utils/ffmpegManager.ts';

export interface ExportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
  filenameTemplate: string;
  onUpdateFilenameTemplate: (tmpl: string) => void;
  onConvertAll: () => void;
  onRetryItem: (id: string) => void;
  onExportZip: () => void;
  onExportFolder: () => void;
  onToast: (msg: string) => void;
}

export const ExportCenterModal: React.FC<ExportCenterModalProps> = ({
  isOpen,
  onClose,
  queue,
  filenameTemplate,
  onUpdateFilenameTemplate,
  onConvertAll,
  onRetryItem,
  onExportZip,
  onExportFolder,
  onToast,
}) => {
  const [multiResBusy, setMultiResBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const readyItems = queue.filter((i) => (i.status === 'ready' || i.status === 'error') && !i.needsReconnect);
  const convertingItems = queue.filter((i) => i.status === 'converting');
  const completedItems = queue.filter((i) => i.status === 'completed');
  const firstVideo = queue.find((i) => i.typeCategory === 'video' && i.file);

  const handleMultiResExport = async () => {
    if (!firstVideo?.file) return;
    try {
      setMultiResBusy('Starting...');
      const out = await ffmpegManager.exportMultiResolutionZip(
        firstVideo.file,
        ['1080p', '720p', '480p'],
        firstVideo.presetSettings || DEFAULT_PRESET_SETTINGS,
        (label, pct) => setMultiResBusy(`${label} · ${pct}%`)
      );
      const a = document.createElement('a');
      a.href = out.url;
      a.download = out.filename;
      a.click();
      URL.revokeObjectURL(out.url);
      onToast(`Exported ${out.filename}`);
    } catch (err: any) {
      onToast(err?.message || 'Multi-resolution ZIP export failed');
    } finally {
      setMultiResBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Export Center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATOR_TRANSITION.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={STATOR_TRANSITION.overlay}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
          >
            <div className="px-5 py-3.5 border-b border-[var(--stator-border)] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--stator-fg)]">Export Center</h2>
                <p className="text-[11px] font-mono tabular-nums text-[var(--stator-fg-subtle)]">
                  {completedItems.length} completed · {convertingItems.length} active · {readyItems.length} pending
                </p>
              </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Export Center"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Naming Template & Multi-Res Tool */}
        <div className="px-5 py-3.5 border-b border-[var(--stator-border)] bg-[var(--stator-surface-2)]/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-medium text-[var(--stator-fg)]">
              Output Naming Pattern
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={filenameTemplate}
                onChange={(e) => onUpdateFilenameTemplate(e.target.value)}
                aria-label="Filename template"
                className="h-8 px-2.5 rounded-md bg-[var(--stator-surface)] border border-[var(--stator-border)] text-xs font-mono text-[var(--stator-fg)] w-48"
              />
              {['{name}', '{name}_stator', '{name}_{format}'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onUpdateFilenameTemplate(preset)}
                  className="hidden sm:inline-block px-2 py-1 rounded bg-[var(--stator-surface)] border border-[var(--stator-border)] text-[10px] font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {firstVideo && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--stator-border)]">
              <div className="text-xs text-[var(--stator-fg-muted)] flex items-center gap-2 min-w-0">
                <Film className="w-3.5 h-3.5 text-[var(--stator-accent-fg)] shrink-0" />
                <span className="truncate">
                  Multi-Resolution Export for <strong className="text-[var(--stator-fg)]">{firstVideo.name}</strong>
                </span>
              </div>
              <button
                type="button"
                disabled={Boolean(multiResBusy)}
                onClick={handleMultiResExport}
                className="h-7 px-3 rounded-md bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[11px] font-medium text-[var(--stator-fg)] shrink-0 cursor-pointer disabled:opacity-50"
              >
                {multiResBusy || 'Export 1080p + 720p + 480p ZIP'}
              </button>
            </div>
          )}
        </div>

        {/* Queue Status List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--stator-border)]">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--stator-fg-muted)]">
              No files staged in this Studio workspace yet.
            </div>
          ) : (
            queue.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--stator-success)] shrink-0" />
                  ) : item.status === 'converting' ? (
                    <Loader2 className="w-4 h-4 text-[var(--stator-accent-fg)] animate-spin shrink-0" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-[var(--stator-danger)] shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[var(--stator-fg-subtle)] shrink-0" />
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--stator-fg)] truncate">
                      {item.outputName || item.name}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)] truncate">
                      {item.targetFormat}
                      {item.status === 'completed' && item.outputSizeFormatted
                        ? ` · ${item.outputSizeFormatted} · ${item.reductionBadge || ''}`
                        : item.status === 'converting'
                        ? ` · ${item.progress}% ${item.eta || ''}`
                        : item.status === 'error'
                        ? ` · ${item.errorMessage || 'Error'}`
                        : item.needsReconnect
                        ? ' · Reconnect needed'
                        : ' · Queued'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === 'completed' && item.outputUrl ? (
                    <a
                      href={item.outputUrl}
                      download={item.outputName || item.name}
                      className="h-7 px-2.5 rounded-md bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save</span>
                    </a>
                  ) : item.status === 'error' || item.status === 'ready' ? (
                    <button
                      type="button"
                      disabled={item.needsReconnect}
                      onClick={() => onRetryItem(item.id)}
                      className="h-7 px-2.5 rounded-md bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[11px] font-medium text-[var(--stator-fg)] inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      {item.status === 'error' ? <RotateCcw className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{item.status === 'error' ? 'Retry' : 'Run'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[var(--stator-border)] bg-[var(--stator-surface)] flex flex-wrap items-center justify-between gap-2">
          {readyItems.length > 0 ? (
            <button
              type="button"
              onClick={onConvertAll}
              className="h-9 px-4 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run Pending ({readyItems.length})</span>
            </button>
          ) : (
            <span className="text-xs text-[var(--stator-fg-muted)]">All eligible jobs processed</span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={completedItems.length === 0}
              onClick={onExportFolder}
              className="h-9 px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <FolderOutput className="w-3.5 h-3.5" />
              <span>Save to Folder</span>
            </button>
            <button
              type="button"
              disabled={completedItems.length === 0}
              onClick={onExportZip}
              className="h-9 px-3.5 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
