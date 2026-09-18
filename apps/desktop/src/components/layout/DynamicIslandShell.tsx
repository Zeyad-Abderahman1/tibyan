import { NavLink } from 'react-router-dom';
import { Logo, cn } from '@tibyan/design-system';
import { DynamicIslandNav } from './DynamicIslandNav.js';
import { DynamicIslandContext } from './DynamicIslandContext.js';
import { DynamicIslandSystem } from './DynamicIslandSystem.js';

export interface DynamicIslandShellProps {
  className?: string;
}

export function DynamicIslandShell({ className }: DynamicIslandShellProps) {
  return (
    <header
      className={cn(
        'fixed top-3 inset-x-0 mx-auto z-50 w-[95%] max-w-7xl select-none',
        className
      )}
      aria-label="شريط التنقل العائم (Dynamic Island)"
      data-testid="dynamic-island-shell"
    >
      <div
        className={cn(
          'relative flex items-center justify-between px-3.5 py-2 rounded-full transition-all duration-300',
          // Opaque fallback first, then backdrop-blur if supported (performance safety)
          'bg-[var(--color-bg-island-fallback,#FFFFFF)] dark:bg-[var(--color-bg-island-fallback,#0F1F24)]',
          'supports-[backdrop-filter]:bg-[var(--color-bg-island)] supports-[backdrop-filter]:backdrop-blur-md',
          'border border-[var(--color-border-island)] shadow-[var(--shadow-island)]'
        )}
      >
        {/* Trailing in RTL: Brand Lockup (strictly user-relevant identity, NO internal db telemetry) */}
        <NavLink
          to="/"
          className="flex items-center gap-2.5 px-2 py-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)] transition-opacity hover:opacity-90"
          aria-label="تِبيان — الصفحة الرئيسية"
        >
          <div className="inline-flex items-center justify-center p-1 rounded-lg bg-white border border-[var(--color-border-subtle)] shadow-xs">
            <Logo size="sm" alt="تِبيان" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[var(--color-brand-primary)] dark:text-[var(--color-text-primary)] leading-tight tracking-tight">
              تِبيان
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium leading-none">
              نظام المعلم
            </span>
          </div>
        </NavLink>

        {/* Center: Gliding Dynamic Navigation Island */}
        <DynamicIslandNav />

        {/* Leading in RTL: Context Tools + System Cluster */}
        <div className="flex items-center gap-3">
          <DynamicIslandContext className="hidden xl:flex" />
          <DynamicIslandSystem />
        </div>
      </div>
    </header>
  );
}
