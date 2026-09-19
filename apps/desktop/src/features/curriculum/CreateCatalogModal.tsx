import { useState } from 'react';
import { Modal, Input, Select, Button } from '@tibyan/design-system';
import type { EducationSystem, GradeLevel, LanguageTrack, MathBranch } from '@tibyan/contracts';
import { useCreateCatalog } from '../../hooks/useCurriculum.js';

interface CreateCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (catalogId: string) => void;
}

export function CreateCatalogModal({ isOpen, onClose, onCreated }: CreateCatalogModalProps) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [educationSystem, setEducationSystem] = useState<EducationSystem>('GENERAL');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('SEC_1');
  const [languageTrack, setLanguageTrack] = useState<LanguageTrack>('ARABIC');
  const [mathBranch, setMathBranch] = useState<string>('NONE');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useCreateCatalog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setErrorMsg('كود المنهج مطلوب');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedCode)) {
      setErrorMsg('كود المنهج يجب أن يحتوي فقط على أحرف وأرقام وشرطات (-_)');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('عنوان المنهج مطلوب');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        code: trimmedCode,
        title: title.trim(),
        educationSystem,
        gradeLevel,
        languageTrack,
        mathBranch: mathBranch === 'NONE' ? null : (mathBranch as MathBranch),
        description: description.trim() || null,
      });
      onCreated?.(created.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء المنهج');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة منهج دراسي جديد"
      description="إنشاء فهرس منهج جديد كمسودة، يمكنك بعد ذلك إضافة الوحدات والدروس والمهارات."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5" data-testid="form-create-catalog">
        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border border-[var(--color-status-danger-border)]">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="كود المنهج (Code)"
            placeholder="مثال: SEC1-ALG-AR"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            dir="ltr"
            data-testid="input-catalog-code"
          />

          <Input
            label="عنوان المنهج (Title)"
            placeholder="مثال: جبر وحساب مثلثات 1 ث"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            data-testid="input-catalog-title"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
              نظام التعليم
            </label>
            <Select
              value={educationSystem}
              onChange={(e) => setEducationSystem(e.target.value as EducationSystem)}
              options={[
                { value: 'GENERAL', label: 'التعليم العام' },
                { value: 'EGYPTIAN_BACCALAUREATE', label: 'البكالوريا المصرية' },
              ]}
              data-testid="select-catalog-system"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
              المرحلة الدراسية
            </label>
            <Select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
              options={[
                { value: 'PREP_1', label: 'أولى إعدادي' },
                { value: 'PREP_2', label: 'تانية إعدادي' },
                { value: 'PREP_3', label: 'تالتة إعدادي' },
                { value: 'SEC_1', label: 'أولى ثانوي' },
                { value: 'SEC_2', label: 'تانية ثانوي' },
                { value: 'SEC_3', label: 'تالتة ثانوي' },
              ]}
              data-testid="select-catalog-grade"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
              المسار اللغوي
            </label>
            <Select
              value={languageTrack}
              onChange={(e) => setLanguageTrack(e.target.value as LanguageTrack)}
              options={[
                { value: 'ARABIC', label: 'عربي' },
                { value: 'LANG_ENGLISH', label: 'لغات (إنجليزي)' },
              ]}
              data-testid="select-catalog-track"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
              فرع الرياضيات (اختياري)
            </label>
            <Select
              value={mathBranch}
              onChange={(e) => setMathBranch(e.target.value)}
              options={[
                { value: 'NONE', label: 'شامل / بدون فرع' },
                { value: 'GENERAL_MATH', label: 'رياضيات عامة' },
                { value: 'ALGEBRA', label: 'جبر' },
                { value: 'GEOMETRY', label: 'هندسة' },
                { value: 'TRIGONOMETRY', label: 'حساب مثلثات' },
                { value: 'CALCULUS', label: 'تفاضل وتكامل' },
                { value: 'STATISTICS', label: 'إحصاء' },
                { value: 'APPLIED_MATH', label: 'رياضيات تطبيقية' },
              ]}
              data-testid="select-catalog-math-branch"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
            الوصف أو الملاحظات (اختياري)
          </label>
          <textarea
            className="w-full rounded-lg border border-[var(--color-border-bold)] bg-[var(--color-bg-surface)] p-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ملاحظات توضيحية حول المنهج..."
            data-testid="input-catalog-desc"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button variant="secondary" type="button" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={createMutation.isPending}
            data-testid="btn-submit-create-catalog"
          >
            إنشاء المسودة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
