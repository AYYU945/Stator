import React from 'react';
import { ArrowLeft, Bug, Code2, ExternalLink, FileText, Scale, Shield, Tag } from 'lucide-react';
import {
  LegalRoute,
  STATOR_ISSUES_URL,
  STATOR_LICENSE_URL,
  STATOR_RELEASES_URL,
  STATOR_REPO_URL,
  STATOR_SECURITY_URL,
  STATOR_THIRD_PARTY_NOTICES_URL,
} from '../lib/links.ts';

export interface GuideWorkspaceViewProps {
  onBackToConverter: () => void;
  onNavigateLegal?: (route: Exclude<LegalRoute, 'none'>) => void;
}

const ARCHITECTURE_PILLARS = [
  {
    num: '01',
    title: 'Zero Network Egress',
    spec: 'Local WASM + OffscreenCanvas',
    body: 'Every image, video frame, and audio stream is decoded and encoded inside your browser tab via self-hosted WebAssembly and OffscreenCanvas workers. Inspect the browser Network tab during any job to verify zero payload bytes leave your device.',
  },
  {
    num: '02',
    title: 'Multi-Threaded FFmpeg + Worker Pool',
    spec: 'COOP / COEP SharedArrayBuffer',
    body: 'When Cross-Origin Isolation headers (COOP/COEP) are present, Stator boots the multi-threaded @ffmpeg/core-mt engine across CPU cores and automatically falls back to single-threaded @ffmpeg/core if needed.',
  },
  {
    num: '03',
    title: 'MEMFS Safety & 250 MB LRU Cache',
    spec: '500 MB Warn · 1.8 GB Ceiling',
    body: 'Because 32-bit WebAssembly virtual memory (MEMFS) has a 2 GB ceiling, Stator warns above 500 MB, rejects files over 1.8 GB, unlinks buffers immediately after each job, and caps IndexedDB history at 250 MB.',
  },
  {
    num: '04',
    title: 'MIT Open Source & Un-Gated Codecs',
    spec: 'Zero Paywalls · Zero Telemetry',
    body: 'All features—4K/2K Lanczos scaling, 50/50 split comparison, -16 LUFS EBU R128 loudness normalization, target byte budgeting, and GIF Studio—are unlocked without paywalls or telemetry.',
  },
] as const;

