import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
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
            Terms of Service
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
                Open-Source MIT License &amp; Local Execution
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Stator’s source code is licensed under the MIT License, granting you permission to use,
              copy, modify, merge, publish, distribute, and self-host the software subject to the
              conditions in the repository LICENSE file. All conversion execution happens strictly on
              your local client machine without transmission of file payloads across any network.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">02</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Intellectual Property &amp; Ownership
              </h2>
            </div>
            <div className="md:col-span-8 space-y-2.5 text-sm leading-relaxed">
              <p>
                You maintain full, unencumbered ownership of all files, images, videos, audio
                recordings, and documents processed using this utility. Stator never acquires any
                copyright, trademark, or license rights in or to your selected or converted files.
              </p>
              <p>
                You represent and warrant that you hold all necessary licenses, copyrights,
                permissions, and rights to convert and process the files you supply.
              </p>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">03</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Hardware &amp; Memory Bounds
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              All media transformations depend directly on your local device hardware, including
              available CPU threads, RAM allocation, and WebAssembly runtime support in your
              browser. Conversion speed and available memory are bounded by your client hardware and
              browser heap limits.
            </p>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">04</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Disclaimer of Warranty
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              Stator is provided on an as-is and as-available basis without warranties of any kind,
              whether express, statutory, or implied. In no event shall the developer or
              contributors be liable for direct, indirect, incidental, special, exemplary, or
              consequential damages arising out of the performance, failure, or use of the
              client-side conversion routines.
            </p>
          </section>

          <section id="dmca-notice" className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">05</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                DMCA Notification Procedure
              </h2>
            </div>
            <div className="md:col-span-8 space-y-3 text-sm leading-relaxed">
              <p>
                Because Stator processes all files strictly client-side inside the user&apos;s
                browser, external servers do not host, store, cache, or transmit user media.
                Inquiries under 17 U.S.C. Section 512 may be directed to our designated contact:
              </p>
              <div className="bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-lg p-3.5 text-xs font-mono text-[var(--stator-fg)] space-y-1">
                <div className="font-semibold">Designated Agent Contact:</div>
                <div className="text-[var(--stator-fg-muted)]">
                  Hanan Ahmed (Developer &amp; Maintainer)
                </div>
                <div className="text-[var(--stator-fg-muted)]">Email: hanan.ahmed.pak@gmail.com</div>
              </div>
            </div>
          </section>

          <section className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono text-[var(--stator-accent-fg)]">06</span>
              <h2 className="text-[var(--stator-fg)] font-semibold text-base tracking-tight mt-0.5">
                Third-Party WebAssembly Codecs
              </h2>
            </div>
            <p className="md:col-span-8 text-sm leading-relaxed">
              While Stator’s application codebase is released under the MIT License, browser-side
              video and audio transcoding loads self-hosted third-party @ffmpeg/core WebAssembly
              binaries locally. Standard @ffmpeg/core distributions include codecs such as libx264
              licensed under the GNU General Public License (GPL). Refer to THIRD_PARTY_NOTICES.md
              and LICENSE in the source repository for full notices.
            </p>
          </section>
        </div>

        <p className="text-xs font-mono text-[var(--stator-fg-subtle)]">
          For questions or feedback: hanan.ahmed.pak@gmail.com
        </p>
      </div>
    </div>
  );
};
