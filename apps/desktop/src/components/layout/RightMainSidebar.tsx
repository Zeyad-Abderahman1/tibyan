import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  BookMarked,
  CreditCard,
  Bot,
  Settings,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@tibyan/design-system';

export interface NavSectionItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
}

/**
 * Approved 8 Primary Application Sections in Order:
 * 1. اليوم
 * 2. الطلاب
 * 3. المجموعات
 * 4. تحضير الطلاب
 * 5. مكتبة المناهج
 * 6. المالية
 * 7. تِبيان
 * 8. الإعدادات
 *
 * Forbidden items: Tests, Slides, Math Engine, Gemini, duplicate curriculum nav
 */
export const APPROVED_NAV_ITEMS: NavSectionItem[] = [
  { to: '/', label: 'اليوم', icon: LayoutDashboard, key: 'today' },
  { to: '/students', label: 'الطلاب', icon: Users, key: 'students' },
  { to: '/groups', label: 'المجموعات', icon: BookOpen, key: 'groups' },
  { to: '/attendance', label: 'تحضير الطلاب', icon: CalendarCheck, key: 'attendance' },
  { to: '/curriculum-library', label: 'مكتبة المناهج', icon: BookMarked, key: 'curriculum-library' },
  { to: '/finance', label: 'المالية', icon: CreditCard, key: 'finance' },
  { to: '/assistant', label: 'تِبيان', icon: Bot, key: 'assistant' },
  { to: '/settings', label: 'الإعدادات', icon: Settings, key: 'settings' },
];

const SIDEBAR_STORAGE_KEY = 'tibyan:sidebar_collapsed';

export interface RightMainSidebarProps {
  className?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Layer 2: Right Collapsible Main Navigation
 * Physical position: RIGHT in RTL layout.
 * Answers: "أين أنا في البرنامج؟"
 * Supports expanded and collapsed states, persists state across restarts.
 */
export function RightMainSidebar({ className, onCollapsedChange }: RightMainSidebarProps) {
  const location = useLocation();

  // Load persisted state from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  return (
    <aside
      className={cn(
        'h-full shrink-0 flex flex-col justify-between border-s border-[var(--color-border-subtle)] bg-[var(--color-sidebar-background)] select-none transition-all duration-300 z-20',
        isCollapsed ? 'w-16' : 'w-56',
        className
      )}
      dir="rtl"
      aria-label="القائمة الجانبية الرئيسية"
      data-testid="right-main-sidebar"
      data-collapsed={isCollapsed ? 'true' : 'false'}
    >
      {/* Top: Header / Toggle button */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-border-subtle)]">
          {!isCollapsed && (
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] px-2">
              التنقل الرئيسي
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              'p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)] transition-colors mx-auto',
              !isCollapsed && 'me-1 ms-auto'
            )}
            aria-label={isCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
            data-testid="sidebar-toggle-btn"
          >
            {isCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav
          className="flex-1 px-2 py-3 space-y-1 overflow-y-auto"
          role="navigation"
          aria-label="أقسام تِبيان الرئيسية"
          data-testid="sidebar-nav"
        >
          {APPROVED_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={isCollapsed ? item.label : undefined}
                data-testid={`sidebar-item-${item.key}`}
                data-active={isActive ? 'true' : undefined}
                className={({ isActive: navActive }) =>
                  cn(
                    'group flex items-center min-h-11 rounded-xl text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]',
                    isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5',
                    navActive
                      ? 'bg-[var(--color-sidebar-active)] text-white shadow-xs font-semibold'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                  )
                }
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0 transition-transform duration-200', isActive && 'scale-105')} aria-hidden="true" />
                {!isCollapsed && (
                  <span className="tracking-tight truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / System status */}
      <div className={cn('p-3 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] flex items-center', isCollapsed ? 'justify-center' : 'justify-between')}>
        {!isCollapsed ? (
          <>
            <span className="font-sans text-[11px]">الإصدار 1.0</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-status-success)] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
              <span>محلي</span>
            </span>
          </>
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="النظام متصل محلياً" aria-hidden="true" />
        )}
      </div>
    </aside>
  );
}
