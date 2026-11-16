import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  Settings2,
  Sun,
  Moon,
  HelpCircle,
  Menu,
  X,
  Heart,
  Command,
} from 'lucide-react';
import { WasmStatus } from '../../utils/ffmpegManager.ts';
import { ThemeMode } from '../../lib/theme.ts';
import { STATOR_SPRING, STATOR_TRANSITION } from '../../lib/motion.ts';
import { PWAInstallButton } from '../PWAInstallButton.tsx';

export type WorkspaceViewMode = 'converter' | 'gif-studio' | 'history' | 'guide';

export interface HeaderProps {
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  batchMode?: boolean;
  onToggleBatchMode?: () => void;
  workspaceMode?: WorkspaceViewMode;
  onSelectWorkspaceMode?: (mode: WorkspaceViewMode) => void;
  onNavigateHome?: () => void;
  queuedCount?: number;
  historyCount?: number;
  onOpenHistory?: () => void;
  isHistoryOpen?: boolean;
  onOpenHelp?: () => void;
  isHelpOpen?: boolean;
  onOpenPresets?: () => void;
  onOpenCommandPalette?: () => void;
  wasmStatus?: WasmStatus;
  theme?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workspaceMode = 'converter',
  onSelectWorkspaceMode,
  onNavigateHome,
  queuedCount = 0,
  historyCount = 0,
  onOpenHistory,
  isHistoryOpen = false,
  onOpenHelp,
  isHelpOpen = false,
  onOpenPresets,
  onOpenCommandPalette,
  onThemeChange,
  onToggleTheme,
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDarkState = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    updateDarkState();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          updateDarkState();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  const handleToggleTheme = () => {
    const root = document.documentElement;
    const currentlyDark = root.classList.contains('dark');
    const newTheme: ThemeMode = currentlyDark ? 'light' : 'dark';

    try {
      localStorage.setItem('stator_theme', newTheme);
      localStorage.setItem('omniconvert_theme', newTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }

    if (newTheme === 'dark') {
      root.classList.add('dark');
      setIsDarkMode(true);
    } else {
      root.classList.remove('dark');
      setIsDarkMode(false);
    }

    if (onThemeChange) {
      onThemeChange(newTheme);
    } else if (onToggleTheme) {
      onToggleTheme();
    }
  };

  const handleSelectMode = (mode: WorkspaceViewMode) => {
    onNavigateHome?.();
    if (onSelectWorkspaceMode) {
      onSelectWorkspaceMode(mode);
    } else if (mode === 'history' && onOpenHistory) {
      onOpenHistory();
    } else if (mode === 'guide' && onOpenHelp) {
      onOpenHelp();
    }
  };

  const isHistoryActive = workspaceMode === 'history' || isHistoryOpen;
  const isGuideActive = workspaceMode === 'guide' || isHelpOpen;

  const navItems: Array<{
    id: WorkspaceViewMode;
    label: string;
    count?: number;
    active: boolean;
  }> = [
    { id: 'converter', label: 'Converter', count: queuedCount, active: workspaceMode === 'converter' },
    { id: 'gif-studio', label: 'GIF Studio', active: workspaceMode === 'gif-studio' },
    { id: 'history', label: 'History', count: historyCount, active: isHistoryActive },
    { id: 'guide', label: 'Guide', active: isGuideActive },
  ];

  return (
    <header className="w-full border-b border-[var(--stator-border)] bg-[var(--stator-surface)]/92 backdrop-blur-md sticky top-0 z-50 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark + Emblem */}
        <button
          type="button"
          onClick={() => handleSelectMode('converter')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group focus-visible:rounded-md active:scale-[0.98] transition-transform"
          aria-label="Stator home"
        >
          <svg
            viewBox="0 0 28 28"
            fill="none"
            className="w-7 h-7 shrink-0 text-[var(--stator-accent-fg)] transition-transform duration-200 ease-out group-hover:rotate-45"
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
          <span className="font-serif font-semibold tracking-tight text-[var(--stator-fg)] text-[19px] leading-none whitespace-nowrap shrink-0">
            Stator
          </span>
        </button>

        {/* Zone 2: Single-Line Navigation Links with Shared Spring Underline */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-[13px] font-medium h-full"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectMode(item.id)}
              className={`relative h-full flex items-center whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                item.active
                  ? 'text-[var(--stator-fg)]'
                  : 'text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{item.label}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-mono tabular-nums text-[11px] text-[var(--stator-accent-fg)]">
                    ({item.count})
                  </span>
                )}
              </span>
              {item.active && (
                <motion.span
                  layoutId="stator-nav-indicator"
                  transition={STATOR_SPRING.tactile}
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--stator-accent)]"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: Focused Utility Actions + Animated Mobile Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />

          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[var(--stator-surface-2)]/70 hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] text-[11px] font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.97]"
              title="Open Command Palette (Cmd/Ctrl+K)"
              aria-label="Open Command Palette"
            >
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>
          )}

          {/* Mobile History Quick Access */}
          <button
            type="button"
            onClick={() => handleSelectMode('history')}
            className={`md:hidden relative w-9 h-9 flex items-center justify-center rounded-lg border cursor-pointer transition-colors active:scale-[0.97] ${
              isHistoryActive
                ? 'bg-[var(--stator-surface-2)] border-[var(--stator-border-strong)] text-[var(--stator-fg)]'
                : 'bg-[var(--stator-surface)] border-[var(--stator-border)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)]'
            }`}
            aria-label="Conversion History"
            title="Conversion History"
          >
            <History className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--stator-accent)]" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="w-9 h-9 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] hover:border-[var(--stator-border-strong)] hover:bg-[var(--stator-surface-2)] flex items-center justify-center cursor-pointer text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors active:scale-[0.97]"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary Presets Action */}
          <button
            type="button"
            onClick={onOpenPresets}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--stator-surface-2)] hover:bg-[var(--stator-border)] border border-[var(--stator-border)] text-[var(--stator-fg)] text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]"
            title="Configure global presets & defaults"
          >
            <Settings2 className="w-3.5 h-3.5 text-[var(--stator-accent-fg)]" />
            <span>Presets</span>
          </button>

          {/* Mobile Drawer Menu (< md) */}
          <div className="relative md:hidden" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Navigation menu"
              className="w-9 h-9 rounded-lg bg-[var(--stator-surface)] border border-[var(--stator-border)] flex items-center justify-center cursor-pointer text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] active:scale-[0.97]"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={STATOR_TRANSITION.overlay}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] shadow-xl p-1.5 z-50 space-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSelectMode('converter');
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      workspaceMode === 'converter'
                        ? 'bg-[var(--stator-accent-soft)] text-[var(--stator-accent-fg)]'
                        : 'text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]'
                    }`}
                  >
                    <span>Converter</span>
                    {queuedCount > 0 && (
                      <span className="font-mono tabular-nums text-[11px]">{queuedCount}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSelectMode('gif-studio');
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      workspaceMode === 'gif-studio'
                        ? 'bg-[var(--stator-accent-soft)] text-[var(--stator-accent-fg)]'
                        : 'text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]'
                    }`}
                  >
                    <span>GIF Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSelectMode('history');
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-left text-xs font-medium flex items-center justify-between cursor-pointer ${
                      isHistoryActive
                        ? 'bg-[var(--stator-accent-soft)] text-[var(--stator-accent-fg)]'
                        : 'text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]'
                    }`}
                  >
                    <span>History &amp; Privacy</span>
                    {historyCount > 0 && (
                      <span className="font-mono tabular-nums text-[11px]">{historyCount}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSelectMode('guide');
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg text-left text-xs font-medium flex items-center gap-2 cursor-pointer ${
                      isGuideActive
                        ? 'bg-[var(--stator-accent-soft)] text-[var(--stator-accent-fg)]'
                        : 'text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[var(--stator-fg-muted)]" />
                    <span>Architecture Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenPresets?.();
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-left text-xs font-medium text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] flex items-center gap-2 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-[var(--stator-fg-muted)]" />
                    <span>Global Presets</span>
                  </button>
                  <div className="my-1 border-t border-[var(--stator-border)]" />
                  <a
                    href="https://github.com/stator-media/stator"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] block"
                  >
                    GitHub Source
                  </a>
                  <a
                    href="https://github.com/sponsors/stator-media"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] hover:bg-[var(--stator-surface-2)] flex items-center gap-2"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sponsor Open Source</span>
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
