import React from 'react';
import { WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAInstall();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full px-4 py-2.5 bg-[var(--stator-surface)] border-b border-[var(--stator-border)] text-xs text-[var(--stator-fg)] flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-[var(--stator-warning)] shrink-0" />
        <span>Offline Mode Active — Self-hosted WASM and Worker pipelines remain available.</span>
      </div>
      <span className="font-mono text-[11px] text-[var(--stator-fg-muted)] shrink-0">
        On-device
      </span>
    </div>
  );
};
