import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
} from '@tibyan/design-system';
import { Clock, Calendar, AlertCircle, Info } from 'lucide-react';
import type { SessionDto } from '@tibyan/contracts';
import { useRescheduleSession } from '../../hooks/useGroups.js';

export interface RescheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionDto | null;
  groupId?: string;
}

export function RescheduleSessionModal({
  isOpen,
  onClose,
  session,
  groupId,
}: RescheduleSessionModalProps) {
  const [newEffectiveDate, setNewEffectiveDate] = useState<string>('');
  const [newEffectiveStartTime, setNewEffectiveStartTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rescheduleMutation = useRescheduleSession(groupId);

  useEffect(() => {
    if (isOpen && session) {
      setNewEffectiveDate(session.effectiveDate || session.scheduledDate);
      setNewEffectiveStartTime(session.effectiveStartTime || session.scheduledStartTime);
      setReason('');
      setErrorMessage(null);
    }
  }, [isOpen, session]);

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('يرجى ذكر سبب تعديل موعد الحصة');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newEffectiveDate)) {
      setErrorMessage('تاريخ الحصة غير صالح (YYYY-MM-DD)');
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newEffectiveStartTime)) {
      setErrorMessage('وقت البدء يجب أن يكون بتنسيق 24 ساعة (HH:mm)');
      return;
    }

    try {
      const res = await rescheduleMutation.mutateAsync({
        sessionId: session.id,
        newEffectiveDate,
        newEffectiveStartTime,
        reason: trimmedReason,
      });

      if (!res.success) {
        setErrorMessage(res.error.message || 'فشل تعديل موعد الحصة');
        return;
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تعديل موعد الحصة');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="تعديل موعد الحصة (استثناء)"
      description="تعديل موعد حصة محددة دون المساس بالجدول الأسبوعي الثابت للمجموعة."
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5" data-testid="reschedule-form">
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 text-xs text-[var(--color-status-danger)] bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger-border)] rounded-[var(--radius-md)]"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Read-Only Original Identity */}
          <div className="p-3 bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] space-y-2">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              الموعد الأصلي المجدول (ثابت)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>التاريخ الأصلي:</span>
                <span dir="ltr" className="font-semibold text-[var(--color-text-primary)]">
                  {session.scheduledDate}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>الوقت الأصلي:</span>
                <span dir="ltr" className="font-semibold text-[var(--color-text-primary)]">
                  {session.scheduledStartTime}
                </span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-[var(--color-text-muted)] truncate" dir="ltr">
              ref: {session.occurrenceKey}
            </div>
          </div>

          {/* New Effective Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="التاريخ البديل الجديد"
              type="date"
              value={newEffectiveDate}
              onChange={(e) => setNewEffectiveDate(e.target.value)}
              disabled={rescheduleMutation.isPending}
              required
              dir="ltr"
              data-testid="input-new-date"
            />
            <Input
              label="الوقت الجديد (24 ساعة)"
              type="time"
              value={newEffectiveStartTime}
              onChange={(e) => setNewEffectiveStartTime(e.target.value)}
              disabled={rescheduleMutation.isPending}
              required
              dir="ltr"
              data-testid="input-new-time"
            />
          </div>

          {/* Reschedule Reason */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-text-primary)]">
              سبب التعديل الاستثنائي
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={rescheduleMutation.isPending}
              placeholder="مثال: تقديم الموعد بسبب عطلة رسمية أو ظرف طارئ..."
              className="w-full px-3 py-2 text-xs rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none"
              required
              data-testid="textarea-reschedule-reason"
            />
          </div>

          <div className="flex items-start gap-1.5 p-2 bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] text-[11px] text-[var(--color-text-muted)]">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-brand-accent)]" />
            <span>
              هذا التعديل يغير الموعد الفعلي لهذه الحصة فقط ويظهر في لوحة "اليوم"، ولا يغير المواعيد الأسبوعية المتكررة لباقي الأسابيع.
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={rescheduleMutation.isPending}
            data-testid="btn-cancel-reschedule"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={rescheduleMutation.isPending}
            data-testid="btn-submit-reschedule"
          >
            حفظ الموعد الجديد
          </Button>
        </div>
      </form>
    </Modal>
  );
}
