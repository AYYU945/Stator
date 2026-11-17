import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  LegalRoute,
  STATOR_CONTACT_EMAIL,
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
  STATOR_THIRD_PARTY_NOTICES_URL,
} from '../lib/links.ts';

export interface PrivacyPolicyProps {
  onBack: () => void;
  onNavigateLegal?: (route: Exclude<LegalRoute, 'none'>) => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack, onNavigateLegal }) => {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--stator-fg-muted)] leading-relaxed">
            Stator is a free, MIT-licensed, open-source browser application distributed via{' '}
            <a
              href={STATOR_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
            >
              github.com/AYYU945/Stator
            </a>
            . It runs locally on your device with no user accounts, no cloud media storage, and no
            analytics.
          </p>
        </div>

        <div className="divide-y divide-[var(--stator-border)] border-t border-b border-[var(--stator-border)]">
          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">01</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Client-Side FFmpeg &amp; Canvas Processing
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <p>
                Every video, audio, GIF, and image job executes locally inside your browser session.
                Audio/video transcoding and animation compilation run via self-hosted FFmpeg
                WebAssembly (<code className="font-mono text-xs">@ffmpeg/core-mt</code> when
                Cross-Origin Isolation is active, or single-threaded{' '}
                <code className="font-mono text-xs">@ffmpeg/core</code> fallback). Still image
                resizing, cropping, tonal grading, watermarks, and encoding run in local{' '}
                <code className="font-mono text-xs">OffscreenCanvas</code> Web Workers and HTML5
                Canvas pipelines.
              </p>
              <p>
                Media files, frames, waveforms, and filenames are never uploaded to a server. You
                can verify zero media egress at any time in your browser&apos;s Network inspector.
              </p>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">02</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Browser Storage (IndexedDB &amp; localStorage)
              </h2>
            </div>
            <div className="md:col-span-8 space-y-3 text-sm leading-relaxed">
              <p>
                All persistence stays strictly inside your browser&apos;s origin-isolated storage:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>
                  <span className="text-[var(--stator-fg)] font-medium">
                    IndexedDB (<code className="font-mono text-xs">stator_db</code>):
                  </span>{' '}
                  Stores conversion history and re-downloadable output blobs in{' '}
                  <code className="font-mono text-xs">history_entries</code> (up to a 250 MB / 50
                  entry LRU cap), saved workspace metadata and snapshots in{' '}
                  <code className="font-mono text-xs">projects</code>, and selectively cached source
                  files below your per-file threshold (default 35 MB, configurable 5–60 MB in
                  Settings; 200 MB total LRU cap) in{' '}
                  <code className="font-mono text-xs">project_assets</code>. Larger source files stay
                  in volatile memory only until reconnected.
                </li>
                <li>
                  <span className="text-[var(--stator-fg)] font-medium">localStorage:</span> Stores
                  your theme selection (<code className="font-mono text-xs">stator_theme</code>),
                  workspace preferences (<code className="font-mono text-xs">stator_settings_v3</code>
                  ), global encoding preset (<code className="font-mono text-xs">stator_global_preset</code>),
                  Brand Kit (<code className="font-mono text-xs">stator_brand_kit</code>), Smart
                  Pipelines (<code className="font-mono text-xs">stator_smart_pipelines_v3</code>),
                  Ephemeral Privacy Mode flag (<code className="font-mono text-xs">stator_ephemeral_privacy</code>),
                  and lightweight metadata mirrors (<code className="font-mono text-xs">stator_projects_meta_v3</code>,{' '}
                  <code className="font-mono text-xs">stator_conversion_history</code>).
                </li>
              </ul>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">03</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Privacy Controls &amp; Local Data Erasure
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>
                  <span className="text-[var(--stator-fg)] font-medium">
                    Ephemeral Privacy Mode:
                  </span>{' '}
                  Available in History and Settings. When enabled, Stator keeps queues and converted
                  outputs strictly in volatile RAM (<code className="font-mono text-xs">ObjectURL</code>s)
                  and skips writing projects, cached source blobs, and history entries to IndexedDB.
                </li>
                <li>
                  <span className="text-[var(--stator-fg)] font-medium">
                    EXIF &amp; Metadata Stripping:
                  </span>{' '}
                  Enabled by default so GPS coordinates, camera identifiers, and container metadata
                  are stripped during processing unless you turn it off.
                </li>
                <li>
                  <span className="text-[var(--stator-fg)] font-medium">
                    Full Local Wipe:
                  </span>{' '}
                  You can delete individual entries, clear conversion history, or use{' '}
                  <span className="text-[var(--stator-fg)]">Wipe All Local Data</span> in History or
                  Settings to clear IndexedDB stores and Stator <code className="font-mono text-xs">localStorage</code>{' '}
                  keys immediately.
                </li>
              </ul>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">04</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Actual Network Behavior
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <p>
                Stator deploys zero analytics scripts, zero tracking cookies, zero fingerprinting,
                and zero advertising networks. There are no user accounts, subscriptions, or remote
                databases.
              </p>
              <p>
                When served from a static host or local server, your browser only fetches the
                application shell (HTML, JS, CSS), self-hosted variable fonts (
                <code className="font-mono text-xs">.woff2</code> from{' '}
                <code className="font-mono text-xs">@fontsource-variable/*</code>—never Google Fonts
                or external font CDNs), and local WebAssembly core files from{' '}
                <code className="font-mono text-xs">/wasm/</code>. When installed or cached as a
                Progressive Web App, Workbox precaches these static assets locally so Stator works
                offline. External links to GitHub only open when you click them.
              </p>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">05</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Source Audit &amp; Maintainer Contact
              </h2>
            </div>
            <div className="md:col-span-8 space-y-3 text-sm leading-relaxed">
              <p>
                Because Stator is open source, you can inspect the storage, worker, and WebAssembly
                implementation directly in the repository or report privacy issues on GitHub.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <a
                  href={STATOR_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
                >
                  Source Repository
                </a>
                <a
                  href={STATOR_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
                >
                  MIT License
                </a>
                <a
                  href={STATOR_THIRD_PARTY_NOTICES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
                >
                  THIRD_PARTY_NOTICES.md
                </a>
                <a
                  href={STATOR_ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
                >
                  Report a Bug
                </a>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-[var(--stator-fg-subtle)]">
          <span>
            Privacy or technical inquiries:{' '}
            <a
              href={`mailto:${STATOR_CONTACT_EMAIL}`}
              className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] underline underline-offset-4"
            >
              {STATOR_CONTACT_EMAIL}
            </a>
          </span>
          {onNavigateLegal && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigateLegal('terms')}
                className="text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer"
              >
                Software Terms &amp; License
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
