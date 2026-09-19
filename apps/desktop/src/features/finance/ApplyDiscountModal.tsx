import React, { useState, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
} from '@tibyan/design-system';
import { useApplyDiscount } from '../../hooks/useFinance.js';
import type { DiscountType } from '@tibyan/contracts';
import { Percent, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ApplyDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    fullName: string;
    studentCode: string;
  };
  groups?: Array<{ id: string; name: string }>;
  currentChargesCents?: number;
  onSuccess?: () => void;
}

export function ApplyDiscountModal({
  isOpen,
  onClose,
  student,
  groups = [],
  currentChargesCents = 0,
  onSuccess,
}: ApplyDiscountModalProps) {
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValueInput, setDiscountValueInput] = useState<string>('10');
  const [groupId, setGroupId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyDiscountMutation = useApplyDiscount();

  // Compute live discount amount in cents
  const calculatedDiscountCents = useMemo(() => {
    const val = parseFloat(discountValueInput);
    if (isNaN(val) || val <= 0) return 0;

    if (discountType === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, val));
      return Math.round((currentChargesCents * pct) / 100);
    } else {
      const fixedCents = Math.round(val * 100);
      return Math.min(fixedCents, currentChargesCents);
    }
  }, [discountType, discountValueInput, currentChargesCents]);

  const netPayableCents = Math.max(0, currentChargesCents - calculatedDiscountCents);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const val = parseFloat(discountValueInput);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('يرجى إدخال قيمة خصم صحيحة أكبر من صفر');
      return;
    }

    if (discountType === 'PERCENTAGE' && (val < 1 || val > 100)) {
      setErrorMsg('نسبة الخصم يجب أن تكون بين 1% و 100%');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('يرجى توضيح سبب منح الخصم');
      return;
    }

    const discountValue = discountType === 'PERCENTAGE' ? Math.round(val) : Math.round(val * 100);

    try {
      const res = await applyDiscountMutation.mutateAsync({
        studentId: student.id,
        groupId: groupId ? groupId : undefined,
        discountType,
        discountValue,
        reason: reason.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.error.message || 'فشل تطبيق الخصم');
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تطبيق الخصم');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تطبيق خصم للطالب"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="apply-discount-form">
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

        {/* Discount Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
            نوع الخصم
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDiscountType('PERCENTAGE');
                setDiscountValueInput('10');
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                discountType === 'PERCENTAGE'
                  ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-subtle)]'
              }`}
              data-testid="discount-type-percentage"
            >
              <Percent size={14} />
              <span>نسبة مئوية (%)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDiscountType('FIXED_AMOUNT');
                setDiscountValueInput('50');
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                discountType === 'FIXED_AMOUNT'
                  ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-surface)] text-[var(--color-brand-primary)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-subtle)]'
              }`}
              data-testid="discount-type-fixed"
            >
              <Tag size={14} />
              <span>مبلغ ثابت (ج.م)</span>
            </button>
          </div>
        </div>

        {/* Discount Value */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
            {discountType === 'PERCENTAGE' ? 'نسبة الخصم المئوية (1% إلى 100%)' : 'قيمة الخصم بالجنيه المصري'} <span className="text-[var(--color-status-danger)]">*</span>
          </label>
          <div className="relative">
            <Input
              type="number"
              step={discountType === 'PERCENTAGE' ? '1' : '0.5'}
              min="1"
              max={discountType === 'PERCENTAGE' ? '100' : undefined}
              value={discountValueInput}
              onChange={(e) => setDiscountValueInput(e.target.value)}
              required
              className="text-lg font-bold font-mono pe-14"
              data-testid="discount-value-input"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] pointer-events-none">
              {discountType === 'PERCENTAGE' ? '%' : 'ج.م'}
            </span>
          </div>
        </div>

        {/* Live Calculation Box */}
        {currentChargesCents > 0 && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
              <span>إجمالي الرسوم الأصلية:</span>
              <span className="font-mono">{(currentChargesCents / 100).toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex items-center justify-between text-[var(--color-status-success)] font-medium">
              <span>قيمة الخصم المحسوبة:</span>
              <span className="font-mono">- {(calculatedDiscountCents / 100).toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex items-center justify-between font-bold text-[var(--color-text-primary)] pt-1 border-t border-[var(--color-border-subtle)]">
              <span>المبلغ المطلوب بعد الخصم:</span>
              <span className="font-mono text-sm text-[var(--color-brand-primary)]">
                {(netPayableCents / 100).toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>
        )}

        {/* Group Selector */}
        {groups.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              تطبيق الخصم على (اختياري)
            </label>
            <Select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              options={[
                { value: '', label: 'كافة مجموعات واشتراكات الطالب' },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
              data-testid="discount-group-select"
            />
          </div>
        )}

        {/* Reason Input */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
            سبب الخصم <span className="text-[var(--color-status-danger)]">*</span>
          </label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: خصم تفوق دراسي، خصم أشقاء، ظرف خاص..."
            required
            data-testid="discount-reason-input"
          />
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
            disabled={applyDiscountMutation.isPending}
            data-testid="cancel-discount-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={applyDiscountMutation.isPending}
            disabled={applyDiscountMutation.isPending}
            data-testid="confirm-discount-btn"
          >
            <CheckCircle2 size={16} className="me-1.5" />
            تطبيق الخصم
          </Button>
        </div>
      </form>
    </Modal>
  );
}
