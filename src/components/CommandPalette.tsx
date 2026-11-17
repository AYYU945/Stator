import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
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
  FolderOpen,
  Sparkles,
  Zap,
  Sun,
  Moon,
  Trash2,
  Download,
  FilePlus2,
  Code2,
  Bug,
  Scale,
  Tag,
  ShieldCheck,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { NavToolId } from '../types/settings.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../lib/motion.ts';
import {
  LegalRoute,
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
  STATOR_THIRD_PARTY_NOTICES_URL,
} from '../lib/links.ts';

export interface CommandPaletteAction {
  id: string;
  label: string;
  section: 'Navigation' | 'Studio & Files' | 'Preferences' | 'Open Source & Legal';
  shortcut?: string;
  keywords?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  href?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  hasQueuedFiles: boolean;
  readyCount: number;
  activeNav: NavToolId;
  onSelectNav: (nav: NavToolId) => void;
  onNavigateLegal?: (route: Exclude<LegalRoute, 'none'>) => void;
  onCreateBlankProject: () => void;
  onChooseFiles: () => void;
  onLoadSamples: () => void;
  onConvertAll: () => void;
  onClearQueue: () => void;
  onOpenExportCenter: () => void;
  onOpenPresets: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  hasQueuedFiles,
  readyCount,
  activeNav,
  onSelectNav,
  onNavigateLegal,
  onCreateBlankProject,
  onChooseFiles,
  onLoadSamples,
  onConvertAll,
  onClearQueue,
  onOpenExportCenter,
  onOpenPresets,
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
    const navMap: Array<{ id: NavToolId; label: string; icon: React.ReactNode; kw: string }> = [
      { id: 'home', label: 'Go to Home Dashboard', icon: <Home className="w-4 h-4" />, kw: 'home start recent projects' },
      { id: 'projects', label: 'Open Saved Projects', icon: <FolderKanban className="w-4 h-4" />, kw: 'projects library list' },
      { id: 'converter', label: 'Open Converter Studio', icon: <ArrowLeftRight className="w-4 h-4" />, kw: 'convert transcode studio' },
      { id: 'compressor', label: 'Open Smart Compressor', icon: <Minimize2 className="w-4 h-4" />, kw: 'compress shrink mb size' },
      { id: 'video', label: 'Open Video Studio', icon: <Video className="w-4 h-4" />, kw: 'video trim split merge captions' },
      { id: 'images', label: 'Open Image Studio', icon: <ImageIcon className="w-4 h-4" />, kw: 'image crop resize watermark icon' },
      { id: 'audio', label: 'Open Audio Studio', icon: <Music className="w-4 h-4" />, kw: 'audio waveform lufs silence eq' },
      { id: 'gif-studio', label: 'Open GIF & Animation Studio', icon: <Film className="w-4 h-4" />, kw: 'gif webp sprite animation' },
      { id: 'batch', label: 'Open Batch Queue', icon: <Layers className="w-4 h-4" />, kw: 'batch queue zip multiple' },
      { id: 'quality-lab', label: 'Open Quality Comparison Lab', icon: <FlaskConical className="w-4 h-4" />, kw: 'quality psnr compare split' },
      { id: 'pipelines', label: 'Open Smart Pipelines', icon: <Workflow className="w-4 h-4" />, kw: 'pipelines recipe automation' },
      { id: 'history', label: 'Open History & Cache Ledger', icon: <History className="w-4 h-4" />, kw: 'history indexeddb cache' },
      { id: 'settings', label: 'Open Settings', icon: <Settings className="w-4 h-4" />, kw: 'settings preferences workers storage' },
      { id: 'help', label: 'Open Architecture & Engine Guide', icon: <HelpCircle className="w-4 h-4" />, kw: 'help guide faq wasm' },
    ];

