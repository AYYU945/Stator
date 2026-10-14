import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Are my files uploaded to any server?',
    answer:
      'No. All processing happens entirely in your browser using WebAssembly and HTML5 Canvas. Your files never touch a remote server.',
  },
  {
    question: 'Is there a file size limit?',
    answer:
      'There are no arbitrary cloud caps or subscription walls. File size is limited only by your available device RAM.',
  },
  {
    question: 'Can I use Stator offline?',
    answer:
      'Yes. Once the app and WASM core are cached in your browser, conversions work completely offline without an active internet connection.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="w-full max-w-3xl mx-auto mt-12 sm:mt-16 mb-8 px-4">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          <span>Frequently Asked Questions</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Everything you need to know about on-device processing.
        </p>
      </div>

      <div className="space-y-2.5">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden transition-colors shadow-xs"
            >
              <button
                type="button"
                onClick={() => toggleItem(idx)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer select-none group"
                aria-expanded={isOpen}
              >
                <span className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-150">
                  {faq.question}
                </span>

                <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ease-out ${
                      isOpen ? 'rotate-180 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  />
                </div>
              </button>

              {/* Smooth CSS Grid transition */}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-4 pt-0 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-800">
                    <p className="mt-3">{faq.answer}</p>
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
