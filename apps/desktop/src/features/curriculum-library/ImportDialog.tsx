import { useState } from 'react';
import { Button, Input, Select } from '@tibyan/design-system';

const GRADE_LEVELS = [
  { value: 'PRIMARY_1', label: 'الصف الأول الابتدائي' },
  { value: 'PRIMARY_2', label: 'الصف الثاني الابتدائي' },
  { value: 'PRIMARY_3', label: 'الصف الثالث الابتدائي' },
  { value: 'PRIMARY_4', label: 'الصف الرابع الابتدائي' },
  { value: 'PRIMARY_5', label: 'الصف الخامس الابتدائي' },
  { value: 'PRIMARY_6', label: 'الصف السادس الابتدائي' },
  { value: 'PREP_1', label: 'الصف الأول الإعدادي' },
  { value: 'PREP_2', label: 'الصف الثاني الإعدادي' },
  { value: 'PREP_3', label: 'الصف الثالث الإعدادي' },
  { value: 'SEC_1', label: 'الصف الأول الثانوي' },
  { value: 'SEC_2', label: 'الصف الثاني الثانوي' },
  { value: 'SEC_3', label: 'الصف الثالث الثانوي' },
];

const EDUCATION_SYSTEMS = [
  { value: 'EGYPTIAN', label: 'المنهج المصري' },
  { value: 'SAUDI', label: 'المنهج السعودي' },
  { value: 'IB', label: 'البرنامج الدولي' },
  { value: 'AMERICAN', label: 'المنهج الأمريكي' },
  { value: 'BRITISH', label: 'المنهج البريطاني' },
];

const SUBJECTS = [
  { value: 'رياضيات', label: 'رياضيات' },
  { value: 'علوم', label: 'علوم' },
  { value: 'لغة عربية', label: 'لغة عربية' },
  { value: 'لغة إنجليزية', label: 'لغة إنجليزية' },
  { value: 'اجتماعيات', label: 'اجتماعيات' },
  { value: 'تاريخ', label: 'تاريخ' },
  { value: 'جغرافيا', label: 'جغرافيا' },
  { value: 'فيزياء', label: 'فيزياء' },
  { value: 'كيمياء', label: 'كيمياء' },
  { value: 'أحياء', label: 'أحياء' },
];

interface ImportDialogProps {
  fileName: string;
  onConfirm: (metadata: {
    title: string;
    gradeLevel: string;
    educationSystem: string;
    subject: string;
    description: string;
  }) => void;
  onCancel: () => void;
}

export function ImportDialog({ fileName, onConfirm, onCancel }: ImportDialogProps) {
  const [title, setTitle] = useState(fileName.replace(/\.pdf$/i, ''));
  const [gradeLevel, setGradeLevel] = useState('');
  const [educationSystem, setEducationSystem] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const canConfirm = title.trim().length > 0 && gradeLevel && subject;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="bg-[var(--color-bg-surface)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">استيراد ملف المنهج</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            حدد بيانات المنهج قبل الحفظ في المكتبة
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">عنوان المنهج *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: رياضيات الصف الأول الإعدادي"
              data-testid="import-dialog-title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">المرحلة الدراسية *</label>
            <Select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              options={[{ value: '', label: 'اختر المرحلة...' }, ...GRADE_LEVELS]}
              data-testid="import-dialog-grade"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">النظام التعليمي</label>
              <Select
                value={educationSystem}
                onChange={(e) => setEducationSystem(e.target.value)}
                options={[{ value: '', label: 'اختر النظام...' }, ...EDUCATION_SYSTEMS]}
                data-testid="import-dialog-system"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">المادة *</label>
              <Select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                options={[{ value: '', label: 'اختر المادة...' }, ...SUBJECTS]}
                data-testid="import-dialog-subject"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">وصف (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للمنهج..."
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
              rows={2}
              data-testid="import-dialog-description"
            />
          </div>

          <div className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-elevated)] rounded-lg p-2">
            الملف: {fileName}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} data-testid="import-dialog-cancel">
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm({ title: title.trim(), gradeLevel, educationSystem, subject, description })}
            disabled={!canConfirm}
            data-testid="import-dialog-confirm"
          >
            استيراد وحفظ
          </Button>
        </div>
      </div>
    </div>
  );
}
