import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, LogOut } from 'lucide-react';
import { Badge, Button, useTheme, cn } from '@tibyan/design-system';
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
      className={cn('flex items-center gap-2.5 select-none', className)}
      data-testid="dynamic-island-system"
    >
      {/* Active Academic Year Pill */}
      {activeAcademicYearName && (
        <div className="hidden lg:flex items-center gap-1.5" data-testid="active-year-display">
          <Badge variant="primary" size="sm" className="font-semibold num-isolate text-[11px] py-0.5 px-2.5 rounded-full">
            {activeAcademicYearName}
          </Badge>
        </div>
      )}

      {/* User identity & Role badge */}
      {session && (
        <div className="flex items-center gap-2 pe-2 border-e border-[var(--color-border-subtle)]" data-testid="topbar-user-info">
          <span className="text-xs font-semibold text-[var(--color-text-primary)] max-w-[120px] truncate">
            {session.fullName}
          </span>
          <Badge
            variant={session.role === 'OWNER' ? 'primary' : 'neutral'}
            size="sm"
            className="text-[10px] py-0 px-1.5 font-medium rounded-full"
          >
            {session.role === 'OWNER' ? 'المسؤول' : 'مساعد'}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)] rounded-full"
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

      {/* Animated Theme Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleTheme}
        aria-label={resolvedTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
        title={resolvedTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)] rounded-full transition-transform active:scale-95"
        data-testid="topbar-theme-toggle-btn"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="w-4 h-4 text-[var(--color-brand-accent)] transition-transform duration-300 rotate-0 hover:rotate-45" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-transform duration-300" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
