import React from 'react';
import {
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
} from '../lib/links.ts';

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
  const handleInternalNav = (
    e: React.MouseEvent<HTMLAnchorElement>,
    handler?: () => void
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  return (
    <footer className="w-full border-t border-[var(--stator-border)] bg-[var(--stator-surface)] mt-auto shrink-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs text-[var(--stator-fg-muted)]">
        <div className="flex items-center gap-2 text-[var(--stator-fg)] font-medium">
          <span>Stator</span>
          <span aria-hidden="true" className="text-[var(--stator-fg-muted)]">·</span>
          <span className="text-[var(--stator-fg-muted)] font-normal">
            100% Local Media Workspace
          </span>
        </div>

        <nav
          aria-label="Legal and repository links"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          <a
            href="/privacy"
            onClick={(e) => handleInternalNav(e, onNavigatePrivacy)}
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors duration-150"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            onClick={(e) => handleInternalNav(e, onNavigateTerms)}
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors duration-150"
          >
            Software Terms &amp; License
          </a>
          <a
            href="/dmca"
            onClick={(e) => handleInternalNav(e, onNavigateDmca)}
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors duration-150"
          >
            Copyright &amp; DMCA
          </a>

          <span aria-hidden="true" className="hidden sm:inline text-[var(--stator-border-strong)]">
            |
          </span>

          <a
            href={STATOR_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors duration-150"
          >
            GitHub
          </a>
          <a
            href={STATOR_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors duration-150"
          >
            Report Bug
          </a>
          <a
            href={STATOR_LICENSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors duration-150"
          >
            MIT License
          </a>
          <a
            href={STATOR_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] tabular-nums transition-colors duration-150"
          >
            v1.0.0
          </a>
        </nav>
      </div>
    </footer>
  );
};
