import React, { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  neutral: {
    container: 'bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]',
    dot: 'bg-[var(--color-text-muted)]',
  },
  primary: {
    container: 'bg-[var(--color-bg-surface-subtle)] text-[var(--color-brand-primary)] border-[rgba(11,61,61,0.2)]',
    dot: 'bg-[var(--color-brand-primary)]',
  },
  accent: {
    container: 'bg-[var(--color-brand-accent-subtle)] text-[#997316] dark:text-[#E6C35C] border-[rgba(197,155,39,0.3)]',
    dot: 'bg-[var(--color-brand-accent)]',
  },
  success: {
    container: 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] border-[var(--color-status-success-border)]',
    dot: 'bg-[var(--color-status-success)]',
  },
  warning: {
    container: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] border-[var(--color-status-warning-border)]',
    dot: 'bg-[var(--color-status-warning)]',
  },
  danger: {
    container: 'bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border-[var(--color-status-danger-border)]',
    dot: 'bg-[var(--color-status-danger)]',
  },
  info: {
    container: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info)] border-[var(--color-status-info-border)]',
    dot: 'bg-[var(--color-status-info)]',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1 rounded-[var(--radius-sm)]',
  md: 'text-xs px-2.5 py-0.75 gap-1.5 rounded-[var(--radius-md)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'sm', dot = false, className, children, ...props }, ref) => {
    const styles = variantStyles[variant];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium border select-none',
          sizeStyles[size],
          styles.container,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)}
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';
