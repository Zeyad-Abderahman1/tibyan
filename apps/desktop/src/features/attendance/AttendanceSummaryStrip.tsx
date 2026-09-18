import { Card } from '@tibyan/design-system';
import { Users, CheckCircle2, Clock, UserX, FileText, HelpCircle } from 'lucide-react';

export interface AttendanceSummaryStripProps {
  summary: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
  };
  className?: string;
}

export function AttendanceSummaryStrip({ summary, className }: AttendanceSummaryStripProps) {
  const cards = [
    {
      label: 'إجمالي الطلاب',
      value: summary.totalStudents,
      icon: Users,
      colorClass: 'text-[var(--color-text-primary)]',
      borderClass: 'border-[var(--color-border-subtle)]',
      testId: 'metric-total',
    },
    {
      label: 'حاضر',
      value: summary.present,
      icon: CheckCircle2,
      colorClass: 'text-[var(--color-brand-primary)] dark:text-[#5CE1E6]',
      borderClass: 'border-[var(--color-brand-primary)]/20 dark:border-[#5CE1E6]/20',
      testId: 'metric-present',
    },
    {
      label: 'متأخر',
      value: summary.late,
      icon: Clock,
      colorClass: 'text-[var(--color-brand-accent)] dark:text-[#C59B27]',
      borderClass: 'border-[var(--color-brand-accent)]/20',
      testId: 'metric-late',
    },
    {
      label: 'غائب',
      value: summary.absent,
      icon: UserX,
      colorClass: 'text-[var(--color-status-danger)]',
      borderClass: 'border-[var(--color-status-danger-border)]',
      testId: 'metric-absent',
    },
    {
      label: 'معذور',
      value: summary.excused,
      icon: FileText,
      colorClass: 'text-[#64748B] dark:text-[#94A3B8]',
      borderClass: 'border-[var(--color-border-subtle)]',
      testId: 'metric-excused',
    },
    {
      label: 'لم يُسجل',
      value: summary.unmarked,
      icon: HelpCircle,
      colorClass: summary.unmarked > 0 ? 'text-[var(--color-brand-accent)]' : 'text-[var(--color-text-muted)]',
      borderClass: summary.unmarked > 0 ? 'border-dashed border-[var(--color-brand-accent)]/40' : 'border-[var(--color-border-subtle)]',
      testId: 'metric-unmarked',
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${className || ''}`} dir="rtl">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            variant="default"
            className={`p-3.5 flex items-center gap-3 transition-all hover:border-[var(--color-border-strong)] ${card.borderClass}`}
            data-testid={card.testId}
          >
            <div className={`w-9 h-9 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center shrink-0 ${card.colorClass}`}>
              <Icon className="w-5 h-5 stroke-[2]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs text-[var(--color-text-secondary)] truncate">
                {card.label}
              </span>
              <span className={`text-lg font-bold font-mono tracking-tight ${card.colorClass}`} dir="ltr">
                {card.value}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
