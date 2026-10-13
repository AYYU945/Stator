import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section className="text-center pt-10 pb-6 sm:pt-14 sm:pb-8 max-w-2xl mx-auto px-4 flex flex-col items-center">
      {/* Direct Factual Headline */}
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-tight">
        Local Media Converter
      </h1>

      {/* Subtitle */}
      <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed text-center">
        Convert image, audio, and video formats locally inside your browser using WebAssembly. No files are uploaded to any server.
      </p>
    </section>
  );
};
