import React, { useState, useEffect } from 'react';
import {
  History,
  Settings,
  User,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { WasmStatus } from '../../utils/ffmpegManager.ts';
import { ThemeMode } from '../../lib/theme.ts';
import { useLicense } from '../../lib/license.ts';

export interface HeaderProps {
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  batchMode?: boolean;
  onToggleBatchMode?: () => void;
  historyCount?: number;
  onOpenHistory?: () => void;
  isHistoryOpen?: boolean;
  onOpenPresets?: () => void;
  wasmStatus?: WasmStatus;
  theme?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
  onToggleTheme?: () => void;
  onOpenPro?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  historyCount = 0,
  onOpenHistory,
  isHistoryOpen = false,
  onOpenPresets,
  wasmStatus = 'active',
  onThemeChange,
  onToggleTheme,
  onOpenPro,
}) => {
  const { isPro } = useLicense();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

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

  const handleToggleTheme = () => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
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

    window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
  };

  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Stator Brand and Static Solid 6px Status Dot */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-4 h-4 text-zinc-800 dark:text-zinc-200"
              >
                <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-zinc-900 dark:text-white text-base">
                Stator
              </span>

              {/* Static Solid 6px Status Dot with Tooltip */}
              <div
                className="relative flex items-center justify-center p-0.5 cursor-help"
                title={wasmStatus === 'loading' ? 'Loading WASM Core...' : 'WASM Engine Active (100% Client-Side)'}
                aria-label="WASM Engine Active"
              >
                {wasmStatus === 'loading' ? (
                  <Loader2 className="w-3 h-3 text-zinc-500 dark:text-zinc-400 animate-spin" />
                ) : (
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Clean breathing room */}
        <div className="flex-1" />

        {/* Right Utility Cluster: Pro Status, Theme Toggle, History, Settings, and Profile Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Stator Pro Status / Upgrade Badge */}
          {isPro ? (
            <button
              onClick={onOpenPro}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Stator Pro Active"
            >
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500" />
              <span>PRO</span>
            </button>
          ) : (
            <button
              onClick={onOpenPro}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Upgrade</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-sm">
                PRO
              </span>
            </button>
          )}

          {/* Theme Mode Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="w-8 h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle appearance theme"
          >
            {isDarkMode ? (
              <Moon className="w-4 h-4 text-zinc-400 hover:text-zinc-100 transition-colors duration-150" />
            ) : (
              <Sun className="w-4 h-4 text-zinc-700 hover:text-zinc-900 transition-colors duration-150" />
            )}
          </button>

          {/* History Trigger Button with Count Badge */}
          <button
            onClick={onOpenHistory}
            className={`relative w-8 h-8 flex items-center justify-center border cursor-pointer text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md ${
              isHistoryOpen
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            }`}
            title="Conversion History"
            aria-label="Conversion History"
          >
            <History className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900 text-[9px] font-bold flex items-center justify-center shadow-sm">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings Gear Button */}
          <button
            onClick={onOpenPresets}
            className="w-8 h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center cursor-pointer text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md"
            title="Presets and Conversion Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile Avatar */}
          <button
            className="w-8 h-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center cursor-pointer text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md"
            title="User Profile"
            aria-label="User Profile"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
