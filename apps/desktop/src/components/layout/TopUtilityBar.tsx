import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, LogOut, Calendar } from 'lucide-react';
import { Button, useTheme, cn, TibyanBrand } from '@tibyan/design-system';
import { useAuth } from '../../hooks/useAuth.js';
import { useUpdateTheme } from '../../hooks/useSettings.js';
import { TeacherAvatar } from './TeacherAvatar.js';

export interface TopUtilityBarProps {
  className?: string;
}

/**
 * Layer 1: Top Utility Bar
 * Dedicated strictly to global identity, academic year, teacher identity, theme toggle, and session actions.
 * Contains ZERO main application navigation tabs.
 */
export function TopUtilityBar({ className }: TopUtilityBarProps) {
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
    <header
      className={cn(
        'h-[var(--topbar-height)] w-full shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-topbar-background)] px-4 sm:px-6 flex items-center justify-between select-none z-30 transition-colors',
        className
      )}
      aria-label="شريط الأدوات العلوي"
      data-testid="top-utility-bar"
    >
      {/* Right side in RTL: Brand Logo / Wordmark */}
      <div className="flex items-center gap-3">
        <div data-testid="topbar-brand">
          <TibyanBrand size="sm" showWordmark={true} showSubtitle={false} />
        </div>

        {/* Active Academic Year Badge */}
        {activeAcademicYearName ? (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]/70"
            data-testid="active-year-display"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))]" aria-hidden="true" />
            <span className="text-[11px] text-[var(--color-text-muted)] font-normal">العام:</span>
            <span className="font-semibold text-[var(--color-text-primary)] font-mono num-isolate text-xs">
              {activeAcademicYearName}
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-[var(--color-status-warning)] font-medium">
            <span>لا يوجد عام دراسي نشط</span>
          </div>
        )}
      </div>

      {/* Left side in RTL: Teacher identity, theme toggle, logout */}
      <div className="flex items-center gap-3">
        {/* Teacher / Assistant Identity */}
        {session && (
          <div
            className="flex items-center gap-2.5 pe-3 border-e border-[var(--color-border-subtle)]"
            data-testid="topbar-user-info"
          >
            <TeacherAvatar
              name={session.fullName}
              role={session.role}
              size="sm"
            />
            <div className="flex flex-col text-right leading-tight">
              <span className="text-xs font-semibold text-[var(--color-text-primary)] max-w-[120px] truncate">
                {session.fullName}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] font-normal">
                {session.role === 'OWNER' ? 'المعلم المسؤول' : 'مساعد'}
              </span>
            </div>

            {/* Logout Action */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)] rounded-md transition-colors"
              data-testid="topbar-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>

            {logoutError && (
              <span
                className="text-[10px] text-[var(--color-status-danger)] max-w-[120px] truncate"
                role="alert"
                title={logoutError}
                data-testid="logout-error-msg"
              >
                {logoutError}
              </span>
            )}
          </div>
        )}

        {/* Theme Toggle Button */}
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
    </header>
  );
}
