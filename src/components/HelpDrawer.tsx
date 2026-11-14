import React, { useEffect, useState } from 'react';
import { HelpCircle, X, ChevronDown } from 'lucide-react';

export interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FaqItemData {
  id: string;
  question: string;
  answer: string;
  bullets?: string[];
  footer?: string;
}

const ENGINE_PRIVACY_FAQS: FaqItemData[] = [
  {
    id: 'server-upload',
    question: 'Are my files uploaded to any server?',
    answer:
      "No. All conversion and processing happens entirely inside your browser using WebAssembly. Your media files never leave your device, traverse a network, or touch external servers. You can verify this at any time by opening your browser's Developer Tools Network tab during a conversion: zero bytes of media data are transmitted.",
  },
  {
    id: 'file-size-limit',
    question: 'Is there a file size limit?',
    answer:
      "Stator enforces no arbitrary file size caps. Maximum file size (typically up to 2–4 GB) is bounded only by your browser's available memory (RAM) and 32-bit WebAssembly heap allocations. For optimal stability with multi-gigabyte 4K footage, we recommend closing unused browser tabs.",
  },
  {
    id: 'offline-use',
    question: 'Can I use Stator offline?',
    answer:
      'Yes. Once the application and processing engines are cached in your browser on first visit, Stator functions without an active internet connection. You can disconnect your network or turn on Airplane Mode and continue converting files.',
  },
  {
    id: 'processing-speed',
    question: 'How does processing speed compare to cloud-based converters?',
    answer:
      'Cloud converters require uploading large raw files to a server and downloading the result, which is bottle-necked by your internet upload speed. Stator processes directly on your local CPU cores using multithreaded Web Workers. For files under 2 GB, local processing is typically much faster because there is zero network transfer overhead.',
  },
  {
    id: 'compatibility',
    question: 'Which browsers and operating systems are supported?',
    answer:
      'Stator requires a modern desktop browser supporting WebAssembly and Cross-Origin Isolation:',
    bullets: [
      'Chrome, Edge, and Brave (version 92+)',
      'Firefox (version 89+)',
      'Safari (version 15.2+)',
    ],
    footer:
      'Mobile browsers are currently supported for basic audio and image tasks, but desktop hardware is strongly recommended for heavy video encoding.',
  },
];

const OPEN_SOURCE_FAQS: FaqItemData[] = [
  {
    id: 'mit-license',
    question: 'What open-source license does Stator use?',
    answer:
      'Stator’s application code, UI components, and client-side pipelines are released under the permissive MIT License. You can inspect, fork, self-host, modify, and redistribute the codebase freely without paywalls or feature gates.',
  },
  {
    id: 'all-features-unlocked',
    question: 'Are 4K scaling, 120 FPS, or high-bitrate audio locked?',
    answer:
      'No. All encoding presets, 4K (2160p) and 2K (1440p) scaling, 120 FPS output, 320 kbps audio encoding, full hardware CPU thread allocation, and unlimited batch queues are completely unlocked for everyone.',
  },
  {
    id: 'third-party-codecs',
    question: 'How are FFmpeg WebAssembly codecs licensed?',
    answer:
      'Stator dynamically loads @ffmpeg/core in the browser at runtime. Standard FFmpeg WebAssembly builds include GPL-licensed codecs such as libx264. See the LICENSE and README.md files in the repository for complete third-party attribution and license boundary details.',
  },
  {
    id: 'contribute-sponsor',
    question: 'How can I contribute or support Stator?',
    answer:
      'You can report bugs, submit pull requests, or request new container/codec presets directly on GitHub. Optional community sponsorships help cover maintenance and CI infrastructure without gating any software features.',
  },
];

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose }) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'engine' | 'opensource'>('engine');
  const [openIds, setOpenIds] = useState<string[]>(['server-upload', 'mit-license']);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const currentList = activeTab === 'engine' ? ENGINE_PRIVACY_FAQS : OPEN_SOURCE_FAQS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help and FAQ Drawer"
      data-state={isVisible ? 'open' : 'closed'}
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        data-state={isVisible ? 'open' : 'closed'}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        data-state={isVisible ? 'open' : 'closed'}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-[#0d0d0d] border-l border-zinc-200 dark:border-neutral-800 shadow-2xl flex flex-col h-full overflow-hidden transition-transform duration-200 translate-x-full data-[state=open]:translate-x-0"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-[#0d0d0d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">
                  Help & FAQ
                </h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-0.5">
                  On-device processing, privacy, and open source.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Category Control */}
          <div className="mt-5 p-1 bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 rounded-md grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('engine')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer text-center ${
                activeTab === 'engine'
                  ? 'bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-neutral-700/80 shadow-xs'
                  : 'text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-neutral-200'
              }`}
            >
              Engine & Privacy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('opensource')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer text-center ${
                activeTab === 'opensource'
                  ? 'bg-white dark:bg-neutral-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-neutral-700/80 shadow-xs'
                  : 'text-zinc-600 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-neutral-200'
              }`}
            >
              Open Source
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3 custom-scrollbar">
          {currentList.map((faq) => {
            const isOpenItem = openIds.includes(faq.id);
            const triggerId = `help-trigger-${faq.id}`;
            const panelId = `help-panel-${faq.id}`;

            return (
              <div
                key={faq.id}
                className="bg-zinc-50 dark:bg-[#141416] border border-zinc-200 dark:border-neutral-800 rounded-md overflow-hidden transition-colors shadow-xs"
              >
                <button
                  type="button"
                  id={triggerId}
                  aria-controls={panelId}
                  aria-expanded={isOpenItem}
                  onClick={() => toggleItem(faq.id)}
                  className="w-full px-4 py-3.5 text-left flex items-start justify-between gap-3 cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-neutral-600"
                >
                  <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-neutral-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-150 leading-snug">
                    {faq.question}
                  </span>

                  <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 flex items-center justify-center text-zinc-500 dark:text-neutral-400 shrink-0 mt-0.5 transition-colors group-hover:border-zinc-300 dark:group-hover:border-neutral-700">
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                        isOpenItem
                          ? 'rotate-180 text-zinc-900 dark:text-white'
                          : 'text-zinc-500 dark:text-neutral-400'
                      }`}
                    />
                  </div>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    isOpenItem ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-0 text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed border-t border-zinc-200/60 dark:border-neutral-800/80">
                      <p className="mt-3">{faq.answer}</p>

                      {faq.bullets && faq.bullets.length > 0 && (
                        <ul className="mt-2 space-y-1 pl-4 list-disc marker:text-zinc-400 dark:marker:text-neutral-600">
                          {faq.bullets.map((bullet, idx) => (
                            <li key={idx} className="text-zinc-700 dark:text-neutral-300">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}

                      {faq.footer && (
                        <p className="mt-2 text-zinc-600 dark:text-neutral-400">
                          {faq.footer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="p-4 border-t border-zinc-200 dark:border-neutral-800 bg-zinc-50/60 dark:bg-neutral-950/60 shrink-0 flex items-center justify-between text-[11px] text-zinc-500 dark:text-neutral-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500" />
            <span>WASM CORE VERIFIED</span>
          </div>
          <span>ZERO CLOUD TELEMETRY</span>
        </div>
      </div>
    </div>
  );
};
