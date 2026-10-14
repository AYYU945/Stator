import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-3.5 py-2 bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-900 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 cursor-pointer shadow-xs ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="truncate text-left font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border-zinc-200 text-zinc-900 dark:bg-[#121214] dark:border-zinc-800 dark:text-zinc-100 border rounded-md shadow-xl p-1 backdrop-blur-md max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95 duration-100 ease-out"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors duration-100 ease-out ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {option.description}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-200 shrink-0 ml-auto" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
