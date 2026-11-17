import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  X,
  Pin,
  PinOff,
  ArrowUpRight,
} from 'lucide-react';
import { NavToolId } from '../types/settings.ts';
import { STATOR_TRANSITION } from '../lib/motion.ts';
import type { NavItemConfig } from './layout/Sidebar.tsx';

export interface ToolsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: NavItemConfig[];
  pinnedTools: NavToolId[];
  recentTools: NavToolId[];
  onSelectTool: (id: NavToolId) => void;
  onTogglePinTool: (id: NavToolId) => void;
}

export const ToolsDirectoryModal: React.FC<ToolsDirectoryModalProps> = ({
  isOpen,
  onClose,
  tools,
  pinnedTools,
  recentTools,
  onSelectTool,
  onTogglePinTool,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'video' | 'images' | 'audio' | 'workflows'>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setCategory('all');
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const directoryTools = useMemo(() => {
    return tools.filter((t) => t.group === 'Media Tools' || t.group === 'Advanced');
  }, [tools]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directoryTools.filter((item) => {
      const catOk =
        category === 'all' ||
        (category === 'video' && (item.id === 'video' || item.id === 'gif-studio')) ||
        (category === 'images' && item.id === 'images') ||
        (category === 'audio' && item.id === 'audio') ||
        (category === 'workflows' &&
          ['converter', 'compressor', 'batch', 'quality-lab', 'pipelines', 'presets'].includes(item.id));
      const queryOk =
        !q ||
        item.label.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.keywords.toLowerCase().includes(q);
      return catOk && queryOk;
    });
  }, [directoryTools, query, category]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Browse all tools"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATOR_TRANSITION.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={STATOR_TRANSITION.overlay}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] shadow-2xl overflow-hidden flex flex-col max-h-[84vh]"
          >
            <div className="px-5 py-4 border-b border-[var(--stator-border)] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--stator-fg)]">All Studio Tools</h2>
                <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5">
                  Launch any local encoder, inspector, or workflow, or pin favorites to your sidebar.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close tools directory"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-[var(--stator-border)] space-y-3 bg-[var(--stator-bg)]/60">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--stator-fg-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search video trim, AVIF, LUFS audio, GIF, batch…"
                  aria-label="Search tools directory"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border-control)] text-sm text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-muted)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All Tools' },
                    { id: 'workflows', label: 'Convert & Optimize' },
                    { id: 'video', label: 'Video & Motion' },
                    { id: 'images', label: 'Images' },
                    { id: 'audio', label: 'Audio' },
                  ] as const
                ).map((tab) => {
                  const active = category === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategory(tab.id)}
                      className={`h-7 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--stator-cta-bg)] text-[var(--stator-cta-fg)]'
                          : 'bg-[var(--stator-surface)] border border-[var(--stator-border)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filtered.length === 0 ? (
                <div className="sm:col-span-2 py-10 text-center text-sm text-[var(--stator-fg-muted)]">
                  No matching tools found for “{query}”.
                </div>
              ) : (
                filtered.map((item) => {
                  const Icon = item.icon;
                  const isPinned = pinnedTools.includes(item.id);
                  const isRecent = recentTools.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="group rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] hover:border-[var(--stator-border-control)] p-3.5 flex items-start justify-between gap-3 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTool(item.id);
                          onClose();
                        }}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg)] shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-[var(--stator-fg)] truncate">
                              {item.label}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--stator-fg-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5 line-clamp-2">
                            {item.description || item.group}
                          </p>
                          {isRecent && (
                            <p className="text-[11px] text-[var(--stator-fg-muted)] mt-1">
                              Recently used
                            </p>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onTogglePinTool(item.id)}
                        title={isPinned ? 'Remove from favorites' : 'Pin to favorites'}
                        aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isPinned
                            ? 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)] border border-[var(--stator-border-control)]'
                            : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]'
                        }`}
                      >
                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
