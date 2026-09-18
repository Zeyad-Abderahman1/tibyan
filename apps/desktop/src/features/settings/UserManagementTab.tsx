import { useState } from 'react';
import {
  UserPlus,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
} from '@tibyan/design-system';
import type { ManagedUserDto } from '@tibyan/contracts';
import { useManagementUsersList, useChangeUserStatus } from '../../hooks/useUserManagement.js';
import { useAuth } from '../../hooks/useAuth.js';
import { AssistantCreateModal } from './AssistantCreateModal.js';
import { AssistantPermissionsModal } from './AssistantPermissionsModal.js';
import { AssistantPinResetModal } from './AssistantPinResetModal.js';

export function UserManagementTab() {
  const { session } = useAuth();
  const canManageUsers =
    session?.role === 'OWNER' || session?.permissions?.includes('USERS_MANAGE');

  const { data: users = [], isLoading, isError, refetch } = useManagementUsersList(canManageUsers);
  const changeStatusMutation = useChangeUserStatus();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<ManagedUserDto | null>(null);
  const [selectedUserForPin, setSelectedUserForPin] = useState<ManagedUserDto | null>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<ManagedUserDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleConfirmToggleStatus = async () => {
    if (!userToToggleStatus) return;
    setActionError(null);

    const nextStatus = userToToggleStatus.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await changeStatusMutation.mutateAsync({
        userId: userToToggleStatus.id,
        status: nextStatus,
      });
      setUserToToggleStatus(null);
    } catch (err: any) {
      setActionError(err?.message || 'تعذر تغيير حالة الحساب.');
    }
  };

  if (!canManageUsers) {
    return (
      <div className="p-6 text-center space-y-3" data-testid="user-management-restricted">
        <div className="w-10 h-10 rounded-full bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] flex items-center justify-center mx-auto">
          <Shield className="w-5 h-5" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          غير مصرح بالوصول إلى إدارة الحسابات
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
          يتطلب تعديل حسابات المساعدين وصلاحياتهم صلاحية "إدارة حسابات المساعدين" (USERS_MANAGE) أو حساب المعلم المسؤول.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-management-tab">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            إدارة حسابات المعلم والمساعدين
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            إدارة الحسابات المصرح لها باستخدام النظام وتعيين صلاحيات كل مساعد بدقة.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="open-create-assistant-btn"
        >
          <UserPlus className="w-4 h-4 ml-1.5" aria-hidden="true" />
          <span>إضافة مساعد</span>
        </Button>
      </div>

      {actionError && (
        <div
          className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
          role="alert"
          data-testid="user-action-error"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <Card variant="default" className="p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[var(--color-brand-primary)] animate-spin" />
            <span className="text-xs text-[var(--color-text-secondary)]">
              جاري تحميل قائمة المستخدمين...
            </span>
          </div>
        </Card>
      ) : isError ? (
        <Card variant="default" className="p-8 text-center text-[var(--color-status-danger)]">
          <p className="text-xs">تعذر جلب قائمة المستخدمين.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3">
            إعادة المحاولة
          </Button>
        </Card>
      ) : (
        <Card variant="default" className="overflow-hidden">
          <Table data-testid="users-table">
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>نوع الحساب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isOwner = u.role === 'OWNER';
                const isActive = u.status === 'ACTIVE';

                return (
                  <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
                        <span className="font-bold text-sm text-[var(--color-text-primary)]">
                          {u.fullName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono dir-ltr text-[var(--color-text-secondary)]">
                        @{u.username}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isOwner ? 'primary' : 'neutral'}
                        size="sm"
                        data-testid={`user-role-badge-${u.id}`}
                      >
                        {isOwner ? 'المعلم المسؤول' : 'مساعد'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? 'success' : 'danger'}
                        size="sm"
                        data-testid={`user-status-badge-${u.id}`}
                      >
                        {isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      {isOwner ? (
                        <span className="text-xs text-[var(--color-text-muted)] italic">
                          حساب رئيسي غير قابل للتعديل
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserForPermissions(u)}
                            title="تعديل الصلاحيات"
                            data-testid={`edit-permissions-btn-${u.id}`}
                          >
                            <Shield className="w-3.5 h-3.5 ml-1 text-[var(--color-brand-primary)]" aria-hidden="true" />
                            <span>الصلاحيات</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserForPin(u)}
                            title="تعيين رمز PIN جديد"
                            data-testid={`reset-pin-btn-${u.id}`}
                          >
                            <KeyRound className="w-3.5 h-3.5 ml-1 text-[var(--color-text-secondary)]" aria-hidden="true" />
                            <span>تعيين PIN</span>
                          </Button>

                          {isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToToggleStatus(u)}
                              title="تعطيل الحساب"
                              className="text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)]"
                              data-testid={`deactivate-user-btn-${u.id}`}
                            >
                              <UserX className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
                              <span>تعطيل</span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToToggleStatus(u)}
                              title="تفعيل الحساب"
                              className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              data-testid={`activate-user-btn-${u.id}`}
                            >
                              <UserCheck className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
                              <span>تفعيل</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Assistant Modal */}
      <AssistantCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Permissions Modal */}
      <AssistantPermissionsModal
        isOpen={Boolean(selectedUserForPermissions)}
        onClose={() => setSelectedUserForPermissions(null)}
        user={selectedUserForPermissions}
        initialPermissions={selectedUserForPermissions?.permissions ?? []}
      />

      {/* PIN Reset Modal */}
      <AssistantPinResetModal
        isOpen={Boolean(selectedUserForPin)}
        onClose={() => setSelectedUserForPin(null)}
        user={selectedUserForPin}
      />

      {/* Toggle User Status Confirmation Modal */}
      <Modal
        isOpen={Boolean(userToToggleStatus)}
        onClose={() => setUserToToggleStatus(null)}
        title={
          userToToggleStatus?.status === 'ACTIVE'
            ? 'تأكيد تعطيل حساب المساعد'
            : 'تأكيد تفعيل حساب المساعد'
        }
        description={
          userToToggleStatus?.status === 'ACTIVE'
            ? `هل أنت متأكد من رغبتك في تعطيل حساب المساعد (${userToToggleStatus?.fullName})؟ لن يتمكن من تسجيل الدخول حتى تتم إعادة تفعيله.`
            : `هل أنت متأكد من رغبتك في إعادة تفعيل حساب المساعد (${userToToggleStatus?.fullName})؟ سيتمكن من تسجيل الدخول مجدداً بالرمز المعتمد له.`
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setUserToToggleStatus(null)}
              disabled={changeStatusMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant={userToToggleStatus?.status === 'ACTIVE' ? 'danger' : 'primary'}
              size="sm"
              loading={changeStatusMutation.isPending}
              disabled={changeStatusMutation.isPending}
              onClick={handleConfirmToggleStatus}
              data-testid="confirm-status-toggle-btn"
            >
              <span>
                {userToToggleStatus?.status === 'ACTIVE' ? 'تأكيد التعطيل' : 'تأكيد التفعيل'}
              </span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
