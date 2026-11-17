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
      ? 'bg-[var(--stator-cta-bg)] hover:bg-[var(--stator-cta-hover)] text-[var(--stator-cta-fg)] border border-transparent shadow-xs'
      : variant === 'danger'
      ? 'bg-[var(--stator-danger-soft)] hover:bg-[var(--stator-danger)] hover:text-white text-[var(--stator-danger)] border border-[var(--stator-danger)]/30'
      : variant === 'ghost'
      ? 'bg-transparent hover:bg-[var(--stator-surface-2)] text-[var(--stator-fg-muted)] hover:text-[var(--stator-fg)] border border-transparent'
      : 'bg-[var(--stator-surface)] hover:bg-[var(--stator-surface-2)] text-[var(--stator-fg)] border border-[var(--stator-border-control)] hover:border-[var(--stator-fg-muted)]';

  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors transition-transform duration-150 ease-out active:scale-[0.985] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${sizeClass} ${variantClass} ${className}`}
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
      className={`w-10 h-[22px] rounded-full p-0.5 transition-colors duration-150 ease-out cursor-pointer shrink-0 flex items-center border ${
        checked
          ? 'justify-end bg-[var(--stator-cta-bg)] border-[var(--stator-cta-bg)]'
          : 'justify-start bg-[var(--stator-surface-2)] border-[var(--stator-border-control)]'
      }`}
    >
      <motion.span
        layout
        transition={STATOR_SPRING.switchKnob}
        aria-hidden="true"
        className={`w-4 h-4 rounded-full shadow-xs block ${
          checked ? 'bg-[var(--stator-cta-fg)]' : 'bg-[var(--stator-fg-muted)]'
        }`}
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

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`flex flex-wrap items-baseline justify-between gap-2 ${className}`}>
    <div className="min-w-0">
      <h3 className="text-[17px] sm:text-[18px] font-medium tracking-tight text-[var(--stator-fg)]">
        {title}
      </h3>
      {subtitle && (
        <p className="text-[13px] text-[var(--stator-fg-muted)] mt-0.5">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
