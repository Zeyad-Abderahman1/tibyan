import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../utils/cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-hover)] active:bg-[var(--color-brand-primary-active)] border border-transparent shadow-xs',
  secondary:
    'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-surface-subtle)] active:bg-[var(--color-border-subtle)] shadow-xs',
  accent:
    'bg-[var(--color-brand-accent)] text-white hover:bg-[var(--color-brand-accent-hover)] border border-transparent shadow-xs',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-subtle)] hover:text-[var(--color-text-primary)] border border-transparent',
  danger:
    'bg-[var(--color-status-danger)] text-white hover:bg-[#B91C1C] border border-transparent shadow-xs',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-[var(--radius-sm)]',
  md: 'text-sm px-4 py-2 gap-2 rounded-[var(--radius-md)]',
  lg: 'text-base px-5 py-2.5 gap-2.5 rounded-[var(--radius-lg)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2
            className="animate-spin shrink-0"
            size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
            aria-hidden="true"
          />
        )}
        {!loading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
