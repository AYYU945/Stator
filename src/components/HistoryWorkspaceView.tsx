import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  Trash2,
  Download,
  Camera,
  Video,
  Music,
  FileText,
  FileBox,
  Shield,
  HardDrive,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { HistoryEntry, formatRelativeTime } from '../types/history.ts';
import { FileTypeCategory, formatFileSize } from '../types/queue.ts';
import { getHistoryStorageUsage } from '../utils/historyStorage.ts';
import { STATOR_SPRING, STATOR_TRANSITION, getRowStaggerDelay } from '../lib/motion.ts';
import { ToggleSwitch } from './ui/Primitives.tsx';

export interface HistoryWorkspaceViewProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onDeleteEntry: (id: string) => void;
  ephemeralMode?: boolean;
  onToggleEphemeralMode?: (enabled: boolean) => void;
  onWipeAllData?: () => void;
  onBackToConverter: () => void;
}

type HistoryFilter = 'all' | 'image' | 'video' | 'audio';

export const HistoryWorkspaceView: React.FC<HistoryWorkspaceViewProps> = ({
  history,
  onClearHistory,
  onDeleteEntry,
  ephemeralMode = false,
  onToggleEphemeralMode,
  onWipeAllData,
  onBackToConverter,
}) => {
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HistoryFilter>('all');

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return history.filter((entry) => {
      const matchesCategory =
        categoryFilter === 'all' || entry.typeCategory === categoryFilter;
      const matchesQuery =
        !query ||
        entry.convertedName.toLowerCase().includes(query) ||
        entry.originalName.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [history, searchQuery, categoryFilter]);

  const usage = getHistoryStorageUsage(history);

  const handleDownloadEntry = (entry: HistoryEntry) => {
    let url = entry.outputBlobUrl;
    let shouldRevoke = false;

    if (!url && entry.blob) {
      url = URL.createObjectURL(entry.blob);
      shouldRevoke = true;
    }
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = entry.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (shouldRevoke) {
      URL.revokeObjectURL(url);
    }
  };

  const renderIcon = (category: FileTypeCategory) => {
    const Icon =
      category === 'video'
        ? Video
        : category === 'audio'
        ? Music
        : category === 'document'
        ? FileText
        : category === 'other'
        ? FileBox
        : Camera;
    return (
      <div className="w-9 h-9 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[var(--stator-fg-muted)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>
    );
  };

  return (
    <section
      aria-label="Local Conversion History & Privacy Ledger"
      className="w-full py-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--stator-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--stator-fg-subtle)] mb-2">
            <button
              type="button"
              onClick={onBackToConverter}
              className="inline-flex items-center gap-1 text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
            <span aria-hidden="true">/</span>
            <span>IndexedDB Local Cache</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)]">
            History &amp; Privacy Controls
          </h1>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1">
            Converted files are cached strictly inside your browser’s local IndexedDB up to a 250
            MB LRU ceiling.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="min-h-[38px] px-3.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] cursor-pointer transition-colors active:scale-[0.98]"
            >
              Clear History ({history.length})
            </button>
          )}

          {onWipeAllData &&
            (confirmWipe ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onWipeAllData();
                    setConfirmWipe(false);
                  }}
                  className="min-h-[38px] px-3.5 rounded-lg bg-[var(--stator-danger)] text-white text-xs font-medium cursor-pointer active:scale-[0.98]"
                >
                  Confirm Full Wipe
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWipe(false)}
                  className="min-h-[38px] px-3 rounded-lg bg-[var(--stator-surface-2)] text-[var(--stator-fg)] text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                className="min-h-[38px] px-3.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 text-[var(--stator-danger)] text-xs font-medium cursor-pointer transition-colors active:scale-[0.98]"
              >
                Wipe All Local Data
              </button>
            ))}
        </div>
      </div>

      {/* Hairline Privacy & Storage Control Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 border-b border-[var(--stator-border)] pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Shield className="w-4 h-4 text-[var(--stator-accent-fg)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--stator-fg)]">
                Ephemeral Privacy Mode
              </h2>
              <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5 leading-relaxed">
                When enabled, converted outputs stay strictly in volatile RAM and never write to
                IndexedDB.
              </p>
            </div>
          </div>
          {onToggleEphemeralMode && (
            <ToggleSwitch
              checked={ephemeralMode}
              onChange={onToggleEphemeralMode}
              ariaLabel="Ephemeral Privacy Mode"
            />
          )}
        </div>

        <div className="flex flex-col justify-center space-y-2.5 md:border-l md:border-[var(--stator-border)] md:pl-6">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--stator-fg)] inline-flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[var(--stator-accent-fg)]" />
              <span>Local Blob Cache Quota (LRU)</span>
            </span>
            <span className="font-mono tabular-nums text-[var(--stator-fg-muted)]">
              {formatFileSize(usage.usedBytes)} / 250 MB ({usage.percentUsed}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--stator-surface-2)] overflow-hidden">
            <div
              className="h-full bg-[var(--stator-accent)] origin-left transition-transform duration-150"
              style={{
                transform: `scaleX(${Math.max(0, Math.min(1, usage.percentUsed / 100))})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Ledger Table & Filters */}
      <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] overflow-hidden">
        {history.length > 0 && (
          <div className="px-4 sm:px-5 py-3 border-b border-[var(--stator-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[var(--stator-fg-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter converted filenames…"
                aria-label="Filter conversion history"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-subtle)]"
              />
            </div>

            <div
              className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)]"
              role="tablist"
              aria-label="Filter history by type"
            >
              {(
                [
                  { id: 'all', label: 'All Formats' },
                  { id: 'image', label: 'Images' },
                  { id: 'video', label: 'Video' },
                  { id: 'audio', label: 'Audio' },
                ] as const
              ).map((tab) => {
                const isActive = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`relative px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'text-white'
                        : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="stator-history-filter"
                        transition={STATOR_SPRING.tactile}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-md bg-[var(--stator-accent)]"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <div className="py-16 px-6 text-center max-w-md mx-auto">
            <div className="w-11 h-11 mx-auto rounded-xl bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-subtle)] mb-3">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--stator-fg)]">
              {ephemeralMode ? 'Ephemeral Privacy Mode is Active' : 'No Local History Recorded Yet'}
            </h3>
            <p className="text-xs text-[var(--stator-fg-muted)] mt-1 leading-relaxed">
              {ephemeralMode
                ? 'Converted files remain strictly inside your active session queue and are never persisted to disk.'
                : 'Files you convert locally appear in this ledger with one-click re-download up to the 250 MB cache cap.'}
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--stator-fg-subtle)]">
            No matching records for “{searchQuery || categoryFilter}”.
          </div>
        ) : (
          <div className="divide-y divide-[var(--stator-border)]">
            <AnimatePresence initial={false}>
              {filteredHistory.map((entry, idx) => {
                const hasPayload = Boolean(entry.outputBlobUrl || entry.blob);
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{
                      duration: STATOR_TRANSITION.micro.duration,
                      delay: getRowStaggerDelay(idx),
                    }}
                    className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4 hover:bg-[var(--stator-surface-2)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {renderIcon(entry.typeCategory)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-[var(--stator-fg)] text-sm truncate">
                            {entry.convertedName}
                          </span>
                          <span className="text-xs font-mono text-[var(--stator-fg-subtle)] shrink-0">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--stator-fg-muted)] font-mono mt-0.5 tabular-nums">
                          <span>
                            {entry.originalSizeFormatted} → {entry.outputSizeFormatted}
                          </span>
                          {entry.savingsPercent > 0 && (
                            <span className="text-[var(--stator-success)] font-medium">
                              ↓ -{entry.savingsPercent}%
                            </span>
                          )}
                          <span aria-hidden="true" className="text-[var(--stator-border-strong)]">
                            ·
                          </span>
                          <span
                            className={
                              hasPayload
                                ? 'text-[var(--stator-fg-subtle)]'
                                : 'text-[var(--stator-warning)]'
                            }
                          >
                            {hasPayload ? 'Cached in IndexedDB' : 'Blob Evicted by LRU'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={!hasPayload}
                        onClick={() => handleDownloadEntry(entry)}
                        className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors active:scale-[0.98] ${
                          hasPayload
                            ? 'bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white cursor-pointer'
                            : 'bg-[var(--stator-surface-2)] text-[var(--stator-fg-subtle)] cursor-not-allowed opacity-50'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] transition-colors cursor-pointer active:scale-[0.96]"
                        title="Delete Record"
                        aria-label={`Delete ${entry.convertedName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};
