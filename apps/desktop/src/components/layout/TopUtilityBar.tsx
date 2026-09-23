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
        'h-[var(--topbar-height)] w-full shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-topbar-background)] px-5 sm:px-7 flex items-center justify-between select-none z-30 transition-colors',
        className
      )}
      aria-label="شريط الأدوات العلوي"
      data-testid="top-utility-bar"
    >
      {/* Right side in RTL: Brand Logo / Wordmark */}
      <div className="flex items-center gap-4">
        <div data-testid="topbar-brand">
          <TibyanBrand size="sm" showWordmark={true} showSubtitle={false} />
        </div>

        {/* Active Academic Year Badge */}
        {activeAcademicYearName ? (
          <div
            className="hidden sm:flex min-h-9 items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]/70"
            data-testid="active-year-display"
          >
            <Calendar className="w-4 h-4 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))]" aria-hidden="true" />
            <span className="text-xs text-[var(--color-text-muted)] font-normal">العام:</span>
            <span className="font-semibold text-[var(--color-text-primary)] font-mono num-isolate text-sm">
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
      <div className="flex items-center gap-4">
        {/* Teacher / Assistant Identity */}
        {session && (
          <div
            className="flex items-center gap-3 pe-4 border-e border-[var(--color-border-subtle)]"
            data-testid="topbar-user-info"
          >
            <TeacherAvatar
              name={session.fullName}
              role={session.role}
              size="sm"
            />
            <div className="flex flex-col text-right leading-tight">
              <span className="text-sm font-semibold text-[var(--color-text-primary)] max-w-[150px] truncate">
                {session.fullName}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] font-normal">
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
              <LogOut className="w-4 h-4" aria-hidden="true" />
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

        {/* Custom Animated Theme Toggle Switch */}
        <button
          type="button"
          onClick={handleToggleTheme}
          dir="ltr"
          aria-label={resolvedTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          title={resolvedTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          data-testid="topbar-theme-toggle-btn"
          className={cn(
            'relative inline-flex items-center w-14 h-7 p-0.5 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] cursor-pointer select-none',
            resolvedTheme === 'dark'
              ? 'bg-slate-800/90 border border-slate-700/80 shadow-inner'
              : 'bg-amber-50/80 border border-amber-200/80 shadow-inner'
          )}
        >
          {/* Track background faint indicator icons */}
          <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-xs">
            <Sun
              className={cn(
                'w-3 h-3 text-amber-500/50 transition-opacity duration-300',
                resolvedTheme === 'dark' ? 'opacity-80' : 'opacity-0'
              )}
              aria-hidden="true"
            />
            <Moon
              className={cn(
                'w-3 h-3 text-indigo-400/50 transition-opacity duration-300',
                resolvedTheme === 'dark' ? 'opacity-0' : 'opacity-80'
              )}
              aria-hidden="true"
            />
          </div>

          {/* Smooth sliding thumb with rotating/scaling Sun and Moon */}
          <span
            className={cn(
              'relative z-10 w-6 h-6 rounded-full flex items-center justify-center shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              resolvedTheme === 'dark'
                ? 'translate-x-7 bg-slate-900 text-indigo-300 shadow-slate-950/40'
                : 'translate-x-0 bg-white text-amber-500 shadow-amber-900/10'
            )}
          >
            <Sun
              className={cn(
                'w-3.5 h-3.5 absolute transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                resolvedTheme === 'dark'
                  ? 'opacity-0 rotate-90 scale-50 pointer-events-none'
                  : 'opacity-100 rotate-0 scale-100'
              )}
              aria-hidden="true"
            />
            <Moon
              className={cn(
                'w-3.5 h-3.5 absolute transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                resolvedTheme === 'dark'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-50 pointer-events-none'
              )}
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
    </header>
  );
}
