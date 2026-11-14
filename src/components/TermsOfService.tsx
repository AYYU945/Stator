import React from 'react';
import { ArrowLeft, Scale, ShieldAlert, FileText, Mail, Cpu, Shield, Sparkles } from 'lucide-react';

export interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-zinc-700 dark:text-zinc-300">
      <div className="mb-8 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Engine</span>
        </button>
        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">MIT Open Source • v1.0.0</span>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Stator is an independent, MIT-licensed open-source media utility maintained by its contributors (contact: hanan.ahmed.pak@gmail.com).
          </p>
        </div>

        {/* Section 1: Open-Source MIT License & Local Execution */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Scale className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>1. Open-Source MIT License and Local Execution</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Stator’s source code is licensed under the MIT License, granting you permission to use, copy, modify, merge, publish, distribute, and self-host the software subject to the conditions in the repository LICENSE file. All conversion execution happens strictly on your local client machine without transmission of file payloads across any network.
          </p>
        </div>

        {/* Section 2: User Responsibility & Content Ownership */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <ShieldAlert className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>2. Intellectual Property and Content Ownership</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            You maintain full, unencumbered ownership of all files, images, videos, audio recordings, and documents processed using this utility. Stator never acquires any copyright, trademark, or license rights in or to your selected or converted files.
          </p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            You represent and warrant that you hold all necessary licenses, copyrights, permissions, and rights to convert and process the files you supply. You agree not to process material that infringes third-party intellectual property rights or violates applicable local, national, or international regulations.
          </p>
        </div>

        {/* Section 3: Browser Performance and Hardware Limitations */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Cpu className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>3. Browser Performance and Hardware Limitations</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            All media transformations depend directly on your local device hardware, including available CPU threads, RAM allocation, and WebAssembly runtime support in your browser. Conversion speed and available memory are bounded by your client hardware and browser heap limits.
          </p>
        </div>

        {/* Section 4: Acceptable Use and Security Integrity */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>4. Acceptable Use and Security Integrity</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Users must not attempt to inject malicious code, exploit WebAssembly memory sandboxes, bypass application integrity checks, or distribute automated scrapers that degrade application availability.
          </p>
        </div>

        {/* Section 5: Disclaimer of Warranty and Limitation of Liability */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Mail className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>5. Disclaimer of Warranty and Limitation of Liability</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Stator is provided on an as-is and as-available basis without warranties of any kind, whether express, statutory, or implied. In no event shall the developer or contributors be liable for direct, indirect, incidental, special, exemplary, or consequential damages arising out of the performance, failure, or use of the client-side conversion routines.
          </p>
        </div>

        {/* Section 6: DMCA Notification Procedure */}
        <div id="dmca-notice" className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>6. DMCA Notification Procedure</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Because Stator processes all files strictly client-side inside the user's browser, external servers do not host, store, cache, or transmit user media. However, in accordance with the Digital Millennium Copyright Act (17 U.S.C. Section 512), inquiries may be directed to our designated contact:
          </p>

          <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 space-y-1">
            <div className="text-zinc-900 dark:text-white font-semibold mb-1">Designated Agent Contact:</div>
            <div>Hanan Ahmed (Developer & Maintainer)</div>
            <div>Email: hanan.ahmed.pak@gmail.com</div>
          </div>
        </div>

        {/* Section 7: Third-Party WebAssembly Codecs */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Sparkles className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>7. Third-Party WebAssembly Codecs</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            While Stator’s application codebase is released under the MIT License, browser-side video and audio transcoding dynamically loads third-party @ffmpeg/core WebAssembly binaries at runtime. Standard @ffmpeg/core distributions include codecs such as libx264 licensed under the GNU General Public License (GPL). Refer to the LICENSE and README.md files in the source repository for full third-party notices.
          </p>
        </div>

        {/* Contact info */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <p>For questions or feedback, contact Hanan Ahmed at hanan.ahmed.pak@gmail.com.</p>
        </div>
      </div>
    </div>
  );
};
