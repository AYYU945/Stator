import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 text-[var(--stator-fg-muted)]">
      <div className="mb-8 flex items-center justify-between border-b border-[var(--stator-border)] pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio</span>
        </button>
        <span className="text-xs font-mono text-[var(--stator-fg-subtle)]">
          MIT Open Source · v1.0.0
        </span>
      </div>

      <div className="space-y-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--stator-fg)] mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--stator-fg-muted)] leading-relaxed">
            Stator is an independent, MIT-licensed open-source media utility maintained by its
            contributors (contact: hanan.ahmed.pak@gmail.com).
          </p>
        </div>

        <div className="divide-y divide-[var(--stator-border)] border-t border-b border-[var(--stator-border)]">
          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">01</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                100% On-Device WebAssembly Execution
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <p>
                Media conversion is 100% on-device via WebAssembly; no audio, video, or image files
                are uploaded or sent over a network. All processing routines (FFmpeg WebAssembly core
                and OffscreenCanvas image pipelines) run strictly within your local browser memory.
              </p>
              <p>
                Zero media buffers, filenames, audio waveforms, or video frames ever leave your
                device or traverse external servers. You can independently confirm this architecture
                at any time by inspecting the browser Network tab during any media conversion.
              </p>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">02</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Self-Hosted Assets &amp; Typography
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              All fonts are self-hosted (.woff2); no requests connect to Google Fonts or external
              font delivery networks. Your IP address and browser headers are never transmitted to
              third-party typography or style providers.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">03</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Browser Storage &amp; Cookie Exemption
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <p>
                Browser storage (localStorage / IndexedDB) is used solely for local technical state
                (theme mode, preset configurations, and conversion session history), exempting the
                site from cookie tracking consent banners under EU/Garante privacy guidelines.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>
                  <span className="text-[var(--stator-fg)] font-medium">
                    Session History (IndexedDB):
                  </span>{' '}
                  Enables instant downloading of converted outputs within your local 250 MB LRU
                  cache (optional Ephemeral Privacy Mode disables IndexedDB persistence completely).
                </li>
                <li>
                  <span className="text-[var(--stator-fg)] font-medium">
                    Encoding Presets &amp; Theme (LocalStorage):
                  </span>{' '}
                  Saves your preferred light/dark theme and encoding settings across visits.
                </li>
              </ul>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">04</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Zero Telemetry or Tracking Pixels
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Stator does not deploy tracking cookies, fingerprinting scripts, Google Analytics,
              telemetry beacons, or advertising networks. We do not sell, rent, or profile user
              behavior under any circumstances.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">05</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Metadata (EXIF) Hygiene
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              When processing images and media files, EXIF metadata (such as GPS coordinates, camera
              serial numbers, and container tags) is stripped by default to protect your privacy
              before files are saved.
            </p>
          </section>
        </div>

        <p className="text-xs font-mono text-[var(--stator-fg-subtle)]">
          For privacy inquiries or technical questions: hanan.ahmed.pak@gmail.com
        </p>
      </div>
    </div>
  );
};
