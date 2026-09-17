import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Select,
} from '@tibyan/design-system';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type {
  GroupDto,
  EducationSystem,
  GradeLevel,
  LanguageTrack,
  MathBranch,
  PaymentType,
  Weekday,
  WeeklyScheduleSlotInput,
} from '@tibyan/contracts';
import { useCreateGroup, useUpdateGroup, useSetGroupSchedule } from '../../hooks/useGroups.js';

export interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: GroupDto | null;
}

const EDUCATION_SYSTEM_OPTIONS = [
  { value: 'GENERAL', label: 'التعليم العام' },
  { value: 'EGYPTIAN_BACCALAUREATE', label: 'البكالوريا المصرية' },
];

const GRADE_LEVEL_OPTIONS = [
  { value: 'PREP_1', label: 'الصف الأول الإعدادي' },
  { value: 'PREP_2', label: 'الصف الثاني الإعدادي' },
  { value: 'PREP_3', label: 'الصف الثالث الإعدادي' },
  { value: 'SEC_1', label: 'الصف الأول الثانوي' },
  { value: 'SEC_2', label: 'الصف الثاني الثانوي' },
  { value: 'SEC_3', label: 'الصف الثالث الثانوي' },
];

const LANGUAGE_TRACK_OPTIONS = [
  { value: 'ARABIC', label: 'عربي' },
  { value: 'LANG_ENGLISH', label: 'لغات (إنجليزي)' },
];

const MATH_BRANCH_OPTIONS = [
  { value: '', label: 'بدون تحديد (شامل)' },
  { value: 'ALGEBRA', label: 'جبر' },
  { value: 'GEOMETRY', label: 'هندسة' },
  { value: 'CALCULUS', label: 'تفاضل وتكامل' },
  { value: 'STATISTICS', label: 'إحصاء' },
  { value: 'APPLIED_MATH', label: 'رياضيات تطبيقية' },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: 'MONTHLY', label: 'اشتراك شهري' },
  { value: 'PER_SESSION', label: 'دفع بالحصة' },
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'الأحد' },
  { value: '1', label: 'الاثنين' },
  { value: '2', label: 'الثلاثاء' },
  { value: '3', label: 'الأربعاء' },
  { value: '4', label: 'الخميس' },
  { value: '5', label: 'الجمعة' },
  { value: '6', label: 'السبت' },
];