    const navActions: CommandPaletteAction[] = navMap.map((n) => ({
      id: `nav-${n.id}`,
      label: n.label,
      section: 'Navigation',
      shortcut: activeNav === n.id ? 'Active' : undefined,
      keywords: n.kw,
      icon: n.icon,
      onSelect: () => onSelectNav(n.id),
    }));

    const fileAndStudio: CommandPaletteAction[] = [
      {
        id: 'new-blank-project',
        label: 'Create New Blank Studio Project',
        section: 'Studio & Files',
        keywords: 'new project create',
        icon: <FilePlus2 className="w-4 h-4" />,
        onSelect: onCreateBlankProject,
      },
      {
        id: 'choose-files',
        label: 'Import Media Files from Disk',
        section: 'Studio & Files',
        shortcut: 'O',
        keywords: 'upload add open file browse',
        icon: <FolderOpen className="w-4 h-4" />,
        onSelect: onChooseFiles,
      },
      {
        id: 'load-samples',
        label: 'Load Sample Test Media',
        section: 'Studio & Files',
        keywords: 'demo test synthetic sample wav png',
        icon: <Sparkles className="w-4 h-4" />,
        onSelect: onLoadSamples,
      },
      {
        id: 'open-export-center',
        label: 'Open Unified Export Center',
        section: 'Studio & Files',
        keywords: 'export zip folder download',
        icon: <Download className="w-4 h-4" />,
        onSelect: onOpenExportCenter,
      },
      {
        id: 'convert-all',
        label: `Run All Pending Conversions${readyCount > 0 ? ` (${readyCount})` : ''}`,
        section: 'Studio & Files',
        keywords: 'run start encode transcode batch',
        icon: <Zap className="w-4 h-4" />,
        disabled: !hasQueuedFiles,
        onSelect: onConvertAll,
      },
      {
        id: 'clear-queue',
        label: 'Clear Current Studio Queue',
        section: 'Studio & Files',
        keywords: 'reset remove empty queue',
        icon: <Trash2 className="w-4 h-4" />,
        disabled: !hasQueuedFiles,
        onSelect: onClearQueue,
      },
    ];

    const prefs: CommandPaletteAction[] = [
      {
        id: 'open-presets',
        label: 'Configure Global Saved Presets',
        section: 'Preferences',
        keywords: 'presets defaults quality crf',
        icon: <SlidersHorizontal className="w-4 h-4" />,
        onSelect: onOpenPresets,
      },
      {
        id: 'toggle-theme',
        label: isDark ? 'Switch to Light (Soft Ivory)' : 'Switch to Dark (Graphite Black)',
        section: 'Preferences',
        shortcut: 'T',
        keywords: 'theme light dark color appearance',
        icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        onSelect: onToggleTheme,
      },
    ];

    const openSourceAndLegal: CommandPaletteAction[] = [
      ...(onNavigateLegal
        ? [
            {
              id: 'legal-privacy',
              label: 'Open Privacy Policy',
              section: 'Open Source & Legal' as const,
              keywords: 'privacy local storage indexeddb ephemeral',
              icon: <ShieldCheck className="w-4 h-4" />,
              onSelect: () => onNavigateLegal('privacy'),
            },
            {
              id: 'legal-terms',
              label: 'Open Software Terms & License',
              section: 'Open Source & Legal' as const,
              keywords: 'terms license mit warranty',
              icon: <Scale className="w-4 h-4" />,
              onSelect: () => onNavigateLegal('terms'),
            },
            {
              id: 'legal-dmca',
              label: 'Open Copyright & DMCA Notice',
              section: 'Open Source & Legal' as const,
              keywords: 'copyright dmca github notice',
              icon: <FileText className="w-4 h-4" />,
              onSelect: () => onNavigateLegal('dmca'),
            },
          ]
        : []),
      {
        id: 'github-repo',
        label: 'Open GitHub Repository (AYYU945/Stator)',
        section: 'Open Source & Legal',
        keywords: 'github source code repository',
        icon: <Code2 className="w-4 h-4" />,
        href: STATOR_REPO_URL,
        onSelect: () => {},
      },
      {
        id: 'github-bug',
        label: 'Report a Bug on GitHub',
        section: 'Open Source & Legal',
        keywords: 'bug report issue feedback github',
        icon: <Bug className="w-4 h-4" />,
        href: STATOR_ISSUES_URL,
        onSelect: () => {},
      },
      {
        id: 'github-releases',
        label: 'View Stator Releases (v1.0.0)',
        section: 'Open Source & Legal',
        keywords: 'release changelog version v1.0.0 github',
        icon: <Tag className="w-4 h-4" />,
        href: STATOR_RELEASES_URL,
        onSelect: () => {},
      },
      {
        id: 'github-license',
        label: 'View MIT License on GitHub',
        section: 'Open Source & Legal',
        keywords: 'mit license legal',
        icon: <Scale className="w-4 h-4" />,
        href: STATOR_LICENSE_URL,
        onSelect: () => {},
      },
      {
        id: 'github-notices',
        label: 'View Third-Party Notices',
        section: 'Open Source & Legal',
        keywords: 'third party notices ffmpeg codecs fonts',
        icon: <FileText className="w-4 h-4" />,
        href: STATOR_THIRD_PARTY_NOTICES_URL,
        onSelect: () => {},
      },
    ];

