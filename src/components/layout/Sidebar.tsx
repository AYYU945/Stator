import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  FolderKanban,
  History,
  ArrowLeftRight,
  Minimize2,
  Video,
  Image as ImageIcon,
  Music,
  Film,
  Layers,
  FlaskConical,
  Workflow,
  SlidersHorizontal,
  Settings,
  HelpCircle,
  Search,
  Pin,
  PinOff,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  WifiOff,
  X,
  Code2,
  Bug,
  ExternalLink,
} from 'lucide-react';
import { NavToolId } from '../../types/settings.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../../lib/motion.ts';
import { STATOR_ISSUES_URL, STATOR_REPO_URL } from '../../lib/links.ts';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

export interface NavItemConfig {
  id: NavToolId;
  label: string;
  group: 'Workspace' | 'Media Tools' | 'Advanced' | 'System';
  category?: 'Video & Motion' | 'Images' | 'Audio' | 'Workflows & Lab';
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  badgeCount?: number;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home', group: 'Workspace', icon: Home, keywords: 'dashboard start welcome recent' },
  { id: 'projects', label: 'Projects', group: 'Workspace', icon: FolderKanban, keywords: 'workspace saved folders' },
  { id: 'history', label: 'History', group: 'Workspace', icon: History, keywords: 'cache indexeddb logs downloads' },

  {
    id: 'video',
    label: 'Video Editor',
    group: 'Media Tools',
    category: 'Video & Motion',
    description: 'Trim, split, resize, captions & MP4/WebM transcoding',
    icon: Video,
    keywords: 'trim split merge clip speed subtitles',
  },
  {
    id: 'gif-studio',
    label: 'GIF Studio',
    group: 'Media Tools',
    category: 'Video & Motion',
    description: 'Frame sequence timing, 2-pass palette GIF & Animated WebP',
    icon: Film,
    keywords: 'gif animated webp sequence frames',
  },
  {
    id: 'images',
    label: 'Images',
    group: 'Media Tools',
    category: 'Images',
    description: 'Crop, tone adjustments, watermarks, WebP/AVIF & icon packs',
    icon: ImageIcon,
    keywords: 'crop resize filter watermark icon sprite',
  },
  {
    id: 'audio',
    label: 'Audio',
    group: 'Media Tools',
    category: 'Audio',
    description: 'Waveform trim, -16 LUFS loudness, EQ & silence cleanup',
    icon: Music,
    keywords: 'waveform normalize lufs silence eq fade',
  },
  {
    id: 'converter',
    label: 'Converter',
    group: 'Media Tools',
    category: 'Workflows & Lab',
    description: 'Multi-format client conversion across video, audio & images',
    icon: ArrowLeftRight,
    keywords: 'format transcode convert',
  },
  {
    id: 'compressor',
    label: 'Compressor',
    group: 'Media Tools',
    category: 'Workflows & Lab',
    description: 'Target-size optimization, CRF tuning & balanced presets',
    icon: Minimize2,
    keywords: 'shrink reduce bitrate size mb',
  },
  {
    id: 'batch',
    label: 'Batch Queue',
    group: 'Media Tools',
    category: 'Workflows & Lab',
    description: 'Bulk file processing ledger with shared presets & ZIP export',
    icon: Layers,
    keywords: 'queue bulk zip multiple',
  },
  {
    id: 'quality-lab',
    label: 'Quality Lab',
    group: 'Media Tools',
    category: 'Workflows & Lab',
    description: 'Parallel codec benchmarks with PSNR & visual split comparison',
    icon: FlaskConical,
    keywords: 'compare psnr split slider codecs',
  },
  {
    id: 'pipelines',
    label: 'Smart Pipelines',
    group: 'Advanced',
    category: 'Workflows & Lab',
    description: 'Single-pass chained resize, loudness & compression recipes',
    icon: Workflow,
    keywords: 'automation recipe multi step chain',
  },
  {
    id: 'presets',
    label: 'Saved Presets',
    group: 'Advanced',
    category: 'Workflows & Lab',
    description: 'Default image quality, video CRF & privacy hygiene presets',
    icon: SlidersHorizontal,
    keywords: 'defaults crf quality',
  },