export function GroupCreateModal({ isOpen, onClose, groupToEdit }: GroupCreateModalProps) {
  const isEditMode = Boolean(groupToEdit);

  const [name, setName] = useState(groupToEdit?.name ?? '');
  const [educationSystem, setEducationSystem] = useState<EducationSystem>(groupToEdit?.educationSystem ?? 'GENERAL');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(groupToEdit?.gradeLevel ?? 'SEC_1');
  const [languageTrack, setLanguageTrack] = useState<LanguageTrack>(groupToEdit?.languageTrack ?? 'ARABIC');
  const [focusMathBranch, setFocusMathBranch] = useState<string>(groupToEdit?.focusMathBranch ?? '');
  const [defaultPaymentType, setDefaultPaymentType] = useState<PaymentType>(groupToEdit?.defaultPaymentType ?? 'MONTHLY');
  const [defaultPaymentAmount, setDefaultPaymentAmount] = useState<string>(
    groupToEdit ? String(groupToEdit.defaultPaymentAmount) : '250'
  );
  const [schedules, setSchedules] = useState<WeeklyScheduleSlotInput[]>(
    groupToEdit
      ? groupToEdit.schedules.map((s) => ({
          id: s.id,
          weekday: s.weekday,
          startTime: s.startTime,
          durationMinutes: s.durationMinutes,
        }))
      : [{ weekday: 0, startTime: '16:00', durationMinutes: 120 }]
  );

  const [formError, setFormError] = useState<string | null>(null);

  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const setScheduleMutation = useSetGroupSchedule();

  useEffect(() => {
    if (isOpen) {
      if (groupToEdit) {
        setName(groupToEdit.name);
        setEducationSystem(groupToEdit.educationSystem);
        setGradeLevel(groupToEdit.gradeLevel);
        setLanguageTrack(groupToEdit.languageTrack);
        setFocusMathBranch(groupToEdit.focusMathBranch ?? '');
        setDefaultPaymentType(groupToEdit.defaultPaymentType);
        setDefaultPaymentAmount(String(groupToEdit.defaultPaymentAmount));
        setSchedules(
          groupToEdit.schedules.map((s) => ({
            id: s.id,
            weekday: s.weekday,
            startTime: s.startTime,
            durationMinutes: s.durationMinutes,
          }))
        );
      } else {
        setName('');
        setEducationSystem('GENERAL');
        setGradeLevel('SEC_1');
        setLanguageTrack('ARABIC');
        setFocusMathBranch('');
        setDefaultPaymentType('MONTHLY');
        setDefaultPaymentAmount('250');
        setSchedules([
          { weekday: 0, startTime: '16:00', durationMinutes: 120 },
        ]);
      }
      setFormError(null);
    }
  }, [isOpen, groupToEdit]);

  const handleAddSlot = () => {
    setSchedules((prev) => [
      ...prev,
      { weekday: 2, startTime: '18:00', durationMinutes: 120 },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: keyof WeeklyScheduleSlotInput, value: any) => {
    setSchedules((prev) => {
      const copy = [...prev];
      const target = { ...copy[index]! };
      if (field === 'weekday') {
        target.weekday = Number(value) as Weekday;
      } else if (field === 'startTime') {
        target.startTime = value;
      } else if (field === 'durationMinutes') {
        target.durationMinutes = Number(value) || 120;
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('اسم المجموعة مطلوب');
      return;
    }

    const amountNum = Number(defaultPaymentAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setFormError('قيمة المصروفات الافتراضية يجب أن تكون رقم غير سالب');
      return;
    }

    // Validate schedule slots
    const seenSlots = new Set<string>();
    for (const slot of schedules) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime)) {
        setFormError('صيغة وقت البدء يجب أن تكون بتنسيق 24 ساعة (HH:mm)');
        return;
      }
      const slotKey = `${slot.weekday}_${slot.startTime}`;
      if (seenSlots.has(slotKey)) {
        setFormError(`يوجد تكرار في موعد يوم ${WEEKDAY_LABELS[slot.weekday]} الساعة ${slot.startTime}`);
        return;
      }
      seenSlots.add(slotKey);
    }

    const normalizedSchedules = schedules.map((s) => ({
      id: s.id,
      weekday: s.weekday,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes ?? 120,
    }));

    try {
      if (isEditMode && groupToEdit) {
        const updateRes = await updateGroupMutation.mutateAsync({
          groupId: groupToEdit.id,
          name: trimmedName,
          educationSystem,
          gradeLevel,
          languageTrack,
          focusMathBranch: (focusMathBranch as MathBranch) || null,
          defaultPaymentType,
          defaultPaymentAmount: amountNum,
        });

        if (!updateRes.success) {
          setFormError(updateRes.error.message || 'فشل تحديث بيانات المجموعة');
          return;
        }

        const scheduleRes = await setScheduleMutation.mutateAsync({
          groupId: groupToEdit.id,
          slots: normalizedSchedules,
        });

        if (!scheduleRes.success) {
          setFormError(
            `تم حفظ بيانات المجموعة بنجاح، ولكن فشل تحديث جدول المواعيد: ${scheduleRes.error.message || 'خطأ في حفظ المواعيد'}`
          );
          return;
        }

        onClose();
      } else {
        const res = await createGroupMutation.mutateAsync({
          name: trimmedName,
          educationSystem,
          gradeLevel,
          languageTrack,
          focusMathBranch: (focusMathBranch as MathBranch) || null,
          defaultPaymentType,
          defaultPaymentAmount: amountNum,
          schedules: normalizedSchedules,
        });

        if (!res.success) {
          setFormError(res.error.message || 'فشل إنشاء المجموعة');
          return;
        }

        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء حفظ المجموعة');
    }
  };

  const isPending =
    createGroupMutation.isPending ||
    updateGroupMutation.isPending ||
    setScheduleMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditMode ? 'تعديل بيانات المجموعة ومواعيدها' : 'إنشاء مجموعة دراسية جديدة'}
      description="حدد المرحلة الدراسية، نظام التعليم، المصروفات الافتراضية، ومواعيد الحصص الأسبوعية."
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5" data-testid="group-form">
        {formError && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 text-xs text-[var(--color-status-danger)] bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger-border)] rounded-[var(--radius-md)]"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
          {/* Group Name */}
          <Input
            label="اسم المجموعة"
            placeholder="مثال: مجموعة المتفوقين - أولى ثانوي"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            required
            data-testid="input-group-name"
          />

          {/* Academic Dimensions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="نظام التعليم"
              value={educationSystem}
              onChange={(e) => setEducationSystem(e.target.value as EducationSystem)}
              options={EDUCATION_SYSTEM_OPTIONS}
              disabled={isPending}
              data-testid="select-education-system"
            />
            <Select
              label="المرحلة الدراسية"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
              options={GRADE_LEVEL_OPTIONS}
              disabled={isPending}
              data-testid="select-grade-level"
            />
            <Select
              label="المسار اللغوي"
              value={languageTrack}
              onChange={(e) => setLanguageTrack(e.target.value as LanguageTrack)}
              options={LANGUAGE_TRACK_OPTIONS}
              disabled={isPending}
              data-testid="select-language-track"
            />
          </div>

          {/* Optional Math Branch */}
          <Select
            label="فرع الرياضيات المتخصص (اختياري)"
            value={focusMathBranch}
            onChange={(e) => setFocusMathBranch(e.target.value)}
            options={MATH_BRANCH_OPTIONS}
            disabled={isPending}
            helperText="اختياري لمجموعات الفروع المتخصصة في الثانوية العامة"
            data-testid="select-math-branch"
          />

          {/* Payment Terms Defaults */}
          <div className="p-3 border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] bg-[var(--color-bg-surface-subtle)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
              المصروفات الافتراضية للمجموعة
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="نوع الاشتراك الافتراضي"
                value={defaultPaymentType}
                onChange={(e) => setDefaultPaymentType(e.target.value as PaymentType)}
                options={PAYMENT_TYPE_OPTIONS}
                disabled={isPending}
                data-testid="select-default-payment-type"
              />
              <Input
                label="القيمة الافتراضية (ج.م)"
                type="number"
                min="0"
                step="5"
                value={defaultPaymentAmount}
                onChange={(e) => setDefaultPaymentAmount(e.target.value)}
                disabled={isPending}
                required
                dir="ltr"
                data-testid="input-default-payment-amount"
              />
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              المصروفات المحددة هنا تطبق كقيمة افتراضية لجميع الطلاب المسجلين، مع إمكانية استثناء أي طالب بمصروفات خاصة عند تسجيله.
            </p>
          </div>

          {/* Recurring Weekly Schedules */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                  المواعيد الأسبوعية المتكررة
                </h4>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  تستخدم هذه المواعيد لتوليد الحصص الدورية تلقائياً للأربعة أسابيع القادمة.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddSlot}
                disabled={isPending}
                className="gap-1 text-xs"
                data-testid="btn-add-schedule-slot"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موعد</span>
              </Button>
            </div>

            {schedules.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] py-2 text-center border border-dashed border-[var(--color-border-subtle)] rounded-[var(--radius-md)]">
                لم يتم تحديد مواعيد أسبوعية بعد. يمكنك إضافة المواعيد الآن أو لاحقاً.
              </p>
            ) : (
              <div className="space-y-2">
                {schedules.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] bg-[var(--color-bg-surface)]"
                    data-testid={`schedule-slot-${index}`}
                  >
                    <div className="w-32">
                      <Select
                        aria-label={`يوم الموعد ${index + 1}`}
                        value={String(slot.weekday)}
                        onChange={(e) => handleSlotChange(index, 'weekday', e.target.value)}
                        options={WEEKDAY_OPTIONS}
                        disabled={isPending}
                        data-testid={`slot-weekday-${index}`}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        aria-label={`وقت بدء الموعد ${index + 1}`}
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                        disabled={isPending}
                        dir="ltr"
                        required
                        data-testid={`slot-time-${index}`}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        aria-label={`مدة الموعد ${index + 1} بالدقائق`}
                        type="number"
                        min="15"
                        step="15"
                        value={String(slot.durationMinutes ?? 120)}
                        onChange={(e) => handleSlotChange(index, 'durationMinutes', e.target.value)}
                        disabled={isPending}
                        dir="ltr"
                        placeholder="120"
                        title="المدة بالدقائق"
                        data-testid={`slot-duration-${index}`}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSlot(index)}
                      disabled={isPending}
                      className="text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)] p-2"
                      title="حذف الموعد"
                      data-testid={`btn-remove-slot-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            data-testid="btn-cancel-group"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            data-testid="btn-submit-group"
          >
            {isEditMode ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
