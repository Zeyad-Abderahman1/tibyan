import { useState } from 'react';
import { UserPlus, AlertCircle, Shield } from 'lucide-react';
import { Modal, Input, Button } from '@tibyan/design-system';
import type { PermissionCode, UserDto } from '@tibyan/contracts';
import { CreateUserSchema } from '@tibyan/contracts';
import { useCreateAssistant } from '../../hooks/useUserManagement.js';
import { UI_PERMISSION_CATEGORIES } from './permission-catalog.js';

export interface AssistantCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserDto) => void;
}

export function AssistantCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: AssistantCreateModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>([]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const createMutation = useCreateAssistant();

  const handleClose = () => {
    setFullName('');
    setUsername('');
    setPin('');
    setSelectedPermissions([]);
    setValidationError(null);
    setApiError(null);
    onClose();
  };

  const togglePermission = (code: PermissionCode) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleSelectAllCategory = (codes: PermissionCode[]) => {
    const allSelected = codes.every((c) => selectedPermissions.includes(c));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    const payload = {
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      pin: pin.trim(),
      role: 'ASSISTANT' as const,
      permissions: selectedPermissions,
    };

    const parseResult = CreateUserSchema.safeParse(payload);
    if (!parseResult.success) {
      const msg = parseResult.error.issues[0]?.message || 'بيانات الحساب غير صالحة.';
      setValidationError(msg);
      return;
    }

    try {
      const result = await createMutation.mutateAsync(parseResult.data);
      // Security: Wipe PIN state immediately after IPC submission
      setPin('');
      handleClose();
      if (result.success) {
        onSuccess?.(result.data);
      }
    } catch (err: any) {
      setApiError(err?.message || 'تعذر إضافة المساعد الجديد.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="إضافة حساب مساعد جديد"
      description="أنشئ حساباً لمساعد المعلم مع تعيين رمز PIN من 4 أرقام وتحديد الصلاحيات الممنوحة له."
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" data-testid="create-assistant-form">
        {apiError && (
          <div
            className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
            role="alert"
            data-testid="create-assistant-api-error"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        {validationError && (
          <div
            className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
            role="alert"
            data-testid="create-assistant-validation-error"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="assistant-fullname"
              className="block text-xs font-semibold text-[var(--color-text-primary)]"
            >
              الاسم بالكامل <span className="text-[var(--color-status-danger)]">*</span>
            </label>
            <Input
              id="assistant-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد محمود"
              data-testid="assistant-fullname-input"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="assistant-username"
              className="block text-xs font-semibold text-[var(--color-text-primary)]"
            >
              اسم المستخدم <span className="text-[var(--color-status-danger)]">*</span>
            </label>
            <Input
              id="assistant-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="مثال: ahmed"
              className="dir-ltr text-left font-mono"
              data-testid="assistant-username-input"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="assistant-pin"
              className="block text-xs font-semibold text-[var(--color-text-primary)]"
            >
              رمز PIN (4 أرقام) <span className="text-[var(--color-status-danger)]">*</span>
            </label>
            <Input
              id="assistant-pin"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(numericOnly);
              }}
              placeholder="••••"
              className="dir-ltr text-center font-mono tracking-widest text-base"
              data-testid="assistant-pin-input"
              required
            />
          </div>
        </div>

        {/* Permissions Grouping by Category */}
        <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[var(--color-brand-primary)]" aria-hidden="true" />
              <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                تحديد الصلاحيات الممنوحة
              </h3>
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              تم تحديد {selectedPermissions.length} صلاحيات
            </span>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pl-1">
            {UI_PERMISSION_CATEGORIES.map((cat) => {
              const catCodes = cat.items.map((i) => i.code);
              const allCatSelected = catCodes.every((c) => selectedPermissions.includes(c));

              return (
                <div
                  key={cat.category}
                  className="p-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[var(--color-border-subtle)]">
                    <span className="text-xs font-bold text-[var(--color-brand-primary)]">
                      {cat.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllCategory(catCodes)}
                      className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline"
                    >
                      {allCatSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.items.map((item) => {
                      const isChecked = selectedPermissions.includes(item.code);
                      return (
                        <label
                          key={item.code}
                          className="flex items-start gap-2 p-2 rounded hover:bg-[var(--color-bg-app)] cursor-pointer select-none text-xs"
                          data-testid={`permission-checkbox-label-${item.code}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(item.code)}
                            className="mt-0.5 rounded border-[var(--color-border-default)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
                            data-testid={`permission-checkbox-${item.code}`}
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--color-text-primary)]">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
                              {item.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={createMutation.isPending}
            data-testid="cancel-create-assistant-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={createMutation.isPending}
            disabled={createMutation.isPending || !fullName.trim() || !username.trim() || pin.length !== 4}
            data-testid="submit-create-assistant-btn"
          >
            <UserPlus className="w-4 h-4 ml-1" aria-hidden="true" />
            <span>إنشاء الحساب</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
