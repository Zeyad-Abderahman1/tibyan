import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
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

// Client-safe useLayoutEffect to prevent SSR warning in tests
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Layer 3: Contextual Dynamic Island
 * Answers: "ماذا أستطيع أن أفعل داخل الصفحة الحالية؟"
 * Positioned inside current page workspace, near the top.
 * Height approximately 44-52px. Compact, floating, restrained styling.
 * Supports horizontal scrolling on smaller desktop viewports (1366px).
 * Features a shared horizontal gliding active indicator between contextual tabs/actions.
 */
export function ContextualDynamicIsland({
  title,
  actions,
  className,
}: ContextualDynamicIslandProps) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    visible: boolean;
  }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  const [hasMeasured, setHasMeasured] = useState(false);

  const activeAction = actions.find((a) => a.active);

  useIsomorphicLayoutEffect(() => {
    if (!activeAction) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const el = buttonRefs.current[activeAction.id];
    if (el) {
      setIndicator({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        visible: true,
      });
      setHasMeasured(true);
    }
  }, [activeAction?.id, actions]);

  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        'w-full h-[var(--context-island-height)] flex items-center justify-between gap-3 select-none',
        className
      )}
      data-testid="contextual-dynamic-island"
    >
      <div
        className={cn(
          'h-full inline-flex items-center gap-1.5 px-1.5 rounded-xl transition-all duration-200 overflow-x-auto max-w-full scrollbar-none',
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

        <div className="relative flex items-center gap-1 shrink-0">
          {/* Shared horizontal gliding indicator */}
          {indicator.visible && (
            <div
              data-testid="island-active-indicator"
              className={cn(
                'absolute rounded-lg bg-[var(--color-brand-primary)] shadow-2xs pointer-events-none z-0',
                hasMeasured && 'transition-transform transition-[width,height] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
              )}
              style={{
                top: 0,
                left: 0,
                transform: `translate(${indicator.left}px, ${indicator.top}px)`,
                width: `${indicator.width}px`,
                height: `${indicator.height}px`,
              }}
              aria-hidden="true"
            />
          )}

          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = action.active;

            return (
              <button
                key={action.id}
                ref={(el) => {
                  buttonRefs.current[action.id] = el;
                }}
                type="button"
                onClick={action.onClick}
                data-testid={`island-action-${action.id}`}
                className={cn(
                  'relative z-10 h-9 inline-flex items-center gap-2 px-3 rounded-lg text-sm font-medium transition-colors duration-150 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                <span className="whitespace-nowrap tracking-tight">{action.label}</span>
                {action.badge !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-mono transition-colors duration-150',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)]'
                    )}
                  >
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
