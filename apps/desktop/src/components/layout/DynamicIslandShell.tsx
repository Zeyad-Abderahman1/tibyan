import { NavLink } from 'react-router-dom';
import { Logo, cn } from '@tibyan/design-system';
import { DynamicIslandNav } from './DynamicIslandNav.js';
import { DynamicIslandSystem } from './DynamicIslandSystem.js';

export interface DynamicIslandShellProps {
  className?: string;
}

export function DynamicIslandShell({ className }: DynamicIslandShellProps) {
  return (
    <header
      className={cn(
        'fixed top-3.5 inset-x-0 mx-auto z-50 w-[94%] max-w-[1600px] select-none',
        className
      )}
      aria-label="شريط التنقل العائم (Dynamic Island)"
      data-testid="dynamic-island-shell"
    >
      <div
        className={cn(
          'relative flex items-center justify-between px-5 py-2 rounded-2xl transition-all duration-300',
          // Opaque fallback with subtle backdrop blur if supported
          'bg-[var(--color-bg-island-fallback,#FFFFFF)] dark:bg-[var(--color-bg-island-fallback,#0F1F24)]',
          'supports-[backdrop-filter]:bg-[var(--color-bg-island)] supports-[backdrop-filter]:backdrop-blur-md',
          'border border-[var(--color-border-island)] shadow-[var(--shadow-island)]'
        )}
      >
        {/* Right in RTL: Natural Brand Anchor (NO database telemetry, clean typography) */}
        <NavLink
          to="/"
          className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)] rounded-lg p-1 transition-opacity hover:opacity-90"
          aria-label="تِبيان — الصفحة الرئيسية"
        >
          <div className="inline-flex items-center justify-center p-1 rounded-md bg-white border border-[var(--color-border-subtle)] shadow-xs shrink-0">
            <Logo size="sm" alt="تِبيان" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[var(--color-brand-primary)] dark:text-white leading-tight tracking-tight">
              تِبيان
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-normal leading-none mt-0.5">
              مساعد المعلم الذكي
            </span>
          </div>
        </NavLink>

        {/* Center: Restrained Navigation Links */}
        <DynamicIslandNav />

        {/* Left in RTL: Compact System Controls (No blank pill, no bloated cards) */}
        <DynamicIslandSystem />
      </div>
    </header>
  );
}
