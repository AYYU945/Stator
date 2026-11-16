import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { canInstall, promptInstall } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => {
        void promptInstall();
      }}
      className="h-9 px-3.5 text-xs font-medium rounded-lg bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
      title="Install Stator locally for offline use"
      aria-label="Install Stator App"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden md:inline">Install App</span>
    </button>
  );
};