  { id: 'settings', label: 'Settings', group: 'System', icon: Settings, keywords: 'preferences appearance workers storage' },
  { id: 'help', label: 'Help & Engine', group: 'System', icon: HelpCircle, keywords: 'guide faq wasm documentation' },
];

const TOOL_CATEGORIES = ['Video & Motion', 'Images', 'Audio', 'Workflows & Lab'] as const;

export interface SidebarProps {
  activeNav: NavToolId;
  onSelectNav: (id: NavToolId) => void;
  onOpenToolsDirectory: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onChangeWidth: (next: number) => void;
  pinnedTools: NavToolId[];
  recentTools: NavToolId[];
  onTogglePinTool: (id: NavToolId) => void;
  projectCount: number;
  historyCount: number;
  queuedCount: number;
  ephemeralMode: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  onOpenToolsDirectory,
  collapsed,
  onToggleCollapse,
  width,
  onChangeWidth,
  pinnedTools,
  recentTools,
  onTogglePinTool,
  projectCount,
  historyCount,
  queuedCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const { isOnline } = usePWAInstall();
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Video & Motion': false,
    Images: false,
    Audio: false,
    'Workflows & Lab': false,
  });

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const itemsWithBadges = useMemo<NavItemConfig[]>(() => {
    return NAV_ITEMS.map((item) => {
      let badgeCount: number | undefined;
      if (item.id === 'projects' && projectCount > 0) badgeCount = projectCount;
      else if (item.id === 'history' && historyCount > 0) badgeCount = historyCount;
      else if ((item.id === 'batch' || item.id === 'converter') && queuedCount > 0) badgeCount = queuedCount;
      return { ...item, badgeCount };
    });
  }, [projectCount, historyCount, queuedCount]);

  const workspaceItems = useMemo(
    () => itemsWithBadges.filter((i) => i.group === 'Workspace'),
    [itemsWithBadges]
  );

  const systemItems = useMemo(
    () => itemsWithBadges.filter((i) => i.group === 'System'),
    [itemsWithBadges]
  );

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    const allTools = itemsWithBadges.filter((i) => i.group === 'Media Tools' || i.group === 'Advanced');
    if (!q) return allTools;
    return allTools.filter(
      (i) => i.label.toLowerCase().includes(q) || i.keywords.toLowerCase().includes(q)
    );
  }, [itemsWithBadges, search]);

  const favoriteItems = useMemo(
    () => itemsWithBadges.filter((i) => pinnedTools.includes(i.id)),
    [itemsWithBadges, pinnedTools]
  );

  const recentItems = useMemo(() => {
    const toolMap = new Map(itemsWithBadges.map((i) => [i.id, i]));
    return recentTools
      .filter((id) => !pinnedTools.includes(id))
      .map((id) => toolMap.get(id))
      .filter((x): x is NavItemConfig => Boolean(x))
      .slice(0, 3);
  }, [itemsWithBadges, recentTools, pinnedTools]);

  const handleDragResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: PointerEvent) => {
      onChangeWidth(Math.min(300, Math.max(200, startWidth + (ev.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const renderNavRow = (
    item: NavItemConfig,
    compactMode: boolean,
    showPinControl = true,
    layoutPrefix = 'nav'
  ) => {
    const Icon = item.icon;
    const isActive = activeNav === item.id;
    const isPinned = pinnedTools.includes(item.id);

    return (
      <div key={`${layoutPrefix}-${item.id}`} className="group/row relative flex items-center">
        <button
          type="button"
          onClick={() => {
            onSelectNav(item.id);
            onCloseMobile();
          }}
          title={compactMode ? item.label : undefined}
          aria-current={isActive ? 'page' : undefined}
          className={`relative w-full flex items-center gap-2.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
            compactMode ? 'justify-center h-9 px-0' : 'h-8 px-2.5'
          } ${
            isActive
              ? 'text-[var(--stator-fg)] font-semibold'
              : 'text-[var(--stator-fg-muted)] font-medium hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]/70'
          }`}
        >
          {isActive && (
            <motion.span
              layoutId={!compactMode ? `stator-sidebar-active-${layoutPrefix}` : undefined}
              transition={STATOR_SPRING.tactile}
              aria-hidden="true"
              className="absolute inset-0 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)]"
            />
          )}
          {isActive && !compactMode && (
            <span
              aria-hidden="true"
              className="relative z-10 w-[2px] h-3.5 rounded-full bg-[var(--stator-cta-bg)] -ml-1 mr-0.5 shrink-0"
            />
          )}
          <Icon className="relative z-10 w-4 h-4 shrink-0" />
          {!compactMode && (
            <>
              <span className="relative z-10 truncate flex-1 text-left">{item.label}</span>
              {typeof item.badgeCount === 'number' && (
                <span className="relative z-10 font-mono tabular-nums text-[11px] text-[var(--stator-fg-muted)] group-hover/row:hidden">
                  {item.badgeCount}
                </span>
              )}
            </>
          )}
        </button>

        {!compactMode && showPinControl && item.group !== 'System' && item.group !== 'Workspace' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePinTool(item.id);
            }}
            aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
            title={isPinned ? 'Remove from favorites' : 'Pin to favorites'}
            className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 absolute right-1.5 z-20 p-1 rounded text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface)] cursor-pointer transition-opacity"
          >
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
        )}
      </div>
    );
  };

  const renderSidebarBody = (isMobileDrawer: boolean) => {
    const compact = !isMobileDrawer && collapsed;
    const prefix = isMobileDrawer ? 'mobile' : 'desktop';
    const hasSearch = search.trim().length > 0;

    return (
      <div className="h-full flex flex-col bg-[var(--stator-surface)] border-r border-[var(--stator-border)] select-none">
        {/* Brand Row */}
        <div
          className={`h-14 flex items-center border-b border-[var(--stator-border)] shrink-0 ${
            compact ? 'justify-center px-2' : 'justify-between px-3.5'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              onSelectNav('home');
              onCloseMobile();
            }}
            className="flex items-center gap-2.5 cursor-pointer group focus-visible:rounded-md"
            aria-label="Stator Home"
          >
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className="w-6 h-6 shrink-0 text-[var(--stator-fg)] transition-transform duration-200 group-hover:rotate-45"
              aria-hidden="true"
            >
              <rect
                x="1.5"
                y="1.5"
                width="25"
                height="25"
                rx="6.5"
                className="fill-[var(--stator-surface-2)] stroke-[var(--stator-border-control)]"
                strokeWidth="1.25"
              />
              <circle
                cx="14"
                cy="14"
                r="7"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeDasharray="5.5 3"
                strokeLinecap="round"
              />
              <circle cx="14" cy="14" r="2.5" className="fill-[var(--stator-fg)]" />
            </svg>
            {!compact && (
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold tracking-tight text-[var(--stator-fg)] text-[16px] leading-none">
                  Stator
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--stator-fg-muted)]">
                  1.0
                </span>
              </div>
            )}
          </button>

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation drawer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            !compact && (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Filter / Expand */}
        <div className="px-2.5 pt-3 pb-2 shrink-0">
          {compact ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="w-full h-9 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--stator-fg-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter tools…"
                aria-label="Filter navigation tools"
                className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] focus:border-[var(--stator-border-control)] text-xs text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-muted)]"
              />
            </div>
          )}
        </div>

        {/* Scrollable Navigation */}
        <nav aria-label="Primary studio navigation" className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-5">
          {/* Workspace */}
          {!hasSearch && (
            <div className="space-y-0.5">
              {!compact && (
                <div className="px-2.5 py-1 text-[12px] font-medium text-[var(--stator-fg-muted)]">
                  Workspace
                </div>
              )}
              {workspaceItems.map((item) => renderNavRow(item, compact, false, prefix))}
            </div>
          )}

          {/* Tools Discovery */}
          <div className="space-y-1">
            {!compact && (
              <div className="px-2.5 py-1 text-[12px] font-medium text-[var(--stator-fg-muted)]">
                Tools
              </div>
            )}

            {/* Browse All Tools Trigger */}
            {!hasSearch && (
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onOpenToolsDirectory();
                }}
                title={compact ? 'Browse All Tools' : undefined}
                className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] transition-colors cursor-pointer ${
                  compact ? 'justify-center h-9 px-0' : 'h-8 px-2.5'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0 text-[var(--stator-fg-muted)]" />
                {!compact && <span className="truncate flex-1 text-left">Browse All Tools</span>}
              </button>
            )}

            {hasSearch ? (
              <div className="space-y-0.5 pt-1">
                {filteredTools.length === 0 ? (
                  <p className="px-2.5 py-3 text-xs text-[var(--stator-fg-muted)]">
                    No matching tools
                  </p>
                ) : (
                  filteredTools.map((item) => renderNavRow(item, compact, true, prefix))
                )}
              </div>
            ) : compact ? (
              <div className="space-y-0.5 pt-1">
                {favoriteItems.slice(0, 5).map((item) => renderNavRow(item, true, false, prefix))}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Favorites */}
                {favoriteItems.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="px-2.5 py-0.5 text-[11px] font-medium text-[var(--stator-fg-muted)]">
                      Favorites
                    </div>
                    {favoriteItems.map((item) => renderNavRow(item, false, true, `${prefix}-fav`))}
                  </div>
                )}

                {/* Recently Used */}
                {recentItems.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="px-2.5 py-0.5 text-[11px] font-medium text-[var(--stator-fg-muted)]">
                      Recently used
                    </div>
                    {recentItems.map((item) => renderNavRow(item, false, true, `${prefix}-recent`))}
                  </div>
                )}

                {/* Collapsible Categories */}
                <div className="space-y-0.5 pt-1 border-t border-[var(--stator-border)]">
                  {TOOL_CATEGORIES.map((category) => {
                    const catItems = filteredTools.filter((i) => i.category === category);
                    if (catItems.length === 0) return null;
                    const isOpen =
                      Boolean(openCategories[category]) ||
                      catItems.some((i) => i.id === activeNav);

                    return (
                      <div key={category} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full px-2.5 py-1.5 flex items-center justify-between text-[12px] font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] rounded-md hover:bg-[var(--stator-surface-2)]/50 cursor-pointer"
                        >
                          <span>{category}</span>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="pl-1 space-y-0.5">
                            {catItems.map((item) => renderNavRow(item, false, true, `${prefix}-cat`))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom System Navigation + Quiet Local Status */}
        <div className="p-2.5 border-t border-[var(--stator-border)] space-y-1 shrink-0">
          {!compact && !isOnline && (
            <div className="px-2.5 py-1.5 mb-1 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] flex items-center gap-2 text-[11px] text-[var(--stator-fg)]">
              <WifiOff className="w-3.5 h-3.5 text-[var(--stator-warning)] shrink-0" />
              <span>Offline ready</span>
            </div>
          )}
          {systemItems.map((item) => renderNavRow(item, compact, false, prefix))}
          {compact ? (
            <a
              href={STATOR_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Stator on GitHub (AYYU945/Stator)"
              aria-label="Stator on GitHub"
              className="w-full h-9 rounded-lg flex items-center justify-center text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] transition-colors"
            >
              <Code2 className="w-4 h-4 shrink-0" />
            </a>
          ) : (
            <div className="pt-1 mt-1 border-t border-[var(--stator-border)] space-y-0.5">
              <a
                href={STATOR_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2.5 rounded-lg flex items-center justify-between gap-2 text-[13px] font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]/70 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Code2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">GitHub Source</span>
                </span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              </a>
              <a
                href={STATOR_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2.5 rounded-lg flex items-center justify-between gap-2 text-[13px] font-medium text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]/70 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Bug className="w-4 h-4 shrink-0" />
                  <span className="truncate">Report a Bug</span>
                </span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              </a>
              <p className="px-2.5 pt-1 text-[11px] text-[var(--stator-fg-muted)]">
                Local · On-device processing
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Resizable Sidebar */}
      <aside
        style={{ width: collapsed ? 64 : width }}
        className="hidden lg:block relative shrink-0 h-screen sticky top-0 z-30 transition-[width] duration-150 ease-out"
      >
        {renderSidebarBody(false)}
        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize navigation sidebar"
            onPointerDown={handleDragResize}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--stator-border-control)] transition-colors"
          />
        )}
      </aside>

      {/* Mobile / Tablet Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={STATOR_TRANSITION.overlay}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={STATOR_TRANSITION.drawer}
              className="relative z-10 w-[264px] max-w-[84vw] h-full shadow-2xl"
            >
              {renderSidebarBody(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
