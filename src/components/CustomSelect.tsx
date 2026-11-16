import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Lock } from 'lucide-react';
import { STATOR_TRANSITION } from '../lib/motion.ts';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  isLocked?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  onLockedSelect?: (option: SelectOption) => void;
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
  onLockedSelect,
  options,
  placeholder = 'Select option...',
  className = '',
  id,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const selectable = options.filter((o) => !o.isLocked);
        if (selectable.length === 0) return;
        const currentIdx = selectable.findIndex((o) => o.value === value);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIdx =
          currentIdx === -1
            ? 0
            : (currentIdx + delta + selectable.length) % selectable.length;
        onChange(selectable[nextIdx].value);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, options, value, onChange]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-9 flex items-center justify-between px-3 bg-[var(--stator-surface)] border border-[var(--stator-border)] hover:border-[var(--stator-border-strong)] rounded-lg text-xs sm:text-[13px] text-[var(--stator-fg)] transition-colors cursor-pointer active:scale-[0.99] ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="truncate text-left font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--stator-fg-muted)] transition-transform duration-150 shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={STATOR_TRANSITION.micro}
            style={{ transformOrigin: 'top center' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[var(--stator-surface)] border border-[var(--stator-border-strong)] text-[var(--stator-fg)] rounded-xl shadow-xl p-1 max-h-60 overflow-y-auto space-y-0.5"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (option.isLocked) {
                      onLockedSelect?.(option);
                      setIsOpen(false);
                      return;
                    }
                    handleSelect(option.value);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-[13px] cursor-pointer transition-colors duration-100 ${
                    isSelected
                      ? 'bg-[var(--stator-accent-soft)] text-[var(--stator-fg)] font-medium'
                      : option.isLocked
                      ? 'text-[var(--stator-fg-subtle)] hover:bg-[var(--stator-surface-2)]'
                      : 'text-[var(--stator-fg-muted)] hover:bg-[var(--stator-surface-2)] hover:text-[var(--stator-fg)]'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{option.label}</span>
                      {option.isLocked && (
                        <Lock className="w-3 h-3 text-[var(--stator-fg-subtle)] shrink-0" />
                      )}
                    </div>
                    {option.description && (
                      <span className="text-[11px] text-[var(--stator-fg-subtle)] truncate mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[var(--stator-accent-fg)] shrink-0 ml-auto" />
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
