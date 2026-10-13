import React from 'react';

interface StatusFooterProps {
  onNavigatePrivacy?: () => void;
  onNavigateTerms?: () => void;
}

export const StatusFooter: React.FC<StatusFooterProps> = ({
  onNavigatePrivacy,
  onNavigateTerms,
}) => {
  return (
    <footer className="w-full border-t border-zinc-800 bg-[#09090b] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        {/* Left Side: Plain utility notice */}
        <div className="flex items-center gap-2 text-zinc-400 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>OmniConvert. Client-side utility.</span>
        </div>

        {/* Right Side: Plain links to Privacy Policy and Terms of Service */}
        <div className="flex items-center gap-5 sm:gap-6">
          <button
            type="button"
            onClick={onNavigatePrivacy}
            className="text-zinc-500 hover:text-zinc-300 transition-colors duration-150 ease-out text-xs cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={onNavigateTerms}
            className="text-zinc-500 hover:text-zinc-300 transition-colors duration-150 ease-out text-xs cursor-pointer"
          >
            Terms of Service
          </button>
          <span className="font-mono text-zinc-600 text-xs">v2.4.0</span>
        </div>
      </div>
    </footer>
  );
};
