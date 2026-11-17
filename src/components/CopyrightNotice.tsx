import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  GITHUB_DMCA_POLICY_URL,
  LegalRoute,
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_MAINTAINER,
  STATOR_MAINTAINER_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
  STATOR_THIRD_PARTY_NOTICES_URL,
} from '../lib/links.ts';

export interface CopyrightNoticeProps {
  onBack: () => void;
  onNavigateLegal?: (route: Exclude<LegalRoute, 'none'>) => void;
}

export const CopyrightNotice: React.FC<CopyrightNoticeProps> = ({ onBack, onNavigateLegal }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 text-[var(--stator-fg-muted)]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--stator-border)] pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio</span>
        </button>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--stator-fg-subtle)]">
          <a
            href={STATOR_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--stator-fg)] transition-colors"
          >
            <span>AYYU945/Stator</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={STATOR_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--stator-fg)] transition-colors"
          >
            v1.0.0
          </a>
        </div>
      </div>

      <div className="space-y-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)] mb-2">
            Copyright &amp; DMCA Notice
          </h1>
          <p className="text-sm text-[var(--stator-fg-muted)] leading-relaxed">
            Copyright, third-party codec attribution, and GitHub takedown information for the
            Stator open-source project.
          </p>
        </div>

        <div className="divide-y divide-[var(--stator-border)] border-t border-b border-[var(--stator-border)]">
          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">01</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                MIT Licensing &amp; Source Code
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Stator&apos;s original source code, interface components, and worker pipelines are
              Copyright (c) 2026 Stator Contributors and released under the{' '}
              <a
                href={STATOR_LICENSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
              >
                MIT License
              </a>{' '}
              in the{' '}
              <a
                href={STATOR_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
              >
                AYYU945/Stator
              </a>{' '}
              repository.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">02</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Third-Party Codecs &amp; Libraries
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Browser-side video and audio transcoding uses self-hosted{' '}
              <code className="font-mono text-xs">@ffmpeg/core</code> and{' '}
              <code className="font-mono text-xs">@ffmpeg/core-mt</code> WebAssembly binaries
              (containing LGPL/GPL components such as <code className="font-mono text-xs">libx264</code>
              ), alongside self-hosted OFL-1.1 fonts and MIT/ISC open-source packages. Complete
              license details and upstream source links are maintained in{' '}
              <a
                href={STATOR_THIRD_PARTY_NOTICES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
              >
                THIRD_PARTY_NOTICES.md
              </a>
              .
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">03</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                No Hosted User Media
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Stator runs strictly inside each user&apos;s local browser and does not upload, host,
              store, or distribute user media files on any central server.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">04</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Copyright Contact &amp; GitHub Takedown Procedure
              </h2>
            </div>
            <div className="md:col-span-8 space-y-3 text-sm leading-relaxed">
              <p>
                For copyright, attribution, or license questions regarding the Stator repository,
                open an issue on GitHub or reach the maintainer via the repository:
              </p>
              <div className="bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-lg p-3.5 text-xs font-mono text-[var(--stator-fg)] space-y-1">
                <div>
                  Maintainer:{' '}
                  <a
                    href={STATOR_MAINTAINER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:opacity-80"
                  >
                    {STATOR_MAINTAINER}
                  </a>
                </div>
                <div className="text-[var(--stator-fg-muted)]">
                  Repository:{' '}
                  <a
                    href={STATOR_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-[var(--stator-fg)]"
                  >
                    {STATOR_REPO_URL}
                  </a>
                </div>
                <div className="text-[var(--stator-fg-muted)]">
                  Issues:{' '}
                  <a
                    href={STATOR_ISSUES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-[var(--stator-fg)]"
                  >
                    {STATOR_ISSUES_URL}
                  </a>
                </div>
              </div>
              <p>
                For formal DMCA copyright removal requests concerning files hosted in the{' '}
                <code className="font-mono text-xs">AYYU945/Stator</code> GitHub repository, please
                follow{' '}
                <a
                  href={GITHUB_DMCA_POLICY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
                >
                  GitHub&apos;s official DMCA Takedown Policy
                </a>
                .
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-[var(--stator-fg-subtle)]">
          <span>
            Maintainer:{' '}
            <a
              href={STATOR_MAINTAINER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4"
            >
              {STATOR_MAINTAINER}
            </a>
          </span>
          {onNavigateLegal && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigateLegal('privacy')}
                className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal('terms')}
                className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
              >
                Software Terms &amp; License
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
