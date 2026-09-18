import { useState } from 'react';
import { CalendarPlus, AlertCircle } from 'lucide-react';
import { Modal, Input, Button } from '@tibyan/design-system';
import { CreateAcademicYearSchema } from '@tibyan/contracts';
import { useCreateAcademicYear } from '../../hooks/useAcademicYears.js';

export interface CreateAcademicYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAcademicYearModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAcademicYearModalProps) {
  const [yearName, setYearName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const createMutation = useCreateAcademicYear();

  const handleClose = () => {
    setYearName('');
    setValidationError(null);
    setApiError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const parseResult = CreateAcademicYearSchema.safeParse({ name: yearName.trim() });
    if (!parseResult.success) {
      const msg = parseResult.error.issues[0]?.message || 'صيغة العام الدراسي غير صالحة.';
      setValidationError(msg);
      return;
    }

    try {
      await createMutation.mutateAsync(parseResult.data);
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      setApiError(err?.message || 'تعذر إنشاء العام الدراسي الجديد.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="إضافة عام دراسي جديد"
      description="أدخل العام الدراسي الجديد بالصيغة القياسية YYYY-YYYY مثل 2027-2028."
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="create-year-form">
        {apiError && (
          <div
            className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
            role="alert"
            data-testid="create-year-api-error"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="academic-year-name"
            className="block text-xs font-semibold text-[var(--color-text-primary)]"
          >
            اسم العام الدراسي <span className="text-[var(--color-status-danger)]">*</span>
          </label>
          <Input
            id="academic-year-name"
            value={yearName}
            onChange={(e) => {
              setYearName(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="مثال: 2027-2028"
            className="dir-ltr text-left font-mono"
            error={validationError || undefined}
            data-testid="academic-year-name-input"
            autoFocus
          />
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            يجب أن تكون السنة المنتهية مساوية لسنة البداية + 1 (مثال: 2026-2027 أو 2027-2028).
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={createMutation.isPending}
            data-testid="cancel-create-year-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={createMutation.isPending}
            disabled={createMutation.isPending || !yearName.trim()}
            data-testid="submit-create-year-btn"
          >
            <CalendarPlus className="w-4 h-4 ml-1" aria-hidden="true" />
            <span>إنشاء العام الدراسي</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
