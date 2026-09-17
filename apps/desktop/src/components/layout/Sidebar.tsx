import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Settings } from 'lucide-react';
import { Logo, cn } from '@tibyan/design-system';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'اليوم', icon: LayoutDashboard },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/groups', label: 'المجموعات', icon: BookOpen },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

export function Sidebar() {
  return (
    <aside
      className="w-64 h-full flex flex-col shrink-0 bg-[var(--color-bg-surface)] border-e border-[var(--color-border-subtle)] select-none"
      aria-label="القائمة الجانبية الرئيسية"
    >
      {/* Brand Header with Exact Official Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--color-border-subtle)]">
        <Logo size="sm" alt="تِبيان" className="shrink-0" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-[var(--color-brand-primary)] leading-tight tracking-tight">
            تِبيان
          </span>
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            نظام إدارة المعلم
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" role="navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]',
                isActive
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-primary)]'
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
        <span className="font-sans">الإصدار 1.0.0</span>
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
          <span>محلي</span>
        </span>
      </div>
    </aside>
  );
}
