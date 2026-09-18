import React from 'react';
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

  return (
    <nav
      className={cn(
        'relative flex items-center gap-1 select-none',
        className
      )}
      role="navigation"
      aria-label="التنقل الأساسي في النظام"
      data-testid="dynamic-island-nav"
    >
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
                'relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]',
                navActive
                  ? 'text-[var(--color-brand-primary)] dark:text-[#5CE1E6] font-semibold bg-[var(--color-brand-primary)]/8 dark:bg-[#5CE1E6]/10 shadow-2xs'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0 transition-transform duration-200" aria-hidden="true" />
            <span className="tracking-tight">{item.label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 inset-x-2.5 h-0.5 rounded-full bg-[var(--color-brand-primary)] dark:bg-[#5CE1E6] shadow-[0_0_8px_rgba(92,225,230,0.5)] transition-all duration-200"
                aria-hidden="true"
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
