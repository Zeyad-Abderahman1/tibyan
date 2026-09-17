import { useEffect, useCallback, useRef } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn.js';

export interface PinPadProps {
  /**
   * Current PIN string value (0 to 4 digits).
   */
  value?: string;
  /**
   * Called when PIN changes.
   */
  onChange?: (pin: string) => void;
  /**
   * Called when exactly 4 digits are completed.
   */
  onComplete?: (pin: string) => void;
  /**
   * Disables keypad interaction (e.g. during authentication or cooldown lock).
   */
  disabled?: boolean;
  /**
   * Optional error message to display beneath the PIN display.
   */
  error?: string;
  /**
   * Whether to mask the entered digits (default: true).
   */
  masked?: boolean;
  /**
   * Accessible label for the PIN input.
   */
  label?: string;
  /**
   * Additional container class names.
   */
  className?: string;
}

export function PinPad({
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error,
  masked = true,
  label = 'رمز PIN المكون من 4 أرقام',
  className,
}: PinPadProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Strictly enforce numeric digits only, max 4
  const sanitizedValue = value.replace(/\D/g, '').slice(0, 4);

  const handleDigit = useCallback(
    (digit: string) => {
      if (disabled || sanitizedValue.length >= 4) return;
      const nextPin = sanitizedValue + digit;
      onChange?.(nextPin);
      if (nextPin.length === 4) {
        onComplete?.(nextPin);
      }
    },
    [disabled, sanitizedValue, onChange, onComplete]
  );

  const handleBackspace = useCallback(() => {
    if (disabled || sanitizedValue.length === 0) return;
    const nextPin = sanitizedValue.slice(0, -1);
    onChange?.(nextPin);
  }, [disabled, sanitizedValue, onChange]);

  const handleClear = useCallback(() => {
    if (disabled || sanitizedValue.length === 0) return;
    onChange?.('');
  }, [disabled, sanitizedValue, onChange]);

  // Handle keyboard interaction
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Do not intercept if focus is inside an input field
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleDigit, handleBackspace, handleClear]);

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col items-center select-none w-full max-w-[280px]', className)}
      role="group"
      aria-label={label}
    >
      {/* 4-Digit Display Indicator — Strictly LTR regardless of app direction */}
      <div
        dir="ltr"
        className="flex items-center justify-center gap-3 my-4"
        aria-label="خانة رمز PIN"
      >
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < sanitizedValue.length;
          const isCurrent = index === sanitizedValue.length && !disabled;
          const digitChar = sanitizedValue[index];

          return (
            <div
              key={index}
              className={cn(
                'w-12 h-14 rounded-[var(--radius-md)] flex items-center justify-center text-xl font-bold transition-all',
                'border bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]',
                isCurrent &&
                  'border-[var(--color-brand-primary)] ring-2 ring-[var(--color-focus-ring)] shadow-xs',
                isFilled && !isCurrent && 'border-[var(--color-border-strong)]',
                !isFilled && !isCurrent && 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-subtle)]',
                error && 'border-[var(--color-status-danger)] ring-[rgba(220,38,38,0.2)]',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isFilled ? (
                masked ? (
                  <span className="w-3.5 h-3.5 rounded-full bg-[var(--color-brand-primary)]" />
                ) : (
                  <span>{digitChar}</span>
                )
              ) : (
                <span className="text-transparent">·</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <p role="alert" className="text-xs text-[var(--color-status-danger)] mb-3 text-center">
          {error}
        </p>
      )}

      {/* Keypad Grid (3x4) */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(String(d))}
            className={cn(
              'h-12 rounded-[var(--radius-md)] text-lg font-semibold transition-colors',
              'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-xs',
              'hover:bg-[var(--color-bg-surface-subtle)] active:bg-[var(--color-border-subtle)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {d}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          disabled={disabled || sanitizedValue.length === 0}
          onClick={handleClear}
          aria-label="مسح الكل"
          className={cn(
            'h-12 rounded-[var(--radius-md)] flex items-center justify-center text-sm font-medium transition-colors',
            'bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] border border-transparent',
            'hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)] active:opacity-80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <RotateCcw size={18} aria-hidden="true" />
        </button>

        {/* 0 Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className={cn(
            'h-12 rounded-[var(--radius-md)] text-lg font-semibold transition-colors',
            'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-xs',
            'hover:bg-[var(--color-bg-surface-subtle)] active:bg-[var(--color-border-subtle)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          0
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          disabled={disabled || sanitizedValue.length === 0}
          onClick={handleBackspace}
          aria-label="حذف رقم"
          className={cn(
            'h-12 rounded-[var(--radius-md)] flex items-center justify-center text-sm font-medium transition-colors',
            'bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] border border-transparent',
            'hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)] active:opacity-80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <Delete size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
