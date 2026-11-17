import React, { useState } from 'react';
import {
  Menu,
  ChevronRight,
  Undo2,
  Redo2,
  Command,
  Sun,
  Moon,
  Download,
  Camera,
  Check,
  Pencil,
  Plus,
} from 'lucide-react';
import { ThemeMode } from '../../lib/theme.ts';
import { PWAInstallButton } from '../PWAInstallButton.tsx';

export interface TopBarProps {
  viewTitle: string;
  isStudioView: boolean;
  isHomeView: boolean;
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
  onOpenNewProjectModal: () => void;
  readyCount: number;
  completedCount: number;
  theme: ThemeMode;
  isDark: boolean;
  onThemeChange: (mode: ThemeMode) => void;
  onOpenMobileSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewTitle,
  isStudioView,
  isHomeView,
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
  onOpenNewProjectModal,
  readyCount,
  completedCount,
  isDark,
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

  const toggleLightDark = () => {
    onThemeChange(isDark ? 'light' : 'dark');
  };

  const showContextualExport = isStudioView || completedCount > 0 || readyCount > 0;
  const activeCount = completedCount > 0 ? completedCount : readyCount;

  return (
    <header className="h-14 w-full bg-[var(--stator-surface)] border-b border-[var(--stator-border)] px-3.5 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 shrink-0">
      {/* Left: Mobile drawer + Breadcrumb / Editable Project Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation sidebar"
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--stator-border-control)] bg-[var(--stator-surface)] text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer shrink-0"
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
              Projects
            </button>
            <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-[var(--stator-fg-muted)] shrink-0" />
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
                  className="h-7 px-2 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-semibold text-[var(--stator-fg)] w-44 sm:w-60 focus:outline-none"
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
                <Pencil className="w-3 h-3 text-[var(--stator-fg-muted)] opacity-0 group-hover:opacity-100 shrink-0" />
              </button>
            )}

            <span className="hidden lg:inline-block whitespace-nowrap shrink-0 text-xs text-[var(--stator-fg-muted)] ml-1.5">
              ·{' '}
              {saveStatus === 'ephemeral'
                ? 'Ephemeral session'
                : saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'unsaved'
                ? 'Unsaved edits'
                : 'Saved'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-medium tracking-tight text-[var(--stator-fg)] truncate">
              {viewTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Right: Studio Edit Controls + Utilities + Contextual Primary Action */}
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
                className="h-8 px-2.5 rounded-lg text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] inline-flex items-center gap-1.5 cursor-pointer"
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
          className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] inline-flex items-center gap-1 cursor-pointer"
        >
          <Command className="w-3 h-3" />
          <span className="hidden sm:inline">K</span>
        </button>

        <button
          type="button"
          onClick={toggleLightDark}
          title={isDark ? 'Switch to Soft Ivory (Light)' : 'Switch to Graphite Black (Dark)'}
          aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
          className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {isHomeView && (
          <button
            type="button"
            onClick={onOpenNewProjectModal}
            className="lg:hidden h-8 px-3 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        )}

        {showContextualExport && (
          <button
            type="button"
            onClick={onOpenExportCenter}
            className="h-8 px-3 sm:px-3.5 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            {activeCount > 0 && (
              <span className="font-mono tabular-nums text-[11px] opacity-80">
                ({activeCount})
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
