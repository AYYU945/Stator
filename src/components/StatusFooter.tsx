import React from 'react';

export const StatusFooter: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-800 bg-[#09090b] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        {/* Left Side: Static solid status dot */}
        <div className="flex items-center gap-2 text-zinc-400 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>100% Client-Side Engine</span>
        </div>

        {/* Right Side: Simple muted links */}
        <div className="flex items-center gap-5 sm:gap-6">
          <a
            href="#faq"
            className="text-zinc-500 hover:text-zinc-300 transition-colors duration-150 ease-out"
          >
            FAQ
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors duration-150 ease-out"
          >
            <span>GitHub</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
              4.8k ★
            </span>
          </a>
          <span className="font-mono text-zinc-600">v2.4.0</span>
        </div>
      </div>
    </footer>
  );
};
