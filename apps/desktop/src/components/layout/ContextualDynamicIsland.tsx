import React from 'react';
import { cn } from '@tibyan/design-system';

export interface ContextualAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  active?: boolean;
  badge?: string | number;
  variant?: 'default' | 'primary' | 'danger';
}

export interface ContextualDynamicIslandProps {
  title?: string;
  actions: ContextualAction[];
  className?: string;
}

/**
 * Layer 3: Contextual Dynamic Island
 * Answers: "ماذا أستطيع أن أفعل داخل الصفحة الحالية؟"
 * Positioned inside current page workspace, near the top.
 * Height approximately 44-52px. Compact, floating, restrained styling.
 * Supports horizontal scrolling on smaller desktop viewports (1366px).
 */
export function ContextualDynamicIsland({
  title,
  actions,
  className,
}: ContextualDynamicIslandProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between gap-3 py-1 select-none',
        className
      )}
      data-testid="contextual-dynamic-island"
    >
      <div
        className={cn(
          'inline-flex items-center gap-1.5 p-1.5 rounded-2xl transition-all duration-200 overflow-x-auto max-w-full scrollbar-none',
          'bg-[var(--color-bg-island-fallback,#FFFFFF)] dark:bg-[var(--color-bg-island-fallback,#0F1F24)]',
          'supports-[backdrop-filter]:bg-[var(--color-bg-island)] supports-[backdrop-filter]:backdrop-blur-md',
          'border border-[var(--color-border-island)] shadow-[var(--shadow-island)]'
        )}
        role="toolbar"
        aria-label="أدوات الصفحة الحالية"
      >
        {title && (
          <span className="text-xs font-bold text-[var(--color-text-primary)] px-2.5 shrink-0 hidden sm:inline-block border-e border-[var(--color-border-subtle)]/70 me-1">
            {title}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = action.active;

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                data-testid={`island-action-${action.id}`}
                className={cn(
                  'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]',
                  isActive
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-2xs dark:bg-[#5CE1E6] dark:text-[#0A1417] font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                <span className="whitespace-nowrap tracking-tight">{action.label}</span>
                {action.badge !== undefined && (
                  <span className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                    isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black' : 'bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)]'
                  )}>
                    {action.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
