import { useQuery } from '@tanstack/react-query';
import { Calendar, Moon, Sun } from 'lucide-react';
import { Badge, Button, useTheme } from '@tibyan/design-system';

export function Topbar() {
  const { theme, setTheme } = useTheme();

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

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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
            <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
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

      {/* Right section: System controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleTheme}
          aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[var(--color-brand-accent)]" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </header>
  );
}
