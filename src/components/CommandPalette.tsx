import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Maximize2,
  List,
  FolderOpen,
  Sparkles,
  Zap,
  Film,
  History,
  Settings2,
  HelpCircle,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react';
import { WorkspaceViewMode } from './layout/Header.tsx';
import { STATOR_SPRING, STATOR_TRANSITION } from '../lib/motion.ts';

export interface CommandPaletteAction {
  id: string;
  label: string;
  section: 'Workspace' | 'Conversion & Files' | 'Preferences & Navigation';
  shortcut?: string;
  keywords?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  hasQueuedFiles: boolean;
  readyCount: number;
  stageViewMode: 'stage' | 'queue';
  onSetStageViewMode: (mode: 'stage' | 'queue') => void;
  workspaceMode: WorkspaceViewMode;
  onSetWorkspaceMode: (mode: WorkspaceViewMode) => void;
  onChooseFiles: () => void;
  onLoadSamples: () => void;
  onConvertAll: () => void;
  onClearQueue: () => void;
  onOpenPresets: () => void;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  hasQueuedFiles,
  readyCount,
  stageViewMode,
  onSetStageViewMode,
  workspaceMode,
  onSetWorkspaceMode,
  onChooseFiles,
  onLoadSamples,
  onConvertAll,
  onClearQueue,
  onOpenPresets,
  onOpenHistory,
  onOpenHelp,
  onToggleTheme,
  isDark,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const items: CommandPaletteAction[] = [
      {
        id: 'switch-stage',
        label: 'Switch to Focus Canvas (Darkroom HUD)',
        section: 'Workspace',
        shortcut: stageViewMode === 'stage' && workspaceMode === 'converter' ? 'Active' : 'C',
        keywords: 'stage darkroom canvas focus hud preview single',
        icon: <Maximize2 className="w-4 h-4" />,
        disabled: !hasQueuedFiles,
        onSelect: () => {
          onSetWorkspaceMode('converter');
          onSetStageViewMode('stage');
        },
      },
      {
        id: 'switch-queue',
        label: 'Switch to Batch Ledger View',
        section: 'Workspace',
        shortcut: stageViewMode === 'queue' && workspaceMode === 'converter' ? 'Active' : 'L',
        keywords: 'queue batch ledger list table rows',
        icon: <List className="w-4 h-4" />,
        disabled: !hasQueuedFiles,
        onSelect: () => {
          onSetWorkspaceMode('converter');
          onSetStageViewMode('queue');
        },
      },
      {
        id: 'switch-gif-studio',
        label:
          workspaceMode === 'gif-studio'
            ? 'Return to Media Converter'
            : 'Open GIF Sequence Studio',
        section: 'Workspace',
        keywords: 'gif studio maker palette recipe sequence',
        icon: <Film className="w-4 h-4" />,
        onSelect: () =>
          onSetWorkspaceMode(workspaceMode === 'gif-studio' ? 'converter' : 'gif-studio'),
      },
      {
        id: 'open-history',
        label: 'Open History & Privacy Ledger',
        section: 'Workspace',
        keywords: 'indexeddb cache archive downloads history ephemeral',
        icon: <History className="w-4 h-4" />,
        onSelect: () => {
          onSetWorkspaceMode('history');
          onOpenHistory();
        },
      },
      {
        id: 'open-help',
        label: 'Open Architecture & Technical Guide',
        section: 'Workspace',
        keywords: 'faq documentation ffmpeg privacy guide',
        icon: <HelpCircle className="w-4 h-4" />,
        onSelect: () => {
          onSetWorkspaceMode('guide');
          onOpenHelp();
        },
      },
      {
        id: 'choose-files',
        label: 'Choose Media Files from Disk',
        section: 'Conversion & Files',
        shortcut: 'O',
        keywords: 'upload add open file browse',
        icon: <FolderOpen className="w-4 h-4" />,
        onSelect: onChooseFiles,
      },
      {
        id: 'load-samples',
        label: 'Load Sample Test Media',
        section: 'Conversion & Files',
        keywords: 'demo test synthetic sample wav png',
        icon: <Sparkles className="w-4 h-4" />,
        onSelect: onLoadSamples,
      },
      {
        id: 'convert-all',
        label: `Convert All Staged Files${readyCount > 0 ? ` (${readyCount} ready)` : ''}`,
        section: 'Conversion & Files',
        keywords: 'run start encode transcode batch',
        icon: <Zap className="w-4 h-4" />,
        disabled: !hasQueuedFiles,
        onSelect: onConvertAll,
      },
      {
        id: 'clear-queue',
        label: 'Clear Current Queue',
        section: 'Conversion & Files',
        keywords: 'reset remove empty queue',
        icon: <Trash2 className="w-4 h-4" />,
        disabled: !hasQueuedFiles,
        onSelect: onClearQueue,
      },
      {
        id: 'open-presets',
        label: 'Configure Global Default Presets',
        section: 'Preferences & Navigation',
        keywords: 'settings defaults quality crf',
        icon: <Settings2 className="w-4 h-4" />,
        onSelect: onOpenPresets,
      },
      {
        id: 'toggle-theme',
        label: isDark ? 'Switch to Light Alabaster Studio' : 'Switch to Dark Carbon Obsidian',
        section: 'Preferences & Navigation',
        shortcut: 'T',
        keywords: 'theme light dark color appearance',
        icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        onSelect: onToggleTheme,
      },
    ];
    return items.filter((item) => !item.disabled);
  }, [
    hasQueuedFiles,
    readyCount,
    stageViewMode,
    workspaceMode,
    isDark,
    onSetStageViewMode,
    onSetWorkspaceMode,
    onChooseFiles,
    onLoadSamples,
    onConvertAll,
    onClearQueue,
    onOpenPresets,
    onOpenHistory,
    onToggleTheme,
    onOpenHelp,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q) ||
        (a.keywords && a.keywords.toLowerCase().includes(q))
    );
  }, [actions, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filtered.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].onSelect();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={STATOR_TRANSITION.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/55 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={STATOR_TRANSITION.overlay}
            className="w-full max-w-lg rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--stator-border)] flex items-center gap-3">
              <Search className="w-4 h-4 text-[var(--stator-fg-subtle)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search studio actions, views, or presets…"
                aria-label="Search commands"
                className="w-full bg-transparent text-sm text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-subtle)] focus:outline-none"
              />
              <kbd className="text-[10px] font-mono text-[var(--stator-fg-subtle)] px-1.5 py-0.5 rounded border border-[var(--stator-border)] bg-[var(--stator-surface-2)] shrink-0">
                ESC
              </kbd>
            </div>

            <div className="max-h-[340px] overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--stator-fg-muted)]">
                  No matching studio commands
                </p>
              ) : (
                filtered.map((action, idx) => {
                  const isHighlighted = idx === selectedIndex;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        action.onSelect();
                        onClose();
                      }}
                      className="relative w-full px-3 py-2.5 rounded-lg text-left text-xs flex items-center justify-between gap-3 cursor-pointer"
                    >
                      {isHighlighted && (
                        <motion.span
                          layoutId="stator-cmd-highlight"
                          transition={STATOR_SPRING.tactile}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg bg-[var(--stator-accent-soft)]"
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <span
                          className={
                            isHighlighted
                              ? 'text-[var(--stator-accent-fg)]'
                              : 'text-[var(--stator-fg-subtle)]'
                          }
                        >
                          {action.icon}
                        </span>
                        <span className="font-medium text-[var(--stator-fg)] truncate">
                          {action.label}
                        </span>
                      </div>
                      <div className="relative z-10 flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[var(--stator-fg-subtle)]">
                          {action.section}
                        </span>
                        {action.shortcut && (
                          <span className="font-mono text-[10px] text-[var(--stator-fg-muted)] px-1.5 py-0.5 rounded border border-[var(--stator-border)] bg-[var(--stator-surface)]">
                            {action.shortcut}
                          </span>
                        )}
                      </div>
                    </button>
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
