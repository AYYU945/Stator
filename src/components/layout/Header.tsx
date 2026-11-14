import React, { useState, useEffect } from 'react';
import {
  History,
  Settings,
  Sun,
  Moon,
  HelpCircle,
  Heart,
} from 'lucide-react';
import { WasmStatus } from '../../utils/ffmpegManager.ts';
import { ThemeMode } from '../../lib/theme.ts';

export interface HeaderProps {
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  batchMode?: boolean;
  onToggleBatchMode?: () => void;
  historyCount?: number;
  onOpenHistory?: () => void;
  isHistoryOpen?: boolean;
  onOpenHelp?: () => void;
  isHelpOpen?: boolean;
  onOpenPresets?: () => void;
  wasmStatus?: WasmStatus;
  theme?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  historyCount = 0,
  onOpenHistory,
  isHistoryOpen = false,
  onOpenHelp,
  isHelpOpen = false,
  onOpenPresets,
  wasmStatus = 'active',
  onThemeChange,
  onToggleTheme,
}) => {
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

            <span className="font-semibold tracking-tight text-zinc-900 dark:text-white text-base">
              Stator
            </span>
          </div>
        </div>

        {/* Center: Clean breathing room */}
        <div className="flex-1" />

        {/* Right Utility Cluster: GitHub Repo, Sponsor, Theme Toggle, History, Help & FAQ, and Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* GitHub Repository Link */}
          <a
            href="https://github.com/stator-media/stator"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-2.5 text-xs font-medium rounded-md bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="View Stator source code on GitHub"
            aria-label="View source on GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
          </a>

          {/* Optional Non-Gating Sponsor Link */}
          <a
            href="https://github.com/sponsors/stator-media"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-2.5 text-xs font-medium rounded-md bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Support Stator open-source development"
            aria-label="Sponsor Stator on GitHub"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Sponsor</span>
          </a>

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

          {/* Help & FAQ Trigger Button */}
          <button
            onClick={onOpenHelp}
            className={`w-8 h-8 flex items-center justify-center border cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md ${
              isHelpOpen
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
            title="Help & FAQ"
            aria-label="Help & FAQ"
          >
            <HelpCircle className="w-4 h-4" />
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
        </div>
      </div>
    </header>
  );
};
