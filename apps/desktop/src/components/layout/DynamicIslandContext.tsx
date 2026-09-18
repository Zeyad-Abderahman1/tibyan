import { useLocation } from 'react-router-dom';
import { Calendar, Users, BookOpen, Settings } from 'lucide-react';
import { cn } from '@tibyan/design-system';

export interface DynamicIslandContextProps {
  className?: string;
}

export function DynamicIslandContext({ className }: DynamicIslandContextProps) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div
      className={cn('flex items-center gap-2 select-none text-xs transition-all duration-300', className)}
      data-testid="dynamic-island-context"
    >
      {path === '/' && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] font-medium">
          <Calendar className="w-3.5 h-3.5 text-[var(--color-brand-primary)] dark:text-[#5EEAD4]" aria-hidden="true" />
          <span>متابعة اليوم</span>
        </div>
      )}

      {path.startsWith('/students') && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] font-medium">
          <Users className="w-3.5 h-3.5 text-[var(--color-brand-teal)] dark:text-[#5EEAD4]" aria-hidden="true" />
          <span>سجل الطلاب</span>
        </div>
      )}

      {path.startsWith('/groups') && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] font-medium">
          <BookOpen className="w-3.5 h-3.5 text-[var(--color-brand-accent)] dark:text-[#E6C35C]" aria-hidden="true" />
          <span>المجموعات والحصص</span>
        </div>
      )}

      {path.startsWith('/settings') && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] font-medium">
          <Settings className="w-3.5 h-3.5 text-[var(--color-brand-primary)] dark:text-[#5EEAD4]" aria-hidden="true" />
          <span>إعدادات النظام</span>
        </div>
      )}
    </div>
  );
}
