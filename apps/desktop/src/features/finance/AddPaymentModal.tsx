import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
} from '@tibyan/design-system';
import { useRecordPayment } from '../../hooks/useFinance.js';
import type { PaymentMethod } from '@tibyan/contracts';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    fullName: string;
    studentCode: string;
  };
  groups?: Array<{ id: string; name: string }>;
  remainingBalanceCents?: number;
  onSuccess?: () => void;
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'نقدي (كاش)' },
  { value: 'VODAFONE_CASH', label: 'فودافون كاش' },
  { value: 'INSTAPAY', label: 'إنستاباي (InstaPay)' },
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
  { value: 'OTHER', label: 'طريقة أخرى' },
];

export function AddPaymentModal({
  isOpen,
  onClose,
  student,
  groups = [],
  remainingBalanceCents = 0,
  onSuccess,
}: AddPaymentModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [amountEgp, setAmountEgp] = useState<string>(
    remainingBalanceCents > 0 ? (remainingBalanceCents / 100).toString() : ''
  );
  const [groupId, setGroupId] = useState<string>(groups[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(today);
  const [periodMonth, setPeriodMonth] = useState<string>(currentMonth);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recordPaymentMutation = useRecordPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedEgp = parseFloat(amountEgp);
    if (isNaN(parsedEgp) || parsedEgp <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }

    const amountCents = Math.round(parsedEgp * 100);

    try {
      const res = await recordPaymentMutation.mutateAsync({
        studentId: student.id,
        groupId: groupId ? groupId : undefined,
        amountCents,
        paymentMethod,
        paymentDate,
        periodMonth: periodMonth ? periodMonth : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error.message || 'فشل تسجيل الدفعة');
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل دفعة مالية"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-payment-form">
        {/* Student Info Bar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)]">
          <div>
            <div className="text-xs text-[var(--color-text-secondary)]">اسم الطالب</div>
            <div className="text-sm font-bold text-[var(--color-text-primary)]">{student.fullName}</div>
          </div>
          <div className="text-left">
            <div className="text-xs text-[var(--color-text-secondary)]">كود الطالب</div>
            <span className="font-mono text-xs font-bold text-[var(--color-brand-primary)]" dir="ltr">
              {student.studentCode}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
            المبلغ المدفوع (بالجنيه المصري) <span className="text-[var(--color-status-danger)]">*</span>
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              min="1"
              value={amountEgp}
              onChange={(e) => setAmountEgp(e.target.value)}
              placeholder="0.00"
              required
              className="text-lg font-bold font-mono pe-14"
              data-testid="payment-amount-input"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] pointer-events-none">
              ج.م
            </span>
          </div>
          {remainingBalanceCents > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] text-[var(--color-text-muted)]">المتبقي: {(remainingBalanceCents / 100).toLocaleString('ar-EG')} ج.م</span>
              <button
                type="button"
                onClick={() => setAmountEgp((remainingBalanceCents / 100).toString())}
                className="text-[11px] font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                (سداد المتبقي كاملاً)
              </button>
            </div>
          )}
        </div>

        {/* Group Selector */}
        {groups.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              المجموعة المعنية (اختياري)
            </label>
            <Select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              options={[
                { value: '', label: 'حساب الطالب العام (كافة المجموعات)' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
              data-testid="payment-group-select"
            />
          </div>
        )}

        {/* Payment Method & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              طريقة الدفع
            </label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={PAYMENT_METHODS}
              data-testid="payment-method-select"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              تاريخ التحصيل
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              data-testid="payment-date-input"
            />
          </div>
        </div>

        {/* Period Month & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              عن شهر (للاشتراكات الشهرية)
            </label>
            <Input
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              data-testid="payment-period-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              ملاحظات الإيصال (اختياري)
            </label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: دفعة مقدمة، استلام مساعد..."
              data-testid="payment-notes-input"
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger)] text-xs text-[var(--color-status-danger)]">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={recordPaymentMutation.isPending}
            data-testid="cancel-payment-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={recordPaymentMutation.isPending}
            disabled={recordPaymentMutation.isPending}
            data-testid="confirm-payment-btn"
          >
            <CheckCircle2 size={16} className="me-1.5" />
            تأكيد وتسجيل الدفعة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
