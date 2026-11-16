import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface GuideWorkspaceViewProps {
  onBackToConverter: () => void;
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

const TECHNICAL_FAQS = [
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
    a: 'Toggling Ephemeral Mode in the History view immediately clears any stored IndexedDB blobs and keeps future conversion outputs strictly inside in-memory ObjectURLs for the current tab session.',
  },
  {
    q: 'How are third-party FFmpeg codecs licensed?',
    a: 'Stator’s application code is MIT-licensed. Pinned @ffmpeg/core and @ffmpeg/core-mt WebAssembly binaries bundled in /wasm/ include codecs subject to LGPL/GPL terms; see THIRD_PARTY_NOTICES.md for complete attribution.',
  },
] as const;

export const GuideWorkspaceView: React.FC<GuideWorkspaceViewProps> = ({
  onBackToConverter,
}) => {
  return (
    <section
      aria-label="Architecture & FAQ Guide"
      className="w-full py-8 sm:py-10 space-y-12"
    >
      {/* Editorial Header */}
      <div className="pb-6 border-b border-[var(--stator-border)]">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--stator-fg-subtle)] mb-2">
          <button
            type="button"
            onClick={onBackToConverter}
            className="inline-flex items-center gap-1 text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Converter</span>
          </button>
          <span aria-hidden="true">/</span>
          <span>Engine Architecture &amp; FAQ</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)]">
          Local Engine{' '}
          <span className="font-serif italic font-normal text-[var(--stator-accent-fg)]">
            Architecture &amp; Reference
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-[var(--stator-fg-muted)] mt-1 max-w-2xl">
          How Stator processes high-resolution video, audio, and photography inside browser memory
          without cloud servers.
        </p>
      </div>

      {/* Two-Column Architectural Specification Sheet (No boxed 2x2 SaaS cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-accent-fg)]">
            Runtime Specification
          </span>
          <h2 className="font-serif text-xl font-semibold text-[var(--stator-fg)] tracking-tight">
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
                <span className="font-mono tabular-nums text-xs text-[var(--stator-accent-fg)] font-semibold">
                  {pillar.num}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--stator-fg)] tracking-tight">
                    {pillar.title}
                  </h3>
                  <span className="text-[11px] font-mono text-[var(--stator-fg-subtle)]">
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
          <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--stator-accent-fg)]">
            Technical FAQ
          </span>
          <h2 className="font-serif text-xl font-semibold text-[var(--stator-fg)] tracking-tight">
            Codecs, Offline Storage &amp; Licensing
          </h2>
        </aside>

        <div className="lg:col-span-8 divide-y divide-[var(--stator-border)] border-t border-b border-[var(--stator-border)]">
          {TECHNICAL_FAQS.map((item) => (
            <div key={item.q} className="py-5 space-y-1.5">
              <h3 className="text-sm font-semibold text-[var(--stator-fg)]">{item.q}</h3>
              <p className="text-xs sm:text-[13px] text-[var(--stator-fg-muted)] leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
