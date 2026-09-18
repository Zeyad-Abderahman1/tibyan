import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Moon, Sun, LogOut } from 'lucide-react';
import { Badge, Button, useTheme } from '@tibyan/design-system';
import { useAuth } from '../../hooks/useAuth.js';
import { useUpdateTheme } from '../../hooks/useSettings.js';

export function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const updateThemeMutation = useUpdateTheme();
  const { session, logout } = useAuth();

  // Dynamically fetch authoritative system settings containing active academic year
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
    staleTime: 1000 * 30, // 30s cache
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
      className="h-14 shrink-0 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] px-6 flex items-center justify-between select-none"
      aria-label="شريط الرأس العلوي"
    >
      {/* Left section: Active Academic Year Info */}
      <div className="flex items-center gap-3">
        {activeAcademicYearName ? (
          <div className="flex items-center gap-2" data-testid="active-year-display">
            <Calendar className="w-4 h-4 text-[var(--color-brand-teal)] dark:text-[#5EEAD4]" aria-hidden="true" />
            <span className="text-xs text-[var(--color-text-secondary)] font-medium">العام الدراسي:</span>
            <Badge variant="primary" size="md" className="font-semibold num-isolate">
              {activeAcademicYearName}
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--color-status-warning)] font-medium">
            <span>لا يوجد عام دراسي نشط</span>
          </div>
        )}
      </div>

      {/* Right section: User session info & System controls */}
      <div className="flex items-center gap-3">
        {session && (
          <div className="flex items-center gap-2.5 pe-3 border-e border-[var(--color-border-subtle)]" data-testid="topbar-user-info">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                {session.fullName}
              </span>
              <Badge
                variant={session.role === 'OWNER' ? 'primary' : 'neutral'}
                size="sm"
                className="text-[10px] py-0 px-1.5 font-medium"
              >
                {session.role === 'OWNER' ? 'المعلم المسؤول' : 'مساعد'}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)]"
              data-testid="topbar-logout-btn"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </Button>

            {logoutError && (
              <span
                className="text-[11px] text-[var(--color-status-danger)] max-w-[150px] truncate"
                role="alert"
                title={logoutError}
                data-testid="logout-error-msg"
              >
                {logoutError}
              </span>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          title={resolvedTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)]"
          data-testid="topbar-theme-toggle-btn"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-[var(--color-brand-accent)]" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" aria-hidden="true" />
          )}
        </Button>
      </div>
    </header>
  );
}
