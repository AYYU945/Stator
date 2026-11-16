import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Pin,
  PinOff,
  Trash2,
  Copy,
  Download,
  Pencil,
  Upload,
  FolderPlus,
  AlertTriangle,
  History,
} from 'lucide-react';
import { ProjectRecord, ProjectType } from '../types/project.ts';
import { formatRelativeTime } from '../types/history.ts';

export interface ProjectsViewProps {
  projects: ProjectRecord[];
  onCreateProject: (type: ProjectType) => void;
  onOpenProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDuplicateProject: (id: string) => void;
  onTogglePinProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onExportProjectJson: (id: string) => void;
  onImportProjectJson: (file: File) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDuplicateProject,
  onTogglePinProject,
  onDeleteProject,
  onExportProjectJson,
  onImportProjectJson,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ProjectType>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const okType = typeFilter === 'all' || p.type === typeFilter;
      const okQuery =
        !q || p.name.toLowerCase().includes(q) || p.assets.some((a) => a.name.toLowerCase().includes(q));
      return okType && okQuery;
    });
  }, [projects, search, typeFilter]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,.stator.json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportProjectJson(f);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[var(--stator-border)]">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-subtle)] mb-1">
            IndexedDB Project Ledger
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--stator-fg)]">
            Saved Projects ({projects.length})
          </h2>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1">
            Projects store your non-destructive edits, presets, snapshots, and small source assets locally.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="h-9 px-3 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import .stator.json</span>
          </button>
          <button
            type="button"
            onClick={() => onCreateProject('blank')}
            className="h-9 px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Blank Project</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-[var(--stator-fg-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by project or filename…"
            aria-label="Filter projects"
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'video', 'image', 'audio', 'gif', 'batch', 'blank'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`h-8 px-3 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                typeFilter === t
                  ? 'bg-[var(--stator-accent)] text-white'
                  : 'bg-[var(--stator-surface)] border border-[var(--stator-border)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] py-14 px-6 text-center">
          <p className="text-sm font-medium text-[var(--stator-fg)]">No matching local projects</p>
          <p className="text-xs text-[var(--stator-fg-muted)] mt-1">
            Create a project or import a saved `.stator.json` file to populate your workspace.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] divide-y divide-[var(--stator-border)] overflow-hidden">
          {filtered.map((proj) => {
            const missingCount = proj.assets.filter((a) => !a.hasCachedBlob).length;
            return (
              <div
                key={proj.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--stator-surface-2)]/40"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-16 h-11 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] overflow-hidden flex items-center justify-center text-[11px] font-mono uppercase text-[var(--stator-fg-muted)] shrink-0">
                    {proj.thumbnailDataUrl ? (
                      <img src={proj.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{proj.type}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {renamingId === proj.id ? (
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => {
                          if (draftName.trim()) onRenameProject(proj.id, draftName.trim());
                          setRenamingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (draftName.trim()) onRenameProject(proj.id, draftName.trim());
                            setRenamingId(null);
                          }
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        autoFocus
                        className="h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-accent)] text-sm font-semibold text-[var(--stator-fg)]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj.id)}
                        className="text-sm font-semibold text-[var(--stator-fg)] hover:text-[var(--stator-accent-fg)] truncate block cursor-pointer"
                      >
                        {proj.name}
                      </button>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-mono text-[var(--stator-fg-subtle)] mt-0.5">
                      <span className="uppercase">{proj.type}</span>
                      <span>·</span>
                      <span>
                        {proj.assets.length} asset{proj.assets.length === 1 ? '' : 's'}
                      </span>
                      <span>·</span>
                      <span>Updated {formatRelativeTime(proj.updatedAt)}</span>
                      {proj.snapshots.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <History className="w-3 h-3" />
                            {proj.snapshots.length} snapshot{proj.snapshots.length === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                      {missingCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[var(--stator-warning)] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {missingCount} reconnect needed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj.id)}
                    className="h-8 px-3 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium cursor-pointer"
                  >
                    Open Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePinProject(proj.id)}
                    aria-label={proj.pinned ? 'Unpin' : 'Pin'}
                    className="h-8 w-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
                  >
                    {proj.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(proj.name);
                      setRenamingId(proj.id);
                    }}
                    aria-label="Rename"
                    className="h-8 w-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateProject(proj.id)}
                    aria-label="Duplicate"
                    className="h-8 w-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportProjectJson(proj.id)}
                    aria-label="Export JSON"
                    className="h-8 w-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {confirmDeleteId === proj.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteProject(proj.id);
                          setConfirmDeleteId(null);
                        }}
                        className="h-8 px-2.5 rounded-lg bg-[var(--stator-danger)] text-white text-xs font-medium cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-8 px-2 text-xs text-[var(--stator-fg-muted)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(proj.id)}
                      aria-label="Delete project"
                      className="h-8 w-8 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-danger)] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
