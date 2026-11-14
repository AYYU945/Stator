import React from 'react';
import { ArrowLeft, Shield, HardDrive, Database, EyeOff, Layers, Type } from 'lucide-react';

export interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Stator is an independent, MIT-licensed open-source media utility maintained by its contributors (contact: hanan.ahmed.pak@gmail.com).
          </p>
        </div>

        {/* Section 1: 100% On-Device WebAssembly Conversion */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>1. 100% On-Device WebAssembly Execution (Zero Network Egress)</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Media conversion is 100% on-device via WebAssembly; no audio, video, or image files are uploaded or sent over a network. All processing routines (FFmpeg WebAssembly core and HTML5 Canvas image pipelines) run strictly within your local browser virtual memory.
          </p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Zero media buffers, filenames, audio waveforms, or video frames ever leave your device or traverse external servers. You can independently confirm this architecture at any time by inspecting the browser Network tab during any media conversion: zero payload bytes are transmitted.
          </p>
        </div>

        {/* Section 2: Self-Hosted Typography & Zero External Font CDNs */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Type className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>2. Self-Hosted Assets and Typography</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            All fonts are self-hosted (.woff2); no requests connect to Google Fonts or external font delivery networks. Your IP address and browser headers are never transmitted to third-party typography or style providers.
          </p>
        </div>

        {/* Section 3: Technical Storage & Cookie Banner Exemption */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <HardDrive className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>3. Browser Storage and Cookie Banner Exemption</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Browser storage (localStorage / IndexedDB) is used solely for local technical state (theme mode, preset configurations, and conversion session history), exempting the site from cookie tracking consent banners under EU/Garante privacy guidelines.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 pl-2">
            <li>
              <span className="text-zinc-900 dark:text-zinc-200 font-medium">Session History (IndexedDB):</span> Enables instant downloading of converted outputs within your local session.
            </li>
            <li>
              <span className="text-zinc-900 dark:text-zinc-200 font-medium">Encoding Presets & Theme (LocalStorage):</span> Saves your preferred dark/light theme and encoding settings across visits.
            </li>
          </ul>
        </div>

        {/* Section 4: Zero Tracking and Telemetry */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <EyeOff className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>4. Zero Telemetry, Tracking Pixels, or Advertising</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Stator does not deploy tracking cookies, fingerprinting scripts, Google Analytics, telemetry beacons, or advertising networks. We do not sell, rent, or profile user behavior under any circumstances.
          </p>
        </div>

        {/* Section 5: Metadata Hygiene */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Database className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>5. Metadata (EXIF) Hygiene</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            When processing images and media files, EXIF metadata (such as GPS coordinates, camera serial numbers, and personal timestamps) is stripped by default to protect your privacy before files are saved.
          </p>
        </div>

        {/* Contact Information */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <p>
            For privacy inquiries or technical questions, contact Hanan Ahmed at hanan.ahmed.pak@gmail.com.
          </p>
        </div>
      </div>
    </div>
  );
};
