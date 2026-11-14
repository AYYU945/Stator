import React from 'react';

interface StatusFooterProps {
  onNavigatePrivacy?: () => void;
  onNavigateTerms?: () => void;
  onNavigateDmca?: () => void;
}

export const StatusFooter: React.FC<StatusFooterProps> = ({
  onNavigatePrivacy,
  onNavigateTerms,
  onNavigateDmca,
}) => {
  const handleDmcaClick = () => {
    if (onNavigateDmca) {
      onNavigateDmca();
    } else if (onNavigateTerms) {
      onNavigateTerms();
      window.setTimeout(() => {
        const dmcaEl = document.getElementById('dmca-notice');
        if (dmcaEl) {
          dmcaEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    }
  };

  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        {/* Left Side: Plain utility notice */}
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-medium">
          <span>Stator. Client-side utility.</span>
        </div>

        {/* Right Side: Plain links to Privacy Policy, Terms of Service, and DMCA Notice */}
        <div className="flex items-center gap-5 sm:gap-6">
          <button
            type="button"
            onClick={onNavigatePrivacy}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors duration-150 ease-out text-xs cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={onNavigateTerms}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors duration-150 ease-out text-xs cursor-pointer"
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={handleDmcaClick}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors duration-150 ease-out text-xs cursor-pointer"
          >
            DMCA Notice
          </button>
          <span className="font-mono text-zinc-400 dark:text-zinc-600 text-xs">MIT Open Source · v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};
