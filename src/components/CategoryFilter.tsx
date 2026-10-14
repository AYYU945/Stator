import React from 'react';
import { Sparkles, Image, Video, Music, FileText, Archive } from 'lucide-react';

interface CategoryFilterProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = [
  { label: 'All Formats', icon: Sparkles },
  { label: 'Images', icon: Image },
  { label: 'Video', icon: Video },
  { label: 'Audio', icon: Music },
  { label: 'Documents', icon: FileText },
  { label: 'Archives', icon: Archive },
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto mt-6 mb-5 px-1 sm:px-0">
      {/* 
        Horizontal scrollable container with overflow-x-auto no-scrollbar flex-nowrap
        Permits smooth touch swiping on mobile and clean alignment on desktop
      */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap pb-1 scroll-smooth">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.label;
          const Icon = cat.icon;

          return (
            <button
              key={cat.label}
              onClick={() => onSelectCategory(cat.label)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
