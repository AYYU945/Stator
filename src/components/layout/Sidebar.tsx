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
  X,
} from 'lucide-react';
import { NavToolId } from '../../types/settings.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../../lib/motion.ts';

export interface NavItemConfig {
  id: NavToolId;
  label: string;
  group: 'Workspace' | 'Media Tools' | 'Advanced' | 'System';
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
  badgeCount?: number;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', label: 'Home', group: 'Workspace', icon: Home, keywords: 'dashboard start welcome recent' },
  { id: 'projects', label: 'Projects', group: 'Workspace', icon: FolderKanban, keywords: 'workspace saved folders' },
  { id: 'history', label: 'History', group: 'Workspace', icon: History, keywords: 'cache indexeddb logs downloads' },

  { id: 'converter', label: 'Converter', group: 'Media Tools', icon: ArrowLeftRight, keywords: 'format transcode convert' },
  { id: 'compressor', label: 'Compressor', group: 'Media Tools', icon: Minimize2, keywords: 'shrink reduce bitrate size mb' },
  { id: 'video', label: 'Video Editor', group: 'Media Tools', icon: Video, keywords: 'trim split merge clip speed subtitles' },
  { id: 'images', label: 'Images', group: 'Media Tools', icon: ImageIcon, keywords: 'crop resize filter watermark icon sprite' },
  { id: 'audio', label: 'Audio', group: 'Media Tools', icon: Music, keywords: 'waveform normalize lufs silence eq fade' },
  { id: 'gif-studio', label: 'GIF Studio', group: 'Media Tools', icon: Film, keywords: 'gif animated webp sequence frames' },
  { id: 'batch', label: 'Batch Queue', group: 'Media Tools', icon: Layers, keywords: 'queue bulk zip multiple' },
  { id: 'quality-lab', label: 'Quality Lab', group: 'Media Tools', icon: FlaskConical, keywords: 'compare psnr split slider codecs' },

  { id: 'pipelines', label: 'Smart Pipelines', group: 'Advanced', icon: Workflow, keywords: 'automation recipe multi step chain' },
  { id: 'presets', label: 'Saved Presets', group: 'Advanced', icon: SlidersHorizontal, keywords: 'defaults crf quality' },

  { id: 'settings', label: 'Settings', group: 'System', icon: Settings, keywords: 'preferences appearance workers storage' },
  { id: 'help', label: 'Help & Engine', group: 'System', icon: HelpCircle, keywords: 'guide faq wasm documentation' },
];

export interface SidebarProps {
  activeNav: NavToolId;
  onSelectNav: (id: NavToolId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onChangeWidth: (next: number) => void;
  pinnedTools: NavToolId[];
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
  collapsed,
  onToggleCollapse,
  width,
  onChangeWidth,
  pinnedTools,
  onTogglePinTool,
  projectCount,
  historyCount,
  queuedCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const itemsWithBadges = useMemo(() => {
    return NAV_ITEMS.map((item) => {
      let badgeCount: number | undefined;
      if (item.id === 'projects' && projectCount > 0) badgeCount = projectCount;
      else if (item.id === 'history' && historyCount > 0) badgeCount = historyCount;
      else if ((item.id === 'batch' || item.id === 'converter') && queuedCount > 0) badgeCount = queuedCount;
      return { ...item, badgeCount };
    });
  }, [projectCount, historyCount, queuedCount]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemsWithBadges;
    return itemsWithBadges.filter(
      (i) => i.label.toLowerCase().includes(q) || i.keywords.toLowerCase().includes(q)
    );
  }, [itemsWithBadges, search]);

  const pinnedItems = useMemo(
    () => itemsWithBadges.filter((i) => pinnedTools.includes(i.id)),
    [itemsWithBadges, pinnedTools]
  );

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

