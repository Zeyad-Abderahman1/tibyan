import { useState } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';
import { Modal, Input, Button } from '@tibyan/design-system';
import type { LoginUserDto, ManagedUserDto } from '@tibyan/contracts';
import { ResetUserPinSchema } from '@tibyan/contracts';
import { useResetUserPin } from '../../hooks/useUserManagement.js';

export interface AssistantPinResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUserDto | LoginUserDto | { id: string; fullName: string } | null;
  onSuccess?: () => void;
}

export function AssistantPinResetModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: AssistantPinResetModalProps) {
  const [newPin, setNewPin] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetPinMutation = useResetUserPin();

  const handleClose = () => {
    setNewPin('');
    setValidationError(null);
    setApiError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setValidationError(null);
    setApiError(null);

    const parseResult = ResetUserPinSchema.safeParse({
      userId: user.id,
      newPin: newPin.trim(),
    });

    if (!parseResult.success) {
      const msg = parseResult.error.issues[0]?.message || 'يجب أن يتكون رمز PIN من 4 أرقام عددية.';
      setValidationError(msg);
      return;
    }

    try {
      await resetPinMutation.mutateAsync(parseResult.data);
      // Security: wipe new PIN immediately
      setNewPin('');
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      setApiError(err?.message || 'تعذر إعادة تعيين رمز PIN.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`إعادة تعيين رمز PIN للمستخدم: ${user?.fullName || ''}`}
      description="أدخل الرمز الجديد المكون من 4 أرقام. سيُطلب من المستخدم استخدامه عند تسجيل الدخول القادم."
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-pin-form">
        {apiError && (
          <div
            className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
            role="alert"
            data-testid="reset-pin-api-error"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="reset-pin-input"
            className="block text-xs font-semibold text-[var(--color-text-primary)]"
          >
            رمز PIN الجديد (4 أرقام) <span className="text-[var(--color-status-danger)]">*</span>
          </label>
          <Input
            id="reset-pin-input"
            type="password"
            maxLength={4}
            value={newPin}
            onChange={(e) => {
              const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
              setNewPin(numericOnly);
              if (validationError) setValidationError(null);
            }}
            placeholder="••••"
            className="dir-ltr text-center font-mono tracking-widest text-base"
            error={validationError || undefined}
            data-testid="new-pin-input"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={resetPinMutation.isPending}
            data-testid="cancel-reset-pin-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={resetPinMutation.isPending}
            disabled={resetPinMutation.isPending || newPin.length !== 4}
            data-testid="submit-reset-pin-btn"
          >
            <KeyRound className="w-4 h-4 ml-1" aria-hidden="true" />
            <span>حفظ الرمز الجديد</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
