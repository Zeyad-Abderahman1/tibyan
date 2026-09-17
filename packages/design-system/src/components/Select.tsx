import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn.js';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      children,
      id,
      className,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

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
            htmlFor={selectId}
            className="text-xs font-medium text-[var(--color-text-primary)] select-none text-start"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedByIds}
            className={cn(
              'w-full appearance-none bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] text-sm rounded-[var(--radius-md)] ps-3 pe-9 py-2',
              'border border-[var(--color-border-subtle)] transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:border-[var(--color-brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
              'disabled:bg-[var(--color-disabled-bg)] disabled:text-[var(--color-disabled-text)] disabled:cursor-not-allowed',
              error &&
                'border-[var(--color-status-danger)] focus-visible:border-[var(--color-status-danger)] focus-visible:ring-[rgba(220,38,38,0.3)]',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute inset-inline-end-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
            <ChevronDown size={16} aria-hidden="true" />
          </div>
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

Select.displayName = 'Select';