export const GuideWorkspaceView: React.FC<GuideWorkspaceViewProps> = ({
  onBackToConverter,
  onNavigateLegal,
}) => {
  const technicalFaqs: Array<{ q: string; a: React.ReactNode }> = [
    {
      q: 'Can I use Stator completely offline?',
      a: 'Yes. Stator is an installable Progressive Web App (PWA) that precaches its UI, self-hosted fonts, and WebAssembly cores locally via a Service Worker.',
    },
    {
      q: 'Why does AVIF or WebP availability depend on my browser?',
      a: 'Still image conversions run through native browser OffscreenCanvas / HTMLCanvasElement encoders for maximum speed. Stator probes actual encoder output MIME types at startup and disables unsupported targets rather than silently writing a misnamed PNG.',
    },
    {
      q: 'How does Ephemeral Privacy Mode work?',
      a: 'Toggling Ephemeral Mode in History or Settings clears stored IndexedDB entries and keeps active queues and converted outputs strictly inside volatile in-memory ObjectURLs for the current tab session.',
    },
    {
      q: 'How are third-party FFmpeg codecs and fonts licensed?',
      a: (
        <>
          Stator&apos;s application code is licensed under the{' '}
          <a
            href={STATOR_LICENSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
          >
            MIT License
          </a>
          . Pinned <code className="font-mono text-xs">@ffmpeg/core</code> and{' '}
          <code className="font-mono text-xs">@ffmpeg/core-mt</code> WebAssembly binaries bundled in{' '}
          <code className="font-mono text-xs">/wasm/</code> include codecs subject to LGPL/GPL
          terms (such as <code className="font-mono text-xs">libx264</code>), and self-hosted fonts
          use OFL-1.1. See{' '}
          <a
            href={STATOR_THIRD_PARTY_NOTICES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--stator-fg)] underline underline-offset-4 hover:opacity-80"
          >
            THIRD_PARTY_NOTICES.md
          </a>{' '}
          for complete attribution.
        </>
      ),
    },
  ];

  const repoLinks = [
    {
      label: 'Source Code (AYYU945/Stator)',
      href: STATOR_REPO_URL,
      icon: Code2,
    },
    {
      label: 'Releases (v1.0.0)',
      href: STATOR_RELEASES_URL,
      icon: Tag,
    },
    {
      label: 'Report a Bug',
      href: STATOR_ISSUES_URL,
      icon: Bug,
    },
    {
      label: 'MIT License',
      href: STATOR_LICENSE_URL,
      icon: Scale,
    },
    {
      label: 'Third-Party Notices',
      href: STATOR_THIRD_PARTY_NOTICES_URL,
      icon: FileText,
    },
    {
      label: 'Security Policy',
      href: STATOR_SECURITY_URL,
      icon: Shield,
    },
  ];

  return (
    <section
      aria-label="Architecture & FAQ Guide"
      className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12"
    >
      {/* Header */}
      <div className="pb-6 border-b border-[var(--stator-border)] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--stator-fg-subtle)] mb-2">
            <button
              type="button"
              onClick={onBackToConverter}
              className="inline-flex items-center gap-1 text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
            <span aria-hidden="true">/</span>
            <span>Engine Architecture &amp; FAQ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)]">
            Local Engine Architecture &amp; Reference
          </h1>
          <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1 max-w-2xl">
            How Stator processes high-resolution video, audio, and photography inside browser memory
            without cloud servers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={STATOR_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>GitHub Repo</span>
            <ExternalLink className="w-3 h-3 text-[var(--stator-fg-muted)]" />
          </a>
          <a
            href={STATOR_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border-control)] text-xs font-medium text-[var(--stator-fg)] inline-flex items-center gap-1.5 transition-colors"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Report Bug</span>
          </a>
        </div>
      </div>

      {/* Two-Column Architectural Specification Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-3">
          <span className="text-xs font-medium text-[var(--stator-fg-muted)]">
            Runtime specification
          </span>
          <h2 className="text-xl font-semibold text-[var(--stator-fg)] tracking-tight">
            Designed around deterministic browser sandboxing.
          </h2>
          <p className="text-xs sm:text-[13px] text-[var(--stator-fg-muted)] leading-relaxed">
            Every encoding job enforces strict memory ceilings, verifies real encoder MIME output,
            and strips sensitive EXIF metadata unless explicitly retained.
          </p>
        </aside>

        <div className="lg:col-span-8 divide-y divide-[var(--stator-border)] border-t border-b border-[var(--stator-border)]">
          {ARCHITECTURE_PILLARS.map((pillar) => (
            <div
              key={pillar.num}
              className="py-5 sm:py-6 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6 items-baseline"
            >
              <div className="sm:col-span-4 flex items-baseline gap-2.5">
                <span className="font-mono tabular-nums text-xs text-[var(--stator-fg-muted)] font-semibold">
                  {pillar.num}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--stator-fg)] tracking-tight">
                    {pillar.title}
                  </h3>
                  <span className="text-[11px] font-mono text-[var(--stator-fg-muted)]">
                    {pillar.spec}
                  </span>
                </div>
              </div>
              <p className="sm:col-span-8 text-xs sm:text-[13px] text-[var(--stator-fg-muted)] leading-relaxed">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Frequently Asked Technical Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-2">
          <span className="text-xs font-medium text-[var(--stator-fg-muted)]">
            Technical FAQ
          </span>
          <h2 className="text-xl font-semibold text-[var(--stator-fg)] tracking-tight">
            Codecs, Offline Storage &amp; Licensing
          </h2>
        </aside>

        <div className="lg:col-span-8 divide-y divide-[var(--stator-border)] border-t border-b border-[var(--stator-border)]">
          {technicalFaqs.map((item) => (
            <div key={item.q} className="py-5 space-y-1.5">
              <h3 className="text-sm font-semibold text-[var(--stator-fg)]">{item.q}</h3>
              <p className="text-xs sm:text-[13px] text-[var(--stator-fg-muted)] leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Open Source Repository & Documentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <aside className="lg:col-span-4 space-y-2">
          <span className="text-xs font-medium text-[var(--stator-fg-muted)]">
            Open source &amp; legal
          </span>
          <h2 className="text-xl font-semibold text-[var(--stator-fg)] tracking-tight">
            Source Repository &amp; Releases
          </h2>
          <p className="text-xs sm:text-[13px] text-[var(--stator-fg-muted)] leading-relaxed">
            Inspect source code, download releases, file bug reports, or review Stator&apos;s
            local privacy and licensing documentation.
          </p>
        </aside>

        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {repoLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-lg bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] border border-[var(--stator-border)] hover:border-[var(--stator-border-control)] flex items-center justify-between gap-2 text-xs font-medium text-[var(--stator-fg)] transition-colors"
                >
                  <span className="inline-flex items-center gap-2 min-w-0 truncate">
                    <Icon className="w-3.5 h-3.5 text-[var(--stator-fg-muted)] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-[var(--stator-fg-subtle)] shrink-0" />
                </a>
              );
            })}
          </div>

          {onNavigateLegal && (
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--stator-fg-muted)]">
              <button
                type="button"
                onClick={() => onNavigateLegal('privacy')}
                className="hover:text-[var(--stator-fg)] underline underline-offset-4 cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal('terms')}
                className="hover:text-[var(--stator-fg)] underline underline-offset-4 cursor-pointer"
              >
                Software Terms &amp; License
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal('dmca')}
                className="hover:text-[var(--stator-fg)] underline underline-offset-4 cursor-pointer"
              >
                Copyright &amp; DMCA Notice
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
