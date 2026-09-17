import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
} from '@tibyan/design-system';
import { AlertCircle, Info } from 'lucide-react';
import type { GroupDto, PaymentType } from '@tibyan/contracts';
import { useStudentsList } from '../../hooks/useStudents.js';
import { useGroupEnrollments, useEnrollStudent } from '../../hooks/useGroups.js';

export interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupDto;
}

const PAYMENT_TYPE_OPTIONS = [
  { value: 'MONTHLY', label: 'اشتراك شهري' },
  { value: 'PER_SESSION', label: 'دفع بالحصة' },
];

export function EnrollmentModal({ isOpen, onClose, group }: EnrollmentModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [hasCustomPayment, setHasCustomPayment] = useState<boolean>(false);
  const [paymentTypeOverride, setPaymentTypeOverride] = useState<PaymentType>(group.defaultPaymentType);
  const [paymentAmountOverride, setPaymentAmountOverride] = useState<string>(
    String(group.defaultPaymentAmount)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: allStudents = [], isLoading: isStudentsLoading } = useStudentsList({
    status: 'ACTIVE',
  });
  const { data: existingEnrollments = [] } = useGroupEnrollments(group.id);
  const enrollMutation = useEnrollStudent();

  // Determine actively enrolled student IDs to prevent duplicate active enrollment
  const activeEnrolledStudentIds = new Set(
    existingEnrollments.filter((e) => e.status === 'ACTIVE').map((e) => e.studentId)
  );

  // Categorize students by compatibility with group dimensions
  const compatibleStudents = allStudents.filter((student) => {
    return (
      student.status === 'ACTIVE' &&
      student.educationSystem === group.educationSystem &&
      student.gradeLevel === group.gradeLevel &&
      student.languageTrack === group.languageTrack
    );
  });

  const availableCandidates = compatibleStudents.filter(
    (student) => !activeEnrolledStudentIds.has(student.id)
  );

  const studentOptions = [
    { value: '', label: isStudentsLoading ? 'جاري تحميل الطلاب...' : 'اختر الطالب...' },
    ...availableCandidates.map((s) => ({
      value: s.id,
      label: `${s.fullName} (${s.studentCode})`,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedStudentId) {
      setErrorMessage('يرجى اختيار الطالب المراد تسجيله');
      return;
    }

    let overrideType: PaymentType | null = null;
    let overrideAmount: number | null = null;

    if (hasCustomPayment) {
      overrideType = paymentTypeOverride;
      const parsedAmount = Number(paymentAmountOverride);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        setErrorMessage('قيمة المصروفات المخصصة يجب أن تكون رقم غير سالب');
        return;
      }
      overrideAmount = parsedAmount;
    }

    try {
      const res = await enrollMutation.mutateAsync({
        groupId: group.id,
        studentId: selectedStudentId,
        paymentTypeOverride: overrideType,
        paymentAmountOverride: overrideAmount,
      });

      if (!res.success) {
        setErrorMessage(res.error.message || 'فشل تسجيل الطالب في المجموعة');
        return;
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تسجيل الطالب');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="تسجيل طالب في المجموعة"
      description={`تسجيل طالب في ${group.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5" data-testid="enrollment-form">
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
          {/* Target Group Info Summary */}
          <div className="p-3 bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                المجموعة المستهدفة:
              </span>
              <span className="text-xs font-medium text-[var(--color-brand-primary)]">
                {group.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>المصروفات الافتراضية:</span>
              <span dir="ltr" className="font-bold">
                {group.defaultPaymentAmount} ج.م ({group.defaultPaymentType === 'MONTHLY' ? 'شهرياً' : 'بالحصة'})
              </span>
            </div>
          </div>

          {/* Student Picker */}
          <div className="space-y-1">
            <Select
              label="اختر الطالب المتوافق مع المرحلة والمسار"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              options={studentOptions}
              disabled={enrollMutation.isPending || isStudentsLoading}
              required
              data-testid="select-student"
            />
            {availableCandidates.length === 0 && !isStudentsLoading && (
              <p className="text-[11px] text-[var(--color-status-warning)]">
                لا يوجد طلاب نشطين متوافقين مع مرحلة ونظام هذه المجموعة غير مسجلين بالفعل.
              </p>
            )}
          </div>

          {/* Payment Terms Override */}
          <div className="p-3 border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasCustomPayment}
                onChange={(e) => setHasCustomPayment(e.target.checked)}
                disabled={enrollMutation.isPending}
                className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-accent)]"
                data-testid="checkbox-custom-payment"
              />
              <span className="text-xs font-bold text-[var(--color-text-primary)]">
                تحديد سعر خاص لهذا الطالب (استثناء)
              </span>
            </label>

            {hasCustomPayment ? (
              <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="نوع الاشتراك المخصص"
                    value={paymentTypeOverride}
                    onChange={(e) => setPaymentTypeOverride(e.target.value as PaymentType)}
                    options={PAYMENT_TYPE_OPTIONS}
                    disabled={enrollMutation.isPending}
                    data-testid="select-override-payment-type"
                  />
                  <Input
                    label="المبلغ المخصص (ج.م)"
                    type="number"
                    min="0"
                    step="5"
                    value={paymentAmountOverride}
                    onChange={(e) => setPaymentAmountOverride(e.target.value)}
                    disabled={enrollMutation.isPending}
                    dir="ltr"
                    required
                    data-testid="input-override-payment-amount"
                  />
                </div>
                <div className="flex items-start gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-brand-accent)]" />
                  <span>
                    هذا السعر خاص بقيد الطالب في هذه المجموعة فقط، ولا يؤثر على أي مجموعات أخرى هو مسجل بها أو بياناته الشخصية.
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--color-text-muted)]">
                سيتم توريث المصروفات الافتراضية للمجموعة تلقائياً ({group.defaultPaymentAmount} ج.م).
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={enrollMutation.isPending}
            data-testid="btn-cancel-enroll"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={enrollMutation.isPending}
            disabled={!selectedStudentId || enrollMutation.isPending}
            data-testid="btn-submit-enroll"
          >
            تسجيل الطالب
          </Button>
        </div>
      </form>
    </Modal>
  );
}
