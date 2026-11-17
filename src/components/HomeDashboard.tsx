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
  Plus,
  Upload,
} from 'lucide-react';
import { ProjectRecord, ProjectType } from '../types/project.ts';
import { formatRelativeTime } from '../types/history.ts';

export interface HomeDashboardProps {
  projects: ProjectRecord[];
  ephemeralMode: boolean;
  recentProjectTypes: ProjectType[];
  onCreateProject: (type: ProjectType) => void;
  onOpenNewProjectModal: () => void;
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

const TEMPLATE_META: Record<ProjectType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  video: { label: 'Video Project', icon: Video },
  image: { label: 'Image Project', icon: ImageIcon },
  audio: { label: 'Audio Project', icon: Music },
  gif: { label: 'GIF / Animation', icon: Film },
  batch: { label: 'Batch Conversion', icon: Layers },
  blank: { label: 'Blank Workspace', icon: FilePlus2 },
};

function renderTypeBadgeIcon(type: ProjectType, sizeClass = 'w-5 h-5') {
  switch (type) {
    case 'video':
      return <Video className={sizeClass} strokeWidth={1.6} />;
    case 'image':
      return <ImageIcon className={sizeClass} strokeWidth={1.6} />;
    case 'audio':
      return <Music className={sizeClass} strokeWidth={1.6} />;
    case 'gif':
      return <Film className={sizeClass} strokeWidth={1.6} />;
    case 'batch':
      return <Layers className={sizeClass} strokeWidth={1.6} />;
    default:
      return <FilePlus2 className={sizeClass} strokeWidth={1.6} />;
  }
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  projects,
  ephemeralMode,
  recentProjectTypes,
  onCreateProject,
  onOpenNewProjectModal,
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
  const isReturningUser = projects.length > 0;

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

  const quickTemplates = useMemo(() => {
    const list = recentProjectTypes.length > 0 ? recentProjectTypes : (['video', 'image', 'audio'] as ProjectType[]);
    return list.slice(0, 3);
  }, [recentProjectTypes]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-7 sm:py-9">
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

      {/* Main Split: Central Studio Dashboard + Condensed Right Creation Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        <div className="lg:col-span-8 xl:col-span-9 space-y-8 min-w-0">
          {/* Calm Editorial Hero Header */}
          <header className="space-y-2">
            <h2 className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] leading-[1.15] text-[var(--stator-fg)] text-balance">
              {isReturningUser ? 'Welcome back.' : 'Create something.'}
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[var(--stator-fg-muted)] max-w-2xl">
              {isReturningUser
                ? 'Pick up where you left off, or start something new.'
                : 'Your media workspace starts here. Drop video, audio, or images anywhere—every byte stays on your device.'}
            </p>
            {ephemeralMode && (
              <p className="text-xs text-[var(--stator-fg-muted)] pt-1">
                Ephemeral session active · Local project persistence is paused.
              </p>
            )}
          </header>

          {!isReturningUser ? (
            /* FIRST-LAUNCH STATE: Tranquil Primary Intake Canvas */
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
              className={`rounded-2xl border border-dashed transition-colors px-6 py-14 sm:py-16 text-center flex flex-col items-center justify-center gap-5 ${
                isDragActive
                  ? 'border-[var(--stator-cta-bg)] bg-[var(--stator-surface-2)]'
                  : 'border-[var(--stator-border-control)] bg-[var(--stator-surface)]'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg)]">
                <FolderUp className="w-5 h-5" strokeWidth={1.75} />
              </div>

              <div className="space-y-1.5 max-w-md">
                <p className="text-base font-medium text-[var(--stator-fg)]">
                  {isDragActive ? 'Drop media to open Studio' : 'Drop media files or browse from disk'}
                </p>
                <p className="text-[13px] text-[var(--stator-fg-muted)] leading-relaxed">
                  MP4, MOV, MKV, WAV, MP3, FLAC, PNG, JPEG, WebP, or AVIF · Paste from clipboard with ⌘V
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="h-10 px-5 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-[13px] font-medium inline-flex items-center gap-2 transition-colors active:scale-[0.985] cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Media</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenNewProjectModal}
                  className="lg:hidden h-10 px-4 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-[13px] font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onLoadSamples}
                className="text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4 cursor-pointer"
              >
                Try sample media
              </button>
            </section>
          ) : (
            /* RETURNING-USER FLOW */
            <div className="space-y-9">
              {/* Featured Jump Back In Hero Card */}
              {latestProject && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-medium tracking-tight text-[var(--stator-fg)]">
                      Jump back in
                    </h3>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={onOpenAllProjects}
                        className="text-xs font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
                      >
                        View all ({projects.length})
                      </button>
                    )}
                  </div>

                  <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenProject(latestProject.id)}
                        className="w-28 sm:w-36 aspect-[16/10] rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] overflow-hidden flex items-center justify-center text-[var(--stator-fg-muted)] shrink-0 cursor-pointer"
                        aria-label={`Open ${latestProject.name}`}
                      >
                        {latestProject.thumbnailDataUrl ? (
                          <img
                            src={latestProject.thumbnailDataUrl}
                            alt={latestProject.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          renderTypeBadgeIcon(latestProject.type, 'w-6 h-6')
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <h4 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--stator-fg)] truncate">
                          {latestProject.name}
                        </h4>
                        <p className="text-[13px] text-[var(--stator-fg-muted)] flex flex-wrap items-center gap-1.5">
                          <span>{PROJECT_TYPE_LABELS[latestProject.type]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[12px]">
                            {latestProject.assets.length}{' '}
                            {latestProject.assets.length === 1 ? 'asset' : 'assets'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(latestProject.lastOpenedAt)}</span>
                        </p>
                        {countMissingAssets(latestProject) > 0 && (
                          <p className="inline-flex items-center gap-1.5 text-xs text-[var(--stator-warning)]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{countMissingAssets(latestProject)} needs reconnect</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenProject(latestProject.id)}
                      className="h-9 px-4 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap transition-colors active:scale-[0.985]"
                    >
                      <span>Continue Editing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </section>
              )}

              {/* Media-First Project Gallery */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-[17px] font-medium tracking-tight text-[var(--stator-fg)]">
                    Your projects
                  </h3>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[var(--stator-fg-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects…"
                        aria-label="Search projects"
                        className="h-8 w-44 pl-8 pr-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-muted)]"
                      />
                    </div>

                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      aria-label="Filter by project type"
                      className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
                    >
                      <option value="all">All types</option>
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
                      className="h-8 px-2.5 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] cursor-pointer"
                    >
                      <option value="recent">Recent first</option>
                      <option value="name">Name (A–Z)</option>
                    </select>

                    <div className="inline-flex rounded-lg border border-[var(--stator-border-control)] bg-[var(--stator-surface-2)] p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        aria-label="Grid view"
                        className={`p-1 rounded-md cursor-pointer transition-colors ${
                          viewMode === 'grid'
                            ? 'bg-[var(--stator-surface)] text-[var(--stator-fg)] shadow-2xs'
                            : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        aria-label="List view"
                        className={`p-1 rounded-md cursor-pointer transition-colors ${
                          viewMode === 'list'
                            ? 'bg-[var(--stator-surface)] text-[var(--stator-fg)] shadow-2xs'
                            : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
                        }`}
                      >
                        <ListIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="rounded-xl border border-[var(--stator-border)] bg-[var(--stator-surface)] p-8 text-center text-sm text-[var(--stator-fg-muted)]">
                    No projects match “{search || typeFilter}”.
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProjects.map((proj) => {
                      const missing = countMissingAssets(proj);
                      return (
                        <div
                          key={proj.id}
                          className="group rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] hover:border-[var(--stator-border-control)] overflow-hidden flex flex-col transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenProject(proj.id)}
                            className="relative aspect-[16/9] w-full bg-[var(--stator-surface-2)] border-b border-[var(--stator-border)] overflow-hidden flex items-center justify-center text-[var(--stator-fg-muted)] cursor-pointer"
                          >
                            {proj.thumbnailDataUrl ? (
                              <img
                                src={proj.thumbnailDataUrl}
                                alt={proj.name}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1.5">
                                {renderTypeBadgeIcon(proj.type, 'w-6 h-6')}
                                <span className="text-xs text-[var(--stator-fg-muted)]">
                                  {PROJECT_TYPE_LABELS[proj.type]}
                                </span>
                              </div>
                            )}
                            {proj.pinned && (
                              <span
                                title="Pinned project"
                                className="absolute top-2.5 left-2.5 w-6 h-6 rounded-md bg-[var(--stator-surface)]/95 border border-[var(--stator-border)] text-[var(--stator-fg)] flex items-center justify-center"
                              >
                                <Pin className="w-3 h-3" />
                              </span>
                            )}
                            {missing > 0 && (
                              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[var(--stator-surface)]/95 border border-[var(--stator-border)] text-[var(--stator-warning)] text-[11px] inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{missing} reconnect</span>
                              </span>
                            )}
                          </button>

                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
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
                                  className="w-full h-7 px-2 rounded bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-sm font-medium text-[var(--stator-fg)]"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenProject(proj.id)}
                                  className="text-left text-[15px] font-medium text-[var(--stator-fg)] truncate block w-full cursor-pointer"
                                >
                                  {proj.name}
                                </button>
                              )}
                              <p className="text-xs text-[var(--stator-fg-muted)] mt-0.5">
                                {PROJECT_TYPE_LABELS[proj.type]} ·{' '}
                                <span className="font-mono tabular-nums">{proj.assets.length}</span>{' '}
                                {proj.assets.length === 1 ? 'file' : 'files'} ·{' '}
                                {formatRelativeTime(proj.updatedAt)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-[var(--stator-border)]">
                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => onTogglePinProject(proj.id)}
                                  title={proj.pinned ? 'Unpin' : 'Pin project'}
                                  aria-label={proj.pinned ? 'Unpin project' : 'Pin project'}
                                  className="p-1.5 rounded-md text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
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
                                  className="p-1.5 rounded-md text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDuplicateProject(proj.id)}
                                  title="Duplicate"
                                  aria-label={`Duplicate ${proj.name}`}
                                  className="p-1.5 rounded-md text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onExportProjectJson(proj.id)}
                                  title="Export .stator.json"
                                  aria-label={`Export ${proj.name}`}
                                  className="p-1.5 rounded-md text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
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
                                    className="px-2 py-1 rounded bg-[var(--stator-danger)] text-white text-[11px] font-medium cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-1 rounded text-[11px] text-[var(--stator-fg-muted)] cursor-pointer"
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
                                  className="p-1.5 rounded-md text-[var(--stator-fg-muted)] hover:text-[var(--stator-danger)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
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
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--stator-surface-2)]/40"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenProject(proj.id)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center justify-center text-[var(--stator-fg-muted)] shrink-0 overflow-hidden">
                            {proj.thumbnailDataUrl ? (
                              <img src={proj.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              renderTypeBadgeIcon(proj.type, 'w-4 h-4')
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--stator-fg)] truncate">
                              {proj.name}
                            </p>
                            <p className="text-xs text-[var(--stator-fg-muted)]">
                              {PROJECT_TYPE_LABELS[proj.type]} · {proj.assets.length}{' '}
                              {proj.assets.length === 1 ? 'file' : 'files'} ·{' '}
                              {formatRelativeTime(proj.updatedAt)}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
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
                            className="p-1.5 rounded-lg text-[var(--stator-fg-muted)] hover:text-[var(--stator-danger)] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Subdued Compact Drop Strip */}
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
                className={`rounded-xl border border-dashed transition-colors px-4 py-3.5 cursor-pointer flex items-center justify-between gap-3 ${
                  isDragActive
                    ? 'border-[var(--stator-cta-bg)] bg-[var(--stator-surface-2)]'
                    : 'border-[var(--stator-border-control)] bg-[var(--stator-surface)]/70 hover:bg-[var(--stator-surface)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FolderUp className="w-4 h-4 text-[var(--stator-fg-muted)] shrink-0" />
                  <p className="text-xs sm:text-[13px] text-[var(--stator-fg-muted)] truncate">
                    Drop files anywhere or paste with ⌘V to start a studio session
                  </p>
                </div>
                <span className="text-xs font-medium text-[var(--stator-fg)] shrink-0">
                  Browse
                </span>
              </section>
            </div>
          )}
        </div>

        {/* Streamlined Right Creation Rail */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border)] p-4 space-y-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={onOpenNewProjectModal}
                className="w-full h-10 px-4 rounded-lg bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] text-[13px] font-medium inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.985] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>

              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="w-full h-9 px-3 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderUp className="w-3.5 h-3.5 text-[var(--stator-fg-muted)]" />
                <span>Import Media</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[var(--stator-border)] space-y-1.5">
              <p className="px-1 text-xs font-medium text-[var(--stator-fg-muted)]">
                Quick templates
              </p>
              {quickTemplates.map((type) => {
                const meta = TEMPLATE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onCreateProject(type)}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-[var(--stator-surface-2)] text-left flex items-center gap-2.5 text-[13px] text-[var(--stator-fg)] transition-colors cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-[var(--stator-fg-muted)] shrink-0" />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[var(--stator-border)] flex flex-col gap-1">
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--stator-surface-2)] text-left text-xs text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors cursor-pointer"
              >
                Import .stator.json Project
              </button>
              {isReturningUser && (
                <button
                  type="button"
                  onClick={onLoadSamples}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--stator-surface-2)] text-left text-xs text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors cursor-pointer"
                >
                  Load Sample Media
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
