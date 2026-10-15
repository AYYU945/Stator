import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  bullets?: string[];
  footer?: string;
}

export const FAQS: FaqItem[] = [
  {
    id: 'faq-privacy',
    question: 'Are my files uploaded to any server?',
    answer:
      "No. All conversion and processing happens entirely inside your browser using WebAssembly. Your media files never leave your device, traverse a network, or touch external servers. You can verify this at any time by opening your browser's Developer Tools Network tab during a conversion: zero bytes of media data are transmitted.",
  },
  {
    id: 'faq-size-limit',
    question: 'Is there a file size limit?',
    answer:
      "Free accounts can process files up to 2 GB. Stator Pro handles files up to 4 GB, bounded only by your browser's available memory (RAM) and 32-bit WebAssembly heap allocations. For optimal stability with multi-gigabyte 4K footage, we recommend closing unused browser tabs.",
  },
  {
    id: 'faq-offline',
    question: 'Can I use Stator offline?',
    answer:
      'Yes. Once the application and processing engines are cached in your browser on first visit, Stator functions without an active internet connection. You can disconnect your network or turn on Airplane Mode and continue converting files.',
  },
  {
    id: 'faq-speed',
    question: 'How does processing speed compare to cloud-based converters?',
    answer:
      'Cloud converters require uploading large raw files to a server and downloading the result, which is bottle-necked by your internet upload speed. Stator processes directly on your local CPU cores using multithreaded Web Workers. For files under 2 GB, local processing is typically much faster because there is zero network transfer overhead.',
  },
  {
    id: 'faq-compatibility',
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
  {
    id: 'faq-tiers',
    question: 'What is the difference between the Free tier and Stator Pro?',
    answer:
      'The Free tier includes standard encoding presets, up to 1080p video exports, 2 concurrent worker threads, and a 3-file batch queue. Stator Pro unlocks 4K resolutions, full hardware thread utilization (N cores), studio-grade audio bitrates (up to 320 kbps), custom export presets, and batch queues exceeding 50 items.',
  },
  {
    id: 'faq-lifetime',
    question: 'How does the Lifetime Pass work?',
    answer:
      'The Lifetime Pass is a single, one-time payment of €59. It grants perpetual access to all current and upcoming Pro features with no recurring monthly software debt. You receive a cryptographic license key that verifies locally in your browser.',
  },
  {
    id: 'faq-transfer',
    question: 'Can I move my license to a new computer?',
    answer:
      'Yes. Simply enter your license key on your new device or browser to activate your entitlement. We permit reasonable multi-device use for personal setups (such as a primary workstation and a laptop).',
  },
];

export interface FaqSectionProps {
  allowMultiple?: boolean;
  className?: string;
}

export const FaqSection: React.FC<FaqSectionProps> = ({
  allowMultiple = false,
  className = '',
}) => {
  // Support either single-open or independent multi-open states
  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const isCurrentlyOpen = prev.includes(id);
      if (allowMultiple) {
        return isCurrentlyOpen ? prev.filter((item) => item !== id) : [...prev, id];
      }
      return isCurrentlyOpen ? [] : [id];
    });
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-section-heading"
      className={`w-full max-w-3xl mx-auto mt-14 mb-12 px-4 ${className}`}
    >
      {/* Header & Subhead */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h2
            id="faq-section-heading"
            className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            Frequently Asked Questions
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
          Direct answers on privacy, local processing performance, and licensing.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-2.5">
        {FAQS.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          const triggerId = `faq-trigger-${faq.id}`;
          const panelId = `faq-panel-${faq.id}`;

          return (
            <div
              key={faq.id}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden transition-colors shadow-xs"
            >
              <button
                type="button"
                id={triggerId}
                aria-controls={panelId}
                aria-expanded={isOpen}
                onClick={() => toggleItem(faq.id)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
              >
                <span className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-150">
                  {faq.question}
                </span>

                <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0 transition-colors group-hover:border-zinc-300 dark:group-hover:border-zinc-700">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ease-out ${
                      isOpen
                        ? 'rotate-180 text-zinc-900 dark:text-white'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  />
                </div>
              </button>

              {/* Smooth Expansion via CSS Grid transition */}
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80">
                    <p className="mt-3.5">{faq.answer}</p>

                    {faq.bullets && faq.bullets.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5 pl-4 list-disc marker:text-zinc-400 dark:marker:text-zinc-600">
                        {faq.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="text-zinc-700 dark:text-zinc-300">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}

                    {faq.footer && (
                      <p className="mt-2.5 text-zinc-600 dark:text-zinc-400">
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
    </section>
  );
};
