import React, { useState } from 'react';
import {
  Menu,
  ChevronRight,
  Undo2,
  Redo2,
  Command,
  Sun,
  Moon,
  Monitor,
  Download,
  Camera,
  Check,
  Pencil,
} from 'lucide-react';
import { ThemeMode } from '../../lib/theme.ts';
import { PWAInstallButton } from '../PWAInstallButton.tsx';

export interface TopBarProps {
  viewTitle: string;
  isStudioView: boolean;
  projectName?: string;
  onRenameProject?: (nextName: string) => void;
  onNavigateHome: () => void;
  saveStatus: 'saved' | 'saving' | 'ephemeral' | 'unsaved';
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  onUndo: () => void;
  onRedo: () => void;
  onSaveSnapshot?: () => void;
  onOpenCommandPalette: () => void;
  onOpenExportCenter: () => void;
  readyCount: number;
  completedCount: number;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onOpenMobileSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewTitle,
  isStudioView,
  projectName,
  onRenameProject,
  onNavigateHome,
  saveStatus,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onSaveSnapshot,
  onOpenCommandPalette,
  onOpenExportCenter,
  readyCount,
  completedCount,
  theme,
  onThemeChange,
  onOpenMobileSidebar,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(projectName || '');

  const commitRename = () => {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== projectName && onRenameProject) {
      onRenameProject(trimmed);
    }
  };

  const cycleTheme = () => {
    const next: ThemeMode = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    onThemeChange(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel =
    theme === 'dark'
      ? 'Obsidian Dark'
      : theme === 'light'
      ? 'Soft Titanium Light'
      : 'System Theme';

  return (
    <header className="h-14 w-full bg-[var(--stator-surface)] border-b border-[var(--stator-border)] px-3 sm:px-5 flex items-center justify-between gap-3 sticky top-0 z-20 shrink-0">
      {/* Left: Mobile drawer + Breadcrumb / Editable Project Title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation sidebar"
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--stator-border)] bg-[var(--stator-surface-2)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        {isStudioView && projectName ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hidden sm:inline text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer shrink-0"
            >
              Workspace
            </button>
            <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-[var(--stator-fg-subtle)] shrink-0" />
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  autoFocus
                  aria-label="Project name"
                  className="h-7 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-accent)] text-xs font-semibold text-[var(--stator-fg)] w-44 sm:w-60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={commitRename}
                  aria-label="Save name"
                  className="p-1 text-[var(--stator-success)] cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftName(projectName);
                  setEditingName(true);
                }}
                title="Click to rename project"
                className="group inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-[var(--stator-surface-2)] text-xs sm:text-sm font-semibold text-[var(--stator-fg)] truncate max-w-[200px] sm:max-w-[300px] cursor-pointer"
              >
                <span className="truncate">{projectName}</span>
                <Pencil className="w-3 h-3 text-[var(--stator-fg-subtle)] opacity-0 group-hover:opacity-100 shrink-0" />
              </button>
            )}

            <span className="hidden lg:inline-block whitespace-nowrap shrink-0 text-[11px] font-mono text-[var(--stator-fg-subtle)] ml-1.5 px-2 py-0.5 rounded bg-[var(--stator-surface-2)]">
              {saveStatus === 'ephemeral'
                ? 'Ephemeral'
                : saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'unsaved'
                ? 'Manual save'
                : 'Saved locally'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-[var(--stator-fg)] truncate">
              {viewTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Right: Studio Edit Controls + Utilities + Primary Export */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isStudioView && (
          <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-[var(--stator-border)]">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title={undoLabel ? `Undo ${undoLabel}` : 'Nothing to undo'}
              aria-label="Undo edit"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title={redoLabel ? `Redo ${redoLabel}` : 'Nothing to redo'}
              aria-label="Redo edit"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            {onSaveSnapshot && (
              <button
                type="button"
                onClick={onSaveSnapshot}
                title="Save non-destructive project snapshot"
                aria-label="Save project snapshot"
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] inline-flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Snapshot</span>
              </button>
            )}
          </div>
        )}

        <PWAInstallButton />

        <button
          type="button"
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl/Cmd+K)"
          aria-label="Open Command Palette"
          className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[11px] font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] inline-flex items-center gap-1 cursor-pointer"
        >
          <Command className="w-3 h-3" />
          <span className="hidden sm:inline">K</span>
        </button>

        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${themeLabel} (click to cycle)`}
          aria-label={`Theme: ${themeLabel}`}
          className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ThemeIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px] capitalize">{theme}</span>
        </button>

        <button
          type="button"
          onClick={onOpenExportCenter}
          className="h-8 px-3 sm:px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
          {(completedCount > 0 || readyCount > 0) && (
            <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-white/20">
              {completedCount > 0 ? completedCount : readyCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
