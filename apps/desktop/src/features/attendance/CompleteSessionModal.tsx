import React, { useState } from 'react';
import { Modal, Button } from '@tibyan/design-system';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface CompleteSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void> | void;
  isSubmitting?: boolean;
  groupName: string;
  summary: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
  };
}

export function CompleteSessionModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  groupName,
  summary,
}: CompleteSessionModalProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await onConfirm(notes.trim() || undefined);
  };

  const hasUnmarked = summary.unmarked > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنهاء الحصة واعتماد الحضور"
      size="md"
    >
      <form onSubmit={handleConfirm} className="space-y-4" dir="rtl">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            أنت على وشك اعتماد الحضور النهائي لحصة مجموعة{' '}
            <span className="font-bold text-[var(--color-text-primary)]">{groupName}</span>.
          </p>
        </div>

        {/* Summary Metric Overview */}
        <div className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-center text-xs">
          <div>
            <span className="block text-[var(--color-text-muted)]">الإجمالي</span>
            <span className="font-bold text-sm text-[var(--color-text-primary)]" dir="ltr">
              {summary.totalStudents}
            </span>
          </div>
          <div>
            <span className="block text-[var(--color-brand-primary)] dark:text-[#5CE1E6]">حاضر</span>
            <span className="font-bold text-sm text-[var(--color-brand-primary)] dark:text-[#5CE1E6]" dir="ltr">
              {summary.present}
            </span>
          </div>
          <div>
            <span className="block text-[var(--color-brand-accent)]">متأخر</span>
            <span className="font-bold text-sm text-[var(--color-brand-accent)]" dir="ltr">
              {summary.late}
            </span>
          </div>
          <div>
            <span className="block text-[var(--color-status-danger)]">غائب</span>
            <span className="font-bold text-sm text-[var(--color-status-danger)]" dir="ltr">
              {summary.absent}
            </span>
          </div>
          <div>
            <span className="block text-[var(--color-text-secondary)]">معذور</span>
            <span className="font-bold text-sm text-[var(--color-text-primary)]" dir="ltr">
              {summary.excused}
            </span>
          </div>
        </div>

        {/* Unmarked Warning Banner */}
        {hasUnmarked ? (
          <div
            className="flex items-start gap-3 p-3.5 rounded-lg bg-[var(--color-status-warning-bg)] border border-[var(--color-status-warning-border)] text-[var(--color-status-warning)] text-xs leading-relaxed"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm mb-1">
                تنبيه: يوجد <span dir="ltr">{summary.unmarked}</span> طالب لم يتم تسجيل حضورهم!
              </p>
              <p className="opacity-90">
                عند إنهاء الحصة، سيقوم النظام تلقائيًا بتسجيلهم كـ <strong>غائبين</strong> مع إشعار في سجل المراجعة الأكاديمي.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-brand-primary)]/8 text-[var(--color-brand-primary)] dark:bg-[#5CE1E6]/10 dark:text-[#5CE1E6] text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>تم تسجيل حضور جميع الطلاب المقيدين في هذه الحصة بنجاح.</span>
          </div>
        )}

        {/* Optional Session Notes */}
        <div className="space-y-1.5">
          <label
            htmlFor="session-notes-input"
            className="block text-xs font-semibold text-[var(--color-text-primary)]"
          >
            ملاحظات الحصة (اختياري)
          </label>
          <textarea
            id="session-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: تم إنهاء شرح الدرس وحل تدريبات الواجب..."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] transition-all resize-none"
            data-testid="session-completion-notes"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-complete-session-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            data-testid="confirm-complete-session-btn"
          >
            {isSubmitting ? 'جاري الإنهاء...' : 'تأكيد إنهاء الحصة'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