    return [...fileAndStudio, ...navActions, ...prefs, ...openSourceAndLegal].filter(
      (item) => !item.disabled
    );
  }, [
    activeNav,
    hasQueuedFiles,
    readyCount,
    isDark,
    onSelectNav,
    onNavigateLegal,
    onCreateBlankProject,
    onChooseFiles,
    onLoadSamples,
    onOpenExportCenter,
    onConvertAll,
    onClearQueue,
    onOpenPresets,
    onToggleTheme,
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
        const chosen = filtered[selectedIndex];
        if (chosen.href) {
          const el = document.querySelector<HTMLAnchorElement>(`[data-cmd-id="${chosen.id}"]`);
          el?.click();
        } else {
          chosen.onSelect();
        }
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
                placeholder="Jump to project, tool, pipeline, or export…"
                aria-label="Search commands"
                className="w-full bg-transparent text-sm text-[var(--stator-fg)] placeholder:text-[var(--stator-fg-subtle)] focus:outline-none"
              />
              <kbd className="text-[10px] font-mono text-[var(--stator-fg-subtle)] px-1.5 py-0.5 rounded border border-[var(--stator-border)] bg-[var(--stator-surface-2)] shrink-0">
                ESC
              </kbd>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--stator-fg-muted)]">
                  No matching workspace commands
                </p>
              ) : (
                filtered.map((action, idx) => {
                  const isHighlighted = idx === selectedIndex;
                  const inner = (
                    <>
                      {isHighlighted && (
                        <motion.span
                          layoutId="stator-cmd-highlight"
                          transition={STATOR_SPRING.tactile}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg bg-[var(--stator-surface-2)] border border-[var(--stator-border)]"
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                        <span
                          className={
                            isHighlighted
                              ? 'text-[var(--stator-fg)]'
                              : 'text-[var(--stator-fg-muted)]'
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
                        {action.href ? (
                          <ExternalLink className="w-3 h-3 text-[var(--stator-fg-muted)]" />
                        ) : (
                          action.shortcut && (
                            <span className="font-mono text-[10px] text-[var(--stator-fg-muted)] px-1.5 py-0.5 rounded border border-[var(--stator-border)] bg-[var(--stator-surface)]">
                              {action.shortcut}
                            </span>
                          )
                        )}
                      </div>
                    </>
                  );

                  if (action.href) {
                    return (
                      <a
                        key={action.id}
                        data-cmd-id={action.id}
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={onClose}
                        className="relative w-full px-3 py-2.5 rounded-lg text-left text-xs flex items-center justify-between gap-3 cursor-pointer"
                      >
                        {inner}
                      </a>
                    );
                  }

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
                      {inner}
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
