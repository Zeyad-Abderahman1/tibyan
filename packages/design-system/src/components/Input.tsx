import React, { forwardRef, useId } from 'react';
import { cn } from '../utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      className,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // Construct aria-describedby for accessibility
    const describedByIds = [
      error ? errorId : null,
      helperText && !error ? helperId : null,
      ariaDescribedBy ?? null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--color-text-primary)] select-none text-start"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute inset-inline-start-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedByIds}
            className={cn(
              'w-full min-h-[var(--control-height-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] text-[15px] rounded-[var(--radius-md)] px-3 py-2',
              'border border-[var(--color-border-subtle)] transition-colors',
              'placeholder:text-[var(--color-text-muted)]',
              'focus-visible:outline-none focus-visible:border-[var(--color-brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
              'disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)] disabled:cursor-not-allowed',
              error &&
                'border-[var(--color-status-danger)] focus-visible:border-[var(--color-status-danger)] focus-visible:ring-[rgba(220,38,38,0.3)]',
              leftIcon && 'ps-9',
              rightIcon && 'pe-9',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-inline-end-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-xs text-[var(--color-status-danger)] text-start">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-[var(--color-text-muted)] text-start">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
