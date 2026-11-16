import React from 'react';
import { motion } from 'motion/react';
import { STATOR_SPRING } from '../../lib/motion.ts';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}) => {
  const sizeClass =
    size === 'sm'
      ? 'min-h-[34px] px-3 py-1.5 text-xs gap-1.5'
      : 'min-h-[40px] px-4 py-2 text-[13px] gap-2';

  const variantClass =
    variant === 'primary'
      ? 'bg-[var(--stator-accent)] hover:bg-[var(--stator-accent-hover)] text-white border border-transparent shadow-xs'
      : variant === 'danger'
      ? 'bg-rose-500/10 hover:bg-rose-500/15 text-[var(--stator-danger)] border border-rose-500/25'
      : variant === 'ghost'
      ? 'bg-transparent hover:bg-[var(--stator-surface-2)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] border border-transparent'
      : 'bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] text-[var(--stator-fg)] border border-[var(--stator-border)] hover:border-[var(--stator-border-strong)]';

  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
};

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
  title?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  title,
}) => {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      whileTap={{ scale: 0.94 }}
      onClick={() => onChange(!checked)}
      className={`w-10 h-[22px] rounded-full p-0.5 transition-colors duration-150 ease-out cursor-pointer shrink-0 flex items-center ${
        checked ? 'justify-end bg-[var(--stator-accent)]' : 'justify-start bg-[var(--stator-border-strong)]'
      }`}
    >
      <motion.span
        layout
        transition={STATOR_SPRING.switchKnob}
        aria-hidden="true"
        className="w-[18px] h-[18px] rounded-full bg-white shadow-xs block"
      />
    </motion.button>
  );
};

export interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
}

export const Surface: React.FC<SurfaceProps> = ({ children, className = '' }) => (
  <div
    className={`bg-[var(--stator-surface)] border border-[var(--stator-border)] rounded-xl ${className}`}
  >
    {children}
  </div>
);
