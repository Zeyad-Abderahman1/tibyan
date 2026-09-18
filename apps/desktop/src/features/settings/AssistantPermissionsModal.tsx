import { useState, useEffect } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { Modal, Button } from '@tibyan/design-system';
import type { PermissionCode, LoginUserDto, ManagedUserDto } from '@tibyan/contracts';
import { useUpdatePermissions } from '../../hooks/useUserManagement.js';
import { UI_PERMISSION_CATEGORIES } from './permission-catalog.js';

export interface AssistantPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUserDto | LoginUserDto | { id: string; fullName: string; permissions?: PermissionCode[] } | null;
  initialPermissions?: PermissionCode[];
}

export function AssistantPermissionsModal({
  isOpen,
  onClose,
  user,
  initialPermissions,
}: AssistantPermissionsModalProps) {
  const effectivePermissions =
    initialPermissions ??
    (user && 'permissions' in user && Array.isArray(user.permissions) ? user.permissions : []);

  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>(effectivePermissions);
  const [apiError, setApiError] = useState<string | null>(null);

  const updateMutation = useUpdatePermissions();

  useEffect(() => {
    setSelectedPermissions(effectivePermissions);
    setApiError(null);
  }, [user, initialPermissions, isOpen]);

  const handleClose = () => {
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
    if (!user) return;
    setApiError(null);

    try {
      await updateMutation.mutateAsync({
        userId: user.id,
        permissions: selectedPermissions,
      });
      handleClose();
    } catch (err: any) {
      setApiError(err?.message || 'تعذر تحديث صلاحيات المستخدم.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`تعديل صلاحيات المساعد: ${user?.fullName || ''}`}
      description="حدد الصلاحيات المصرح بها لهذا الحساب في أقسام النظام المختلفة."
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="edit-permissions-form">
        {apiError && (
          <div
            className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
            role="alert"
            data-testid="edit-permissions-api-error"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            <Shield className="w-4 h-4 text-[var(--color-brand-primary)]" aria-hidden="true" />
            <span>الصلاحيات المحددة: {selectedPermissions.length}</span>
          </div>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pl-1">
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
                        data-testid={`edit-permission-label-${item.code}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(item.code)}
                          className="mt-0.5 rounded border-[var(--color-border-default)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
                          data-testid={`edit-permission-checkbox-${item.code}`}
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

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={updateMutation.isPending}
            data-testid="cancel-edit-permissions-btn"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
            data-testid="submit-edit-permissions-btn"
          >
            حفظ التغييرات
          </Button>
        </div>
      </form>
    </Modal>
  );
}
