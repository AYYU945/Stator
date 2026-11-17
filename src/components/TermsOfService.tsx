import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  LegalRoute,
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_MAINTAINER,
  STATOR_MAINTAINER_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
  STATOR_THIRD_PARTY_NOTICES_URL,
} from '../lib/links.ts';

export interface TermsOfServiceProps {
  onBack: () => void;
  onNavigateLegal?: (route: Exclude<LegalRoute, 'none'>) => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack, onNavigateLegal }) => {
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
            Software Terms &amp; License
          </h1>
          <p className="text-sm text-[var(--stator-fg-muted)] leading-relaxed">
            Stator is free, open-source software distributed under the MIT License via{' '}
            <a
              href={STATOR_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
            >
              github.com/AYYU945/Stator
            </a>
            . It runs locally in your browser without accounts, subscriptions, or remote processing.
          </p>
        </div>

        <div className="divide-y divide-[var(--stator-border)] border-t border-b border-[var(--stator-border)]">
          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">01</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                MIT License Permissions
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <p>
                Stator&apos;s application source code is licensed under the MIT License. You are free
                to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
                the software for personal, educational, or commercial purposes, subject only to
                preserving the copyright notice and permission notice in{' '}
                <a
                  href={STATOR_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
                >
                  LICENSE
                </a>
                .
              </p>
              <p>
                Nothing in this summary limits or overrides any rights granted to you under the MIT
                License.
              </p>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">02</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Your Media &amp; User Responsibility
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <p>
                You retain complete ownership and all rights to every image, video, audio track, and
                document you process with Stator. No rights in your files are transferred to Stator
                or its contributors.
              </p>
              <p>
                Because Stator runs strictly on your device as a local software tool, you are solely
                responsible for the files you select, convert, and distribute, and for ensuring you
                hold the necessary rights or permissions to process them.
              </p>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">03</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Local Hardware &amp; Browser Bounds
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Performance, codec availability (such as native AVIF canvas support and
              Cross-Origin-Isolated <code className="font-mono text-xs">SharedArrayBuffer</code>{' '}
              multi-threading), and file-size capacity depend on your local CPU, RAM, and browser.
              32-bit WebAssembly virtual memory (<code className="font-mono text-xs">MEMFS</code>)
              enforces a 500 MB warning threshold and a 1.8 GB per-file ceiling.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">04</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Third-Party WebAssembly Codecs &amp; Dependencies
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Video and audio transcoding loads self-hosted{' '}
              <code className="font-mono text-xs">@ffmpeg/core</code> and{' '}
              <code className="font-mono text-xs">@ffmpeg/core-mt</code> WebAssembly binaries
              locally. These builds include FFmpeg codecs (including{' '}
              <code className="font-mono text-xs">libx264</code> licensed under GPL-2.0-or-later and
              LGPL/BSD codec libraries), alongside bundled fonts and npm dependencies under their own
              open-source licenses. See{' '}
              <a
                href={STATOR_THIRD_PARTY_NOTICES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
              >
                THIRD_PARTY_NOTICES.md
              </a>{' '}
              and{' '}
              <a
                href={STATOR_LICENSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
              >
                LICENSE
              </a>{' '}
              for full details.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">05</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Warranty &amp; Liability Disclaimer (MIT)
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              In accordance with the MIT License, the software is provided &ldquo;AS IS&rdquo;,
              without warranty of any kind, express or implied, including but not limited to the
              warranties of merchantability, fitness for a particular purpose, and noninfringement.
              In no event shall the authors or copyright holders be liable for any claim, damages, or
              other liability arising from, out of, or in connection with the software.
            </p>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-[var(--stator-fg-subtle)]">
          <div className="flex flex-wrap items-center gap-4">
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
            <a
              href={STATOR_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4"
            >
              Report a Bug
            </a>
          </div>
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
                onClick={() => onNavigateLegal('dmca')}
                className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
              >
                Copyright &amp; DMCA Notice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
