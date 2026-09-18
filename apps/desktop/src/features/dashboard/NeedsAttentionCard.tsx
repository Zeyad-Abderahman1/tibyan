import { Card, Badge } from '@tibyan/design-system';
import type { NeedsAttentionItemDto } from '@tibyan/contracts';
import { User, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const GRADE_LABELS: Record<string, string> = {
  PREP_1: 'أولى إعدادي',
  PREP_2: 'تانية إعدادي',
  PREP_3: 'تالتة إعدادي',
  SEC_1: 'أولى ثانوي',
  SEC_2: 'تانية ثانوي',
  SEC_3: 'تالتة ثانوي',
};

export interface NeedsAttentionCardProps {
  item: NeedsAttentionItemDto;
}

export function NeedsAttentionCard({ item }: NeedsAttentionCardProps) {
  const navigate = useNavigate();
  const { session } = useAuth();

  const canReadStudents =
    session?.role === 'OWNER' || Boolean(session?.permissions?.includes('STUDENTS_READ'));

  // Format creation date safely for display
  const formattedDate = item.createdAt ? item.createdAt.split('T')[0] : '';

  return (
    <Card
      variant="default"
      className={`p-3.5 transition-all ${
        canReadStudents
          ? 'hover:border-[var(--color-brand-accent)] cursor-pointer'
          : 'cursor-default opacity-90'
      }`}
      onClick={canReadStudents ? () => navigate(`/students/${item.studentId}`) : undefined}
      title={canReadStudents ? 'عرض ملف الطالب' : 'عرض ملف الطالب يتطلب صلاحية عرض الطلاب'}
      data-testid={`attention-card-${item.studentId}`}
      data-can-navigate={canReadStudents ? 'true' : 'false'}
    >
      <div className="flex flex-col gap-2.5">
        {/* Header: Student Name, Code & Tag */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--color-brand-primary)] shrink-0" />
              <h5 className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                {item.studentName}
              </h5>
              <span
                dir="ltr"
                className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0"
              >
                ({item.studentCode})
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
              <span>{GRADE_LABELS[item.gradeLevel] || item.gradeLevel}</span>
              {item.groupName && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[var(--color-brand-primary)] font-medium truncate">
                    <Users className="w-3 h-3" />
                    {item.groupName}
                  </span>
                </>
              )}
            </div>
          </div>

          <Badge
            variant="warning"
            size="sm"
            data-testid={`badge-tag-${item.studentId}`}
            className="shrink-0"
          >
            متابعة مطلوبة
          </Badge>
        </div>

        {/* Note Text Box */}
        <div
          className="p-2.5 rounded bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] leading-relaxed italic"
          data-testid={`note-text-${item.studentId}`}
        >
          "{item.latestNote}"
        </div>

        {/* Timestamp */}
        {formattedDate && (
          <div className="flex items-center justify-end gap-1 text-[10px] text-[var(--color-text-muted)]">
            <Calendar className="w-3 h-3" />
            <span dir="ltr">{formattedDate}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
