import { Card, Badge, Button } from '@tibyan/design-system';
import type { TodayClassSlotDto } from '@tibyan/contracts';
import { Clock, Users, AlertTriangle } from 'lucide-react';

const GRADE_LABELS: Record<string, string> = {
  PREP_1: 'أولى إعدادي',
  PREP_2: 'تانية إعدادي',
  PREP_3: 'تالتة إعدادي',
  SEC_1: 'أولى ثانوي',
  SEC_2: 'تانية ثانوي',
  SEC_3: 'تالتة ثانوي',
};

const SYSTEM_LABELS: Record<string, string> = {
  GENERAL: 'عام',
  EGYPTIAN_BACCALAUREATE: 'بكالوريا',
};

const TRACK_LABELS: Record<string, string> = {
  ARABIC: 'عربي',
  LANG_ENGLISH: 'لغات',
};

export interface ClassScheduleCardProps {
  slot: TodayClassSlotDto;
}

export function ClassScheduleCard({ slot }: ClassScheduleCardProps) {
  const isCancelled = slot.status === 'CANCELLED_BY_TEACHER';
  const isRescheduled = slot.isRescheduled;

  const renderStatusBadge = () => {
    switch (slot.status) {
      case 'CANCELLED_BY_TEACHER':
        return (
          <Badge variant="danger" size="sm" data-testid={`badge-status-${slot.sessionId}`}>
            ملغاة
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="success" size="sm" data-testid={`badge-status-${slot.sessionId}`}>
            مكتملة
          </Badge>
        );
      case 'RESCHEDULED':
        return (
          <Badge variant="warning" size="sm" data-testid={`badge-status-${slot.sessionId}`}>
            مُعاد جدولتها
          </Badge>
        );
      case 'SCHEDULED':
      default:
        return (
          <Badge variant="primary" size="sm" data-testid={`badge-status-${slot.sessionId}`}>
            قادمة
          </Badge>
        );
    }
  };

  return (
    <Card
      variant="default"
      className={`p-4 transition-all ${
        isCancelled
          ? 'opacity-70 bg-[var(--color-bg-surface-subtle)] border-dashed border-[var(--color-status-danger-border)]'
          : 'hover:border-[var(--color-border-strong)]'
      }`}
      data-testid={`class-card-${slot.sessionId}`}
    >
      <div className="flex flex-col gap-3">
        {/* Top Row: Group Name & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h4
              className={`text-base font-bold text-[var(--color-text-primary)] truncate ${
                isCancelled ? 'line-through text-[var(--color-text-muted)]' : ''
              }`}
            >
              {slot.groupName}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="neutral" size="sm">
                {GRADE_LABELS[slot.gradeLevel] || slot.gradeLevel}
              </Badge>
              <Badge variant="neutral" size="sm">
                {SYSTEM_LABELS[slot.educationSystem] || slot.educationSystem}
              </Badge>
              <Badge variant="neutral" size="sm">
                {TRACK_LABELS[slot.languageTrack] || slot.languageTrack}
              </Badge>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {renderStatusBadge()}
          </div>
        </div>

        {/* Rescheduled Notice (Historical Context) */}
        {isRescheduled && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] border border-[var(--color-status-warning-border)]"
            data-testid={`rescheduled-notice-${slot.sessionId}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>الموعد الأصلي المجدول: </span>
            <span dir="ltr" className="font-semibold">
              {slot.originalScheduledDate} {slot.originalScheduledTime}
            </span>
          </div>
        )}

        {/* Details Row: Time, Duration & Enrolled Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-4">
            {/* Effective Start Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[var(--color-brand-primary)] shrink-0" />
              <span className="font-semibold text-[var(--color-text-primary)]">
                <span dir="ltr">{slot.effectiveStartTime}</span>
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                (<span dir="ltr">{slot.durationMinutes}</span> دقيقة)
              </span>
            </div>

            {/* Enrolled Count */}
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <span>
                <span dir="ltr" className="font-semibold text-[var(--color-text-primary)]">
                  {slot.enrolledCount}
                </span>{' '}
                طالب مقيد
              </span>
            </div>
          </div>

          {/* Action Button: Disabled with Phase 2 tooltip */}
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="تسجيل الحضور وإدارة الحصة ستتاح في المرحلة الثانية (Phase 2)"
            data-testid={`btn-start-session-${slot.sessionId}`}
            className="text-xs py-1 px-3"
          >
            ابدأ الحصة
          </Button>
        </div>
      </div>
    </Card>
  );
}
