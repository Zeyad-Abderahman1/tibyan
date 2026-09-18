import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Settings } from 'lucide-react';
import { cn } from '@tibyan/design-system';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'اليوم', icon: LayoutDashboard },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/groups', label: 'المجموعات', icon: BookOpen },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

export interface DynamicIslandNavProps {
  items?: NavItem[];
  className?: string;
}

export function DynamicIslandNav({ items = DEFAULT_NAV_ITEMS, className }: DynamicIslandNavProps) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  // Calculate sliding active capsule position dynamically without hardcoding pixel widths
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const activeEl = containerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      setIndicatorStyle({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
        opacity: 1,
      });
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname, items]);

  return (
    <nav
      ref={containerRef}
      className={cn(
        'relative flex items-center p-1 rounded-full bg-[var(--color-bg-surface-subtle)]/70 dark:bg-[var(--color-bg-surface-subtle)]/50 border border-[var(--color-border-subtle)]/80 select-none transition-all duration-300',
        className
      )}
      role="navigation"
      aria-label="التنقل الأساسي في النظام"
      data-testid="dynamic-island-nav"
    >
      {/* Gliding capsule background indicator (hardware accelerated) */}
      <span
        className="absolute top-1 bottom-1 rounded-full pointer-events-none transition-all"
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
          transitionDuration: 'var(--duration-normal, 250ms)',
          transitionTimingFunction: 'var(--ease-spring, cubic-bezier(0.16, 1, 0.3, 1))',
          backgroundColor: 'var(--color-brand-primary)',
        }}
        aria-hidden="true"
      />

      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            data-active={isActive ? 'true' : undefined}
            className={({ isActive: navActive }) =>
              cn(
                'relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]',
                navActive
                  ? 'text-white dark:text-[#5EEAD4] bg-[var(--color-brand-primary)] md:bg-transparent'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0 transition-transform duration-200" aria-hidden="true" />
            <span className="tracking-tight">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
