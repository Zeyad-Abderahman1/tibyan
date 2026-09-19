import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Modal,
  Input,
  Select,
  Button,
} from '@tibyan/design-system';
import type {
  StudentDto,
  EducationSystem,
  GradeLevel,
  LanguageTrack,
  CreateStudentIpcInput,
  UpdateStudentIpcInput,
} from '@tibyan/contracts';
import { EgyptianGuardianPhoneSchema } from '@tibyan/contracts';
import { useCreateStudent, useUpdateStudent } from '../../hooks/useStudents.js';

export interface StudentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStudent?: StudentDto | null;
  onSuccess?: (student: StudentDto) => void;
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

export function StudentCreateModal({
  isOpen,
  onClose,
  initialStudent,
  onSuccess,
}: StudentCreateModalProps) {
  const isEdit = Boolean(initialStudent);

  const [fullName, setFullName] = useState('');
  const [educationSystem, setEducationSystem] = useState<EducationSystem>('GENERAL');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('PREP_1');
  const [languageTrack, setLanguageTrack] = useState<LanguageTrack>('ARABIC');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [initialNote, setInitialNote] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();

  // Reset or populate fields when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialStudent) {
        setFullName(initialStudent.fullName);
        setEducationSystem(initialStudent.educationSystem);
        setGradeLevel(initialStudent.gradeLevel);
        setLanguageTrack(initialStudent.languageTrack);
        setGuardianPhone(initialStudent.guardianPhone);
      } else {
        setFullName('');
        setEducationSystem('GENERAL');
        setGradeLevel('PREP_1');
        setLanguageTrack('ARABIC');
        setGuardianPhone('');
        setInitialNote('');
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialStudent]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = 'اسم الطالب مطلوب';
    }

    const trimmedPhone = guardianPhone.trim();
    if (!trimmedPhone) {
      errs.guardianPhone = 'رقم هاتف ولي الأمر مطلوب';
    } else {
      const phoneParse = EgyptianGuardianPhoneSchema.safeParse(trimmedPhone);
      if (!phoneParse.success) {
        errs.guardianPhone = 'رقم الهاتف غير صالح. يجب أن يكون رقماً مصرياً يبدأ بـ 010 أو 011 أو 012 أو 015 (مثال: 01012345678 أو +201012345678 أو 00201012345678)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    try {
      if (isEdit && initialStudent) {
        const updatePayload: UpdateStudentIpcInput = {
          studentId: initialStudent.id,
          fullName: fullName.trim(),
          educationSystem,
          gradeLevel,
          languageTrack,
          guardianPhone: guardianPhone.trim(),
        };

        const res = await updateMutation.mutateAsync(updatePayload);
        if (res.success) {
          onSuccess?.(res.data);
          onClose();
        } else {
          setSubmitError(res.error.message || 'فشل تحديث بيانات الطالب');
        }
      } else {
        const createPayload: CreateStudentIpcInput = {
          fullName: fullName.trim(),
          educationSystem,
          gradeLevel,
          languageTrack,
          guardianPhone: guardianPhone.trim(),
          initialNote: initialNote.trim() ? initialNote.trim() : undefined,
        };

        const res = await createMutation.mutateAsync(createPayload);
        if (res.success) {
          onSuccess?.(res.data);
          onClose();
        } else {
          setSubmitError(res.error.message || 'فشل إضافة الطالب');
        }
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'حدث خطأ غير متوقع أثناء حفظ البيانات');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
      description={
        isEdit
          ? 'تحديث البيانات الأساسية والأكاديمية للطالب'
          : 'سجل بيانات الطالب والمسار الأكاديمي ومعلومات التواصل'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="student-form">
        {submitError && (
          <div
            className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-[var(--radius-md)] text-xs font-medium"
            role="alert"
            data-testid="student-form-error"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Read-only Student Code if Editing */}
        {isEdit && initialStudent && (
          <div>
            <label className="text-xs font-medium text-[var(--color-text-primary)] mb-1 block">
              كود الطالب
            </label>
            <div
              className="px-3 py-2 bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] text-sm font-mono"
              dir="ltr"
              data-testid="student-code-readonly"
            >
              {initialStudent.studentCode}
            </div>
          </div>
        )}

        {/* Full Name */}
        <Input
          label="اسم الطالب رباعي *"
          placeholder="مثال: أحمد محمد علي حسن"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          disabled={isPending}
          data-testid="student-fullname-input"
        />

        {/* Academic Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="النظام التعليمي *"
            options={EDUCATION_SYSTEM_OPTIONS}
            value={educationSystem}
            onChange={(e) => setEducationSystem(e.target.value as EducationSystem)}
            disabled={isPending}
            data-testid="student-education-system-select"
          />

          <Select
            label="المرحلة الدراسية *"
            options={GRADE_LEVEL_OPTIONS}
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
            disabled={isPending}
            data-testid="student-grade-level-select"
          />

          <Select
            label="المسار اللغوي *"
            options={LANGUAGE_TRACK_OPTIONS}
            value={languageTrack}
            onChange={(e) => setLanguageTrack(e.target.value as LanguageTrack)}
            disabled={isPending}
            data-testid="student-language-track-select"
          />
        </div>

        {/* Guardian Phone */}
        <div>
          <Input
            label="رقم هاتف ولي الأمر *"
            placeholder="01012345678"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
            error={errors.guardianPhone}
            disabled={isPending}
            dir="ltr"
            data-testid="student-guardian-phone-input"
          />
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            يجب أن يكون رقماً مصرياً صالحاً (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).
          </p>
        </div>

        {/* Initial Note (Create mode only) */}
        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="student-initial-note"
              className="text-xs font-medium text-[var(--color-text-primary)] select-none text-start"
            >
              ملاحظة أولية (اختياري)
            </label>
            <textarea
              id="student-initial-note"
              rows={2}
              placeholder="أي ملاحظات أكاديمية أو خاصة بالطالب عند التسجيل..."
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              disabled={isPending}
              className="w-full bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] text-sm rounded-[var(--radius-md)] px-3 py-2 border border-[var(--color-border-subtle)] focus-visible:outline-none focus-visible:border-[var(--color-brand-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] resize-none"
              data-testid="student-initial-note-input"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="cancel-student-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            disabled={isPending}
            data-testid="submit-student-btn"
          >
            {isEdit ? 'حفظ التعديلات' : 'إضافة الطالب'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
