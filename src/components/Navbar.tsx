import React from 'react';
import {
  History,
  Settings,
  User,
  Loader2,
} from 'lucide-react';
import { WasmStatus } from '../utils/ffmpegManager.ts';

interface NavbarProps {
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  batchMode?: boolean;
  onToggleBatchMode?: () => void;
  historyCount?: number;
  onOpenHistory?: () => void;
  isHistoryOpen?: boolean;
  onOpenPresets?: () => void;
  wasmStatus?: WasmStatus;
}

export const Navbar: React.FC<NavbarProps> = ({
  historyCount = 0,
  onOpenHistory,
  isHistoryOpen = false,
  onOpenPresets,
  wasmStatus = 'active',
}) => {
  return (
    <header className="w-full border-b border-zinc-800 bg-[#09090b]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* ========================================================================= */}
        {/* Left Side: Logo and Static Solid Status Dot with Tooltip */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-zinc-200"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                OmniConvert
              </span>

              {/* Static Solid Status Dot */}
              <div
                className="relative flex items-center justify-center p-1 cursor-help"
                title={wasmStatus === 'loading' ? 'Loading WASM Core...' : 'WASM Engine Active (100% Client-Side)'}
                aria-label="WASM Engine Active"
              >
                {wasmStatus === 'loading' ? (
                  <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
                ) : (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Center: Blank / clean breathing room (no tabs) */}
        {/* ========================================================================= */}
        <div className="flex-1" />

        {/* ========================================================================= */}
        {/* Right Utility Cluster: History, Settings, and Profile Buttons */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 shrink-0">
          {/* History Trigger Button with Count Badge */}
          <button
            onClick={onOpenHistory}
            className={`relative w-8 h-8 flex items-center justify-center border cursor-pointer text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md ${
              isHistoryOpen
                ? 'bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm'
                : 'bg-zinc-900 border-zinc-800'
            }`}
            title="Conversion History"
            aria-label="Conversion History"
          >
            <History className="w-4 h-4" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-md bg-zinc-200 text-[9px] font-bold text-zinc-900 flex items-center justify-center shadow-sm">
                {historyCount}
              </span>
            )}
          </button>

          {/* Settings Gear Button */}
          <button
            onClick={onOpenPresets}
            className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center cursor-pointer text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md"
            title="Presets and Conversion Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile Avatar */}
          <button
            className="w-8 h-8 bg-zinc-900 border border-zinc-800 flex items-center justify-center cursor-pointer text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-[0.97] transition-all duration-150 ease-out rounded-md"
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