  const renderNavRow = (item: NavItemConfig, compactMode: boolean, showPinControl = true) => {
    const Icon = item.icon;
    const isActive = activeNav === item.id;
    const isPinned = pinnedTools.includes(item.id);

    return (
      <div key={item.id} className="group/row relative flex items-center">
        <button
          type="button"
          onClick={() => {
            onSelectNav(item.id);
            onCloseMobile();
          }}
          title={compactMode ? item.label : undefined}
          aria-current={isActive ? 'page' : undefined}
          className={`relative w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
            compactMode ? 'justify-center h-9 px-0' : 'h-8 px-2.5'
          } ${
            isActive
              ? 'text-[var(--stator-accent-fg)]'
              : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]'
          }`}
        >
          {isActive && (
            <motion.span
              layoutId={showPinControl || !compactMode ? 'stator-sidebar-active' : undefined}
              transition={STATOR_SPRING.tactile}
              aria-hidden="true"
              className="absolute inset-0 rounded-lg bg-[var(--stator-accent-soft)]"
            />
          )}
          <Icon className="relative z-10 w-4 h-4 shrink-0" />
          {!compactMode && (
            <>
              <span className="relative z-10 truncate flex-1 text-left">{item.label}</span>
              {typeof item.badgeCount === 'number' && (
                <span className="relative z-10 font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded bg-[var(--stator-surface-2)] text-[var(--stator-fg-subtle)] group-hover/row:hidden">
                  {item.badgeCount}
                </span>
              )}
            </>
          )}
        </button>

        {!compactMode && showPinControl && item.group !== 'System' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePinTool(item.id);
            }}
            aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
            title={isPinned ? 'Unpin from favorites' : 'Pin to favorites'}
            className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 absolute right-1.5 p-1 rounded text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface)] cursor-pointer transition-opacity"
          >
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
        )}
      </div>
    );
  };

  const renderSidebarBody = (isMobileDrawer: boolean) => {
    const compact = !isMobileDrawer && collapsed;
    const groups: Array<'Workspace' | 'Media Tools' | 'Advanced'> = [
      'Workspace',
      'Media Tools',
      'Advanced',
    ];
    const systemItems = filteredItems.filter((i) => i.group === 'System');

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
              className="w-6 h-6 shrink-0 text-[var(--stator-accent-fg)] transition-transform duration-200 group-hover:rotate-45"
              aria-hidden="true"
            >
              <rect
                x="1.5"
                y="1.5"
                width="25"
                height="25"
                rx="6.5"
                className="fill-[var(--stator-surface-2)] stroke-[var(--stator-border-strong)]"
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
                <span className="font-mono text-[10px] tabular-nums text-[var(--stator-fg-subtle)]">1.0</span>
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
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Search / Expand Toggle */}
        <div className="p-2.5 shrink-0">
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
              <Search className="w-3.5 h-3.5 text-[var(--stator-fg-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter tools…"
                aria-label="Filter navigation tools"
                className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-xs text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-subtle)] focus:outline-none focus:border-[var(--stator-accent)]"
              />
            </div>
          )}
        </div>

        {/* Scrollable Nav Groups */}
        <nav aria-label="Primary studio navigation" className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-4">
          {!search.trim() && pinnedItems.length > 0 && !compact && (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-subtle)]">
                Pinned
              </div>
              {pinnedItems.map((item) => renderNavRow(item, false, false))}
            </div>
          )}

          {groups.map((group) => {
            const groupItems = filteredItems.filter((i) => i.group === group);
            if (groupItems.length === 0) return null;
            const isGroupCollapsed = Boolean(collapsedGroups[group]) && !search.trim();

            return (
              <div key={group} className="space-y-0.5">
                {!compact && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg-muted)] cursor-pointer"
                  >
                    <span>{group}</span>
                    {isGroupCollapsed ? (
                      <ChevronRight className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}
                {(!isGroupCollapsed || compact) &&
                  groupItems.map((item) => renderNavRow(item, compact, true))}
              </div>
            );
          })}
        </nav>

        {/* Bottom System Navigation */}
        <div className="p-2.5 border-t border-[var(--stator-border)] space-y-1 shrink-0">
          {systemItems.map((item) => renderNavRow(item, compact, false))}
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
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--stator-accent)]/50 transition-colors"
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
              className="relative z-10 w-[264px] max-w-[82vw] h-full shadow-2xl"
            >
              {renderSidebarBody(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
