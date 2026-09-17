import React, { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'subtle';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const cardVariants: Record<CardVariant, string> = {
  default:
    'bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-xs',
  elevated:
    'bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] shadow-md',
  outlined:
    'bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)]',
  subtle:
    'bg-[var(--color-bg-surface-subtle)] border border-transparent',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[var(--radius-lg)] text-[var(--color-text-primary)] transition-colors overflow-hidden',
          cardVariants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5 p-5 border-b border-[var(--color-border-subtle)]', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-semibold leading-none tracking-tight text-[var(--color-text-primary)] text-start', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-[var(--color-text-muted)] text-start', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-5 pt-0 border-t border-[var(--color-border-subtle)]', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
