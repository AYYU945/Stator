import React from 'react';
import { STATOR_RELEASES_URL } from '../lib/links.ts';

export const StatusFooter: React.FC = () => {
  return (
    <footer className="w-full border-t border-[var(--stator-border)] bg-[var(--stator-surface)] mt-auto shrink-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-end text-xs text-[var(--stator-fg-muted)]">
        <a
          href={STATOR_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] tabular-nums transition-colors duration-150"
        >
          v1.0.0
        </a>
      </div>
    </footer>
  );
};
