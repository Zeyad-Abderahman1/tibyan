import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn.js';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: ModalSize;
  closeOnEsc?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
  showCloseButton?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnEsc = true,
  closeOnOverlayClick = true,
  className,
  showCloseButton = true,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus lifecycle management
  useEffect(() => {
    if (!isOpen) return;

    // Remember currently focused element before modal takes focus
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    // Move focus inside the dialog
    const focusTimer = setTimeout(() => {
      if (!modalRef.current) return;

      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors);

      if (focusableElements.length > 0) {
        focusableElements[0]!.focus();
      } else {
        modalRef.current.focus();
      }
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      // Restore focus to prior element on close/unmount if still in document
      if (
        previousActiveElementRef.current &&
        typeof document !== 'undefined' &&
        document.contains(previousActiveElementRef.current)
      ) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--color-overlay)] transition-opacity animate-in fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog Surface */}
      <div
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative w-full z-10 bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-primary)]',
          'border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] shadow-lg overflow-hidden',
          'flex flex-col focus:outline-none',
          sizeStyles[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
            <div className="flex flex-col gap-1">
              {title && (
                <h2 id={titleId} className="text-base font-semibold text-[var(--color-text-primary)] text-start">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-xs text-[var(--color-text-muted)] text-start">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className={cn(
                  'p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                  'rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-bg-surface-subtle)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]'
                )}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
