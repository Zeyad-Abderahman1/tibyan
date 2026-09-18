import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@tibyan/design-system';
import { Clock } from 'lucide-react';
import { TIME_HHMM_REGEX } from '@tibyan/contracts';

export interface LateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (arrivalTime: string) => void;
  studentName: string;
  initialTime?: string | null;
}

export function LateTimeModal({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  initialTime,
}: LateTimeModalProps) {
  const getDefaultTime = () => {
    if (initialTime && TIME_HHMM_REGEX.test(initialTime)) {
      return initialTime;
    }
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [time, setTime] = useState<string>(getDefaultTime());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTime(getDefaultTime());
      setError(null);
    }
  }, [isOpen, initialTime]);

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = time.trim();
    if (!TIME_HHMM_REGEX.test(trimmed)) {
      setError('يرجى إدخال وقت صحيح بصيغة 24 ساعة (مثال: 16:30)');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل تأخر الطالب"
      size="sm"
    >
      <form onSubmit={handleConfirm} className="space-y-4" dir="rtl">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            تحديد وقت حضور الطالب:{' '}
            <span className="font-bold text-[var(--color-text-primary)]">{studentName}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="arrival-time-input"
            className="block text-xs font-semibold text-[var(--color-text-primary)]"
          >
            وقت الحضور (صيغة 24 ساعة)
          </label>
          <div className="relative">
            <Input
              id="arrival-time-input"
              type="text"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                if (error) setError(null);
              }}
              placeholder="16:30"
              className="text-left font-mono tracking-wider"
              dir="ltr"
              autoFocus
              data-testid="late-arrival-time-input"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {error && (
            <p className="text-xs text-[var(--color-status-danger)]" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            data-testid="cancel-late-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            data-testid="confirm-late-btn"
          >
            تأكيد وقت الحضور
          </Button>
        </div>
      </form>
    </Modal>
  );
}
