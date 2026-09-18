import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, LogOut } from 'lucide-react';
import { Button, useTheme, cn } from '@tibyan/design-system';
import { useAuth } from '../../hooks/useAuth.js';
import { useUpdateTheme } from '../../hooks/useSettings.js';

export interface DynamicIslandSystemProps {
  className?: string;
}

export function DynamicIslandSystem({ className }: DynamicIslandSystemProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const updateThemeMutation = useUpdateTheme();
  const { session, logout } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      if (typeof window !== 'undefined' && window.tibyan?.system?.getSettings) {
        const res = await window.tibyan.system.getSettings();
        if (res.success) {
          return res.data;
        }
      }
      return null;
    },
    staleTime: 1000 * 30,
  });

  const activeAcademicYearName = settings?.activeAcademicYearName;
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleToggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    updateThemeMutation.mutate({ theme: nextTheme });
  };

  const handleLogout = async () => {
    setLogoutError(null);
    const res = await logout();
    if (!res.success) {
      setLogoutError(res.error?.message || 'تعذر تسجيل الخروج من النظام.');
    }
  };

  return (
    <div
      className={cn('flex items-center gap-3 select-none text-xs', className)}
      data-testid="dynamic-island-system"
    >
      {/* Active Academic Year (Clean informative label, NOT a giant button pill) */}
      {activeAcademicYearName && (
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]/70"
          data-testid="active-year-display"
        >
          <span className="text-[11px] text-[var(--color-text-muted)] font-normal">العام:</span>
          <span className="font-semibold text-[var(--color-text-primary)] font-mono num-isolate text-xs">
            {activeAcademicYearName}
          </span>
        </div>
      )}

      {/* User Information & Logout */}
      {session && (
        <div
          className="flex items-center gap-2 pe-2 border-e border-[var(--color-border-subtle)]/80"
          data-testid="topbar-user-info"
        >
          {/* Avatar initial */}
          <div
            className="w-6 h-6 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] dark:bg-[#5CE1E6]/15 dark:text-[#5CE1E6] flex items-center justify-center font-bold text-[11px]"
            aria-hidden="true"
          >
            {session.fullName.trim().charAt(0) || 'م'}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-primary)] max-w-[110px] truncate">
              {session.fullName}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-surface-subtle)] px-1.5 py-0.5 rounded font-normal">
              {session.role === 'OWNER' ? 'المعلم' : 'مساعد'}
            </span>
          </div>

          {/* Compact Logout Icon Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)] rounded-md transition-colors"
            data-testid="topbar-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>

          {logoutError && (
            <span
              className="text-[10px] text-[var(--color-status-danger)] max-w-[100px] truncate"
              role="alert"
              title={logoutError}
              data-testid="logout-error-msg"
            >
              {logoutError}
            </span>
          )}
        </div>
      )}

      {/* Compact Theme Toggle Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleTheme}
        aria-label={resolvedTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
        title={resolvedTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)] rounded-md transition-colors"
        data-testid="topbar-theme-toggle-btn"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-4 h-4 text-[var(--color-brand-accent)] transition-transform duration-300 hover:rotate-45" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-transform duration-300" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
