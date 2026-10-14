import React from 'react';
import { ArrowLeft, Shield, HardDrive, Database, EyeOff } from 'lucide-react';

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
        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">Effective Date: October 2026</span>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Stator is architected from the ground up for absolute local execution. This policy explains our operational parameters and security model.
          </p>
        </div>

        {/* Section 1: In-Memory Client Processing */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>Client-Side In-Memory Execution Architecture</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            All media conversion and transcoding procedures execute entirely on your personal device inside your web browser. Stator uses client-side WebAssembly (FFmpeg WASM) and HTML5 Canvas (including OffscreenCanvas worker pipelines) to parse, transform, and package files locally in browser memory.
          </p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Zero media files, audio buffers, video frames, or document streams are ever transmitted across external network sockets or uploaded to remote endpoints. Stator operates locally in browser memory without sending files to external endpoints. All input and output buffers reside strictly within local device random access memory (RAM).
          </p>
        </div>

        {/* Section 2: Local Storage & Persistence */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <HardDrive className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>Local Device Storage and Persistence</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Stator stores user preferences and session history records exclusively on your client device using browser-native storage engines:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400 pl-2">
            <li>
              <span className="text-zinc-900 dark:text-zinc-200 font-medium">Conversion History:</span> Stored locally in IndexedDB to enable quick re-downloading within the browser session.
            </li>
            <li>
              <span className="text-zinc-900 dark:text-zinc-200 font-medium">Encoding Presets:</span> Stored in browser LocalStorage under stator_global_preset to preserve your preferred output formats and compression levels across visits.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            You can clear all stored history and preferences at any time using the Clear Queue and Clear History buttons, or by clearing your browser cache.
          </p>
        </div>

        {/* Section 3: Telemetry, Cookies, and Tracking */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <EyeOff className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>Zero Tracking and No Third-Party Profiling</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Stator does not deploy tracking cookies, fingerprinting scripts, advertising trackers, or user behavioral profiling mechanisms. No marketing pixels or external data brokers are permitted on this application.
          </p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            External CDN connections have been removed, ensuring your IP address is not shared with third-party font networks or analytics vendors during normal operations.
          </p>
        </div>

        {/* Section 4: Security & Compliance */}
        <div className="bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white font-semibold text-base">
            <Database className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            <h2>Metadata and EXIF Hygiene</h2>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            When converting images or rendering via canvas routines, EXIF metadata (including GPS geographical tags, camera serial numbers, and capture timestamps) is stripped by default to ensure complete data hygiene prior to saving.
          </p>
        </div>

        {/* Contact Information */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <p>Questions regarding this privacy statement can be directed to privacy@stator.media.</p>
        </div>
      </div>
    </div>
  );
};
