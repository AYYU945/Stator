import React from 'react';

interface StatusFooterProps {
  onNavigatePrivacy?: () => void;
  onNavigateTerms?: () => void;
  onNavigateDmca?: () => void;
}

export const StatusFooter: React.FC<StatusFooterProps> = ({
  onNavigatePrivacy,
  onNavigateTerms,
  onNavigateDmca,
}) => {
  const handleDmcaClick = () => {
    if (onNavigateDmca) {
      onNavigateDmca();
    } else if (onNavigateTerms) {
      onNavigateTerms();
      window.setTimeout(() => {
        const dmcaEl = document.getElementById('dmca-notice');
        if (dmcaEl) {
          dmcaEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  };

  return (
    <footer className="w-full border-t border-[var(--stator-border)] bg-[var(--stator-surface)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--stator-fg-subtle)]">
        <div className="flex items-center gap-2 text-[var(--stator-fg-muted)] font-medium">
          <span>Stator</span>
          <span aria-hidden="true">·</span>
          <span>100% Client-Side Media Engine</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
          <button
            type="button"
            onClick={onNavigatePrivacy}
            className="text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] transition-colors duration-150 cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={onNavigateTerms}
            className="text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] transition-colors duration-150 cursor-pointer"
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={handleDmcaClick}
            className="text-[var(--stator-fg-subtle)] hover:text-[var(--stator-fg)] transition-colors duration-150 cursor-pointer"
          >
            DMCA Notice
          </button>
          <span className="font-mono text-[var(--stator-fg-subtle)] tabular-nums">
            MIT Open Source · v2.0.0
          </span>
        </div>
      </div>
    </footer>
  );
};
