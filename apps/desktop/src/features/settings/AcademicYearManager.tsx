import { useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ArrowLeftRight,
  AlertCircle,
  Database,
  RefreshCw,
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
import type { AcademicYearDto } from '@tibyan/contracts';
import { useAcademicYears, useSwitchAcademicYear } from '../../hooks/useAcademicYears.js';
import { useAuth } from '../../hooks/useAuth.js';
import { CreateAcademicYearModal } from './CreateAcademicYearModal.js';

export function AcademicYearManager() {
  const { session } = useAuth();
  const { data: years = [], isLoading, isError, refetch } = useAcademicYears();
  const switchMutation = useSwitchAcademicYear();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [yearToSwitch, setYearToSwitch] = useState<AcademicYearDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage =
    session?.role === 'OWNER' || session?.permissions?.includes('SETTINGS_WRITE');

  const handleConfirmSwitch = async () => {
    if (!yearToSwitch) return;
    setActionError(null);

    try {
      await switchMutation.mutateAsync({ academicYearId: yearToSwitch.id });
      setYearToSwitch(null);
    } catch (err: any) {
      setActionError(err?.message || 'تعذر التبديل إلى العام الدراسي المحدد.');
    }
  };

  return (
    <div className="space-y-6" data-testid="academic-year-manager">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            إدارة وتبديل الأعوام الدراسية
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            يتم تخزين بيانات الطلاب والمجموعات والحصص بشكل مستقل لكل عام دراسي مع الحفاظ على قاعدة النظام المركزية.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="open-create-year-modal-btn"
          >
            <CalendarPlus className="w-4 h-4 ml-1.5" aria-hidden="true" />
            <span>إضافة عام دراسي</span>
          </Button>
        )}
      </div>

      {actionError && (
        <div
          className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
          role="alert"
          data-testid="year-action-error"
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
              جاري تحميل قائمة الأعوام الدراسية...
            </span>
          </div>
        </Card>
      ) : isError ? (
        <Card variant="default" className="p-8 text-center text-[var(--color-status-danger)]">
          <p className="text-xs">تعذر جلب قائمة الأعوام الدراسية.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3">
            إعادة المحاولة
          </Button>
        </Card>
      ) : (
        <Card variant="default" className="overflow-hidden">
          <Table data-testid="academic-years-table">
            <TableHeader>
              <TableRow>
                <TableHead>العام الدراسي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الملف المحلي</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((yr) => (
                <TableRow key={yr.id} data-testid={`academic-year-row-${yr.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" aria-hidden="true" />
                      <span className="font-bold text-sm text-[var(--color-text-primary)] font-mono dir-ltr">
                        {yr.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {yr.isActive ? (
                      <Badge variant="primary" size="sm" className="gap-1" data-testid="active-year-badge">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                        <span>نشط حالياً</span>
                      </Badge>
                    ) : yr.isArchived ? (
                      <Badge variant="neutral" size="sm">
                        مؤرشف
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        غير مفعل
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-mono dir-ltr">
                      <Database className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{yr.dbFilename}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    {yr.isActive ? (
                      <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                        العام الحالي
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canManage || switchMutation.isPending}
                        onClick={() => setYearToSwitch(yr)}
                        className="gap-1.5"
                        data-testid={`switch-year-btn-${yr.id}`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>تبديل</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Switch Confirmation Modal */}
      <Modal
        isOpen={Boolean(yearToSwitch)}
        onClose={() => setYearToSwitch(null)}
        title="تأكيد التبديل إلى عام دراسي آخر"
        description={`هل أنت متأكد من الانتقال إلى العام الدراسي ${yearToSwitch?.name}؟`}
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            سيتم تحديث بيئة العمل وتحميل بيانات الطلاب والمجموعات والحصص الخاصة بالعام المختار. ستبقى حسابات المساعدين والإعدادات العامة دون تغيير.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setYearToSwitch(null)}
              disabled={switchMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={switchMutation.isPending}
              disabled={switchMutation.isPending}
              onClick={handleConfirmSwitch}
              data-testid="confirm-switch-year-btn"
            >
              <span>تأكيد التبديل</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Academic Year Modal */}
      <CreateAcademicYearModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
