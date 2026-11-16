import React, { useState, useMemo, useRef } from 'react';
import {
  Video,
  Image as ImageIcon,
  Music,
  Film,
  Layers,
  FilePlus2,
  FolderUp,
  Search,
  Pin,
  PinOff,
  Trash2,
  Copy,
  Download,
  Pencil,
  LayoutGrid,
  List as ListIcon,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Upload,
} from 'lucide-react';
import { ProjectRecord, ProjectType } from '../types/project.ts';
import { formatRelativeTime } from '../types/history.ts';

export interface HomeDashboardProps {
  projects: ProjectRecord[];
  ephemeralMode: boolean;
  onCreateProject: (type: ProjectType) => void;
  onOpenProject: (projectId: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onTogglePinProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onExportProjectJson: (projectId: string) => void;
  onImportProjectJson: (file: File) => void;
  onImportMediaFiles: (files: File[]) => void;
  onLoadSamples: () => void;
  onOpenAllProjects: () => void;
}

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  video: 'Video',
  image: 'Image',
  audio: 'Audio',
  gif: 'GIF / Animation',
  batch: 'Batch',
  blank: 'Blank',
};

function renderTypeBadgeIcon(type: ProjectType) {
  switch (type) {
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'image':
      return <ImageIcon className="w-4 h-4" />;
    case 'audio':
      return <Music className="w-4 h-4" />;
    case 'gif':
      return <Film className="w-4 h-4" />;
    case 'batch':
      return <Layers className="w-4 h-4" />;
    default:
      return <FilePlus2 className="w-4 h-4" />;
  }
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  projects,
  ephemeralMode,
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDuplicateProject,
  onTogglePinProject,
  onDeleteProject,
  onExportProjectJson,
  onImportProjectJson,
  onImportMediaFiles,
  onLoadSamples,
  onOpenAllProjects,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ProjectType>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const sortedByRecent = useMemo(() => {
    return [...projects].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  }, [projects]);

  const latestProject = sortedByRecent[0] || null;
  const recentStrip = sortedByRecent.slice(1, 4);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => {
        const matchesType = typeFilter === 'all' || p.type === typeFilter;
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.assets.some((a) => a.name.toLowerCase().includes(q));
        return matchesType && matchesQuery;
      })
      .sort((a, b) => {
        if (Number(b.pinned) !== Number(a.pinned)) return Number(b.pinned) - Number(a.pinned);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.lastOpenedAt - a.lastOpenedAt;
      });
  }, [projects, search, typeFilter, sortBy]);

  const commitRename = (projectId: string) => {
    const clean = renameDraft.trim();
    if (clean) onRenameProject(projectId, clean);
    setRenamingId(null);
  };

  const countMissingAssets = (p: ProjectRecord) =>
    p.assets.filter((a) => !a.hasCachedBlob).length;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      <input
        ref={mediaInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportMediaFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
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

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[var(--stator-border)]">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-subtle)] mb-1.5">
            Local Media Workspace · {ephemeralMode ? 'Ephemeral RAM Session' : 'IndexedDB Autosave Active'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)]">
            {projects.length > 0 ? 'Welcome back to Stator' : 'Ready when your media is'}
          </h2>
          <p className="text-sm text-[var(--stator-fg-muted)] mt-1">
            {projects.length > 0
              ? 'Resume a saved project, organize batches, or drop new media to launch straight into the Studio.'
              : 'Drop video, audio, or images anywhere to open a live Studio workspace—every byte stays on your machine.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onLoadSamples}
            className="h-9 px-3 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>Load Sample Media</span>
          </button>
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="h-9 px-3.5 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Media</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left/Center Workspace + Right New Project Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0">
          {/* Quick Drop Target / First-Launch Hero */}
          <section
            onDragOver={(e) => {
              e.preventDefault();
              if (!isDragActive) setIsDragActive(true);
            }}
            onDragLeave={(e) => {
              const rel = e.relatedTarget as Node | null;
              if (rel && e.currentTarget.contains(rel)) return;
              setIsDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onImportMediaFiles(Array.from(e.dataTransfer.files));
              }
            }}
            onClick={() => mediaInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                mediaInputRef.current?.click();
              }
            }}
            className={`rounded-xl border border-dashed transition-colors p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isDragActive
                ? 'border-[var(--stator-accent)] bg-[var(--stator-accent-soft)]'
                : 'border-[var(--stator-border-strong)] bg-[var(--stator-surface)] hover:border-[var(--stator-accent)]'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-accent-fg)] shrink-0">
                <FolderUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--stator-fg)]">
                  {isDragActive ? 'Drop files to launch Studio' : 'Drop media files or browse from disk'}
                </p>
                <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5">
                  Video (MP4, MOV, MKV, WEBM), Audio (WAV, MP3, FLAC, AAC), Images (PNG, JPEG, WEBP, AVIF) · Ctrl/Cmd+V paste supported
                </p>
              </div>
            </div>
            <span className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center justify-center shrink-0">
              Select Files
            </span>
          </section>

          {/* Jump Back In (Real Recent Project) */}
          {latestProject && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-muted)]">
                  Jump Back In
                </h3>
                {projects.length > 1 && (
                  <button
                    type="button"
                    onClick={onOpenAllProjects}
                    className="text-xs font-medium text-[var(--stator-accent-fg)] hover:underline cursor-pointer"
                  >
                    View all projects ({projects.length})
                  </button>
                )}
              </div>

              <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-24 h-16 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] overflow-hidden flex items-center justify-center text-[var(--stator-fg-subtle)] shrink-0">
                    {latestProject.thumbnailDataUrl ? (
                      <img
                        src={latestProject.thumbnailDataUrl}
                        alt={latestProject.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      renderTypeBadgeIcon(latestProject.type)
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono uppercase text-[var(--stator-accent-fg)]">
                        {PROJECT_TYPE_LABELS[latestProject.type]}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--stator-fg-subtle)]">
                        · {formatRelativeTime(latestProject.lastOpenedAt)}
                      </span>
                      {countMissingAssets(latestProject) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--stator-warning)]">
                          <AlertTriangle className="w-3 h-3" />
                          {countMissingAssets(latestProject)} needs reconnect
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-semibold text-[var(--stator-fg)] truncate mt-0.5">
                      {latestProject.name}
                    </h4>
                    <p className="text-xs font-mono tabular-nums text-[var(--stator-fg-muted)] mt-0.5">
                      {latestProject.assets.length}{' '}
                      {latestProject.assets.length === 1 ? 'asset' : 'assets'}
                      {latestProject.snapshots.length > 0
                        ? ` · ${latestProject.snapshots.length} snapshot${latestProject.snapshots.length === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(latestProject.id)}
                  className="h-9 px-4 rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Continue Editing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentStrip.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentStrip.map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => onOpenProject(proj.id)}
                      className="text-left p-3 rounded-xl bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center gap-3 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] overflow-hidden flex items-center justify-center text-[var(--stator-fg-muted)] shrink-0">
                        {proj.thumbnailDataUrl ? (
                          <img src={proj.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          renderTypeBadgeIcon(proj.type)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--stator-fg)] truncate">
                          {proj.name}
                        </p>
                        <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)] truncate">
                          {PROJECT_TYPE_LABELS[proj.type]} · {formatRelativeTime(proj.lastOpenedAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Your Projects Section */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-muted)]">
                Your Projects ({projects.length})
              </h3>

              {projects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--stator-fg-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search projects…"
                      aria-label="Search projects"
                      className="h-8 w-44 pl-8 pr-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-subtle)]"
                    />
                  </div>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    aria-label="Filter by project type"
                    className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                    <option value="gif">GIF</option>
                    <option value="batch">Batch</option>
                    <option value="blank">Blank</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sort projects"
                    className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] cursor-pointer"
                  >
                    <option value="recent">Recent first</option>
                    <option value="name">Name (A–Z)</option>
                  </select>

                  <div className="inline-flex rounded-lg border border-[var(--stator-border)] bg-[var(--stator-surface)] p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                      className={`p-1 rounded-md cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)]'
                          : 'text-[var(--stator-fg-subtle)]'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                      className={`p-1 rounded-md cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-[var(--stator-surface-2)] text-[var(--stator-fg)]'
                          : 'text-[var(--stator-fg-subtle)]'
                      }`}
                    >
                      <ListIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] p-8 text-center">
                <p className="text-sm font-medium text-[var(--stator-fg)]">
                  {ephemeralMode
                    ? 'Ephemeral Mode active — projects are disabled'
                    : 'No saved projects yet'}
                </p>
                <p className="text-xs text-[var(--stator-fg-muted)] mt-1 max-w-md mx-auto">
                  {ephemeralMode
                    ? 'Disable Ephemeral Mode in History or Settings if you want projects persisted locally in IndexedDB.'
                    : 'Create a project using the New Project rail on the right, load sample files, or import a .stator.json project bundle.'}
                </p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] p-8 text-center text-xs text-[var(--stator-fg-muted)]">
                No projects match “{search || typeFilter}”.
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProjects.map((proj) => {
                  const missing = countMissingAssets(proj);
                  return (
                    <div
                      key={proj.id}
                      className="group rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] hover:border-[var(--stator-border-strong)] overflow-hidden flex flex-col transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj.id)}
                        className="relative aspect-[16/9] w-full bg-[var(--stator-surface-2)] border-b border-[var(--stator-border)] overflow-hidden flex items-center justify-center text-[var(--stator-fg-subtle)] cursor-pointer"
                      >
                        {proj.thumbnailDataUrl ? (
                          <img
                            src={proj.thumbnailDataUrl}
                            alt={proj.name}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            {renderTypeBadgeIcon(proj.type)}
                            <span className="text-[11px] font-mono">
                              {PROJECT_TYPE_LABELS[proj.type]}
                            </span>
                          </div>
                        )}
                        {proj.pinned && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-mono inline-flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" />
                            Pinned
                          </span>
                        )}
                        {missing > 0 && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-200 text-[10px] font-mono inline-flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Reconnect ({missing})
                          </span>
                        )}
                      </button>

                      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          {renamingId === proj.id ? (
                            <input
                              type="text"
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onBlur={() => commitRename(proj.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(proj.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              autoFocus
                              className="w-full h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-accent)] text-xs font-semibold text-[var(--stator-fg)]"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenProject(proj.id)}
                              className="text-left text-sm font-semibold text-[var(--stator-fg)] hover:text-[var(--stator-accent-fg)] truncate block w-full cursor-pointer"
                            >
                              {proj.name}
                            </button>
                          )}
                          <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)] mt-0.5">
                            {PROJECT_TYPE_LABELS[proj.type]} · {proj.assets.length} file
                            {proj.assets.length === 1 ? '' : 's'} · {formatRelativeTime(proj.updatedAt)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--stator-border)]">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onTogglePinProject(proj.id)}
                              title={proj.pinned ? 'Unpin' : 'Pin project'}
                              aria-label={proj.pinned ? 'Unpin project' : 'Pin project'}
                              className="p-1.5 rounded-md text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
                            >
                              {proj.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenameDraft(proj.name);
                                setRenamingId(proj.id);
                              }}
                              title="Rename"
                              aria-label={`Rename ${proj.name}`}
                              className="p-1.5 rounded-md text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDuplicateProject(proj.id)}
                              title="Duplicate"
                              aria-label={`Duplicate ${proj.name}`}
                              className="p-1.5 rounded-md text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onExportProjectJson(proj.id)}
                              title="Export .stator.json"
                              aria-label={`Export ${proj.name}`}
                              className="p-1.5 rounded-md text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {confirmDeleteId === proj.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteProject(proj.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded bg-[var(--stator-danger)] text-white text-[10px] font-medium cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-1 rounded text-[10px] text-[var(--stator-fg-muted)] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(proj.id)}
                              title="Delete project"
                              aria-label={`Delete ${proj.name}`}
                              className="p-1.5 rounded-md text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] divide-y divide-[var(--stator-border)] overflow-hidden">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--stator-surface-2)]/50"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenProject(proj.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] shrink-0 overflow-hidden">
                        {proj.thumbnailDataUrl ? (
                          <img src={proj.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          renderTypeBadgeIcon(proj.type)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--stator-fg)] truncate">
                          {proj.name}
                        </p>
                        <p className="text-[11px] font-mono text-[var(--stator-fg-subtle)]">
                          {PROJECT_TYPE_LABELS[proj.type]} · {proj.assets.length} file
                          {proj.assets.length === 1 ? '' : 's'} · {formatRelativeTime(proj.updatedAt)}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj.id)}
                        className="h-8 px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] cursor-pointer"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj.id)}
                        aria-label={`Delete ${proj.name}`}
                        className="p-1.5 rounded-lg text-[var(--stator-fg-subtle)] hover:text-[var(--stator-danger)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: New Project Creation Panel */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--stator-border)]">
              <h3 className="text-xs font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-muted)]">
                New Project
              </h3>
            </div>

            <div className="p-3 space-y-1.5">
              {(
                [
                  {
                    type: 'video' as ProjectType,
                    title: 'New Video Project',
                    sub: 'Trim, split, resize, subtitles & MP4/WebM',
                    icon: Video,
                  },
                  {
                    type: 'image' as ProjectType,
                    title: 'New Image Project',
                    sub: 'Crop, tone, watermark, AVIF/WebP & Icons',
                    icon: ImageIcon,
                  },
                  {
                    type: 'audio' as ProjectType,
                    title: 'New Audio Project',
                    sub: 'Waveform trim, -16 LUFS, EQ & silence clean',
                    icon: Music,
                  },
                  {
                    type: 'gif' as ProjectType,
                    title: 'New GIF / Animation',
                    sub: '2-pass palette sequencer & animated WebP',
                    icon: Film,
                  },
                  {
                    type: 'batch' as ProjectType,
                    title: 'New Batch Conversion',
                    sub: 'Bulk queue processing, templates & ZIP export',
                    icon: Layers,
                  },
                  {
                    type: 'blank' as ProjectType,
                    title: 'Blank Studio Project',
                    sub: 'Start empty and attach any media later',
                    icon: FilePlus2,
                  },
                ] as const
              ).map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => onCreateProject(entry.type)}
                    className="w-full p-2.5 rounded-lg hover:bg-[var(--stator-surface-2)] border border-transparent hover:border-[var(--stator-border)] text-left flex items-start gap-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-md bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-accent-fg)] shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--stator-fg)]">{entry.title}</p>
                      <p className="text-[11px] text-[var(--stator-fg-muted)] leading-snug mt-0.5">
                        {entry.sub}
                      </p>
                    </div>
                  </button>
                );
              })}

              <div className="pt-2 mt-2 border-t border-[var(--stator-border)] space-y-1.5">
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="w-full h-9 px-3 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-xs font-medium text-[var(--stator-fg)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderUp className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
                  <span>Import Existing Media</span>
                </button>
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="w-full h-8 px-3 rounded-lg hover:bg-[var(--stator-surface-2)] text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Import .stator.json Project</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
