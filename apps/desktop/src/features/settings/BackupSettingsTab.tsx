import { useState } from 'react';
import {
  HardDrive,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  AlertCircle,
  RefreshCw,
  Archive,
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
} from '@tibyan/design-system';
import { useBackupStatus, useBackupRecords, useTriggerBackup } from '../../hooks/useBackup.js';
import { useAuth } from '../../hooks/useAuth.js';

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BackupSettingsTab() {
  const { session } = useAuth();
  const { data: status, isLoading: isStatusLoading, refetch: refetchStatus } = useBackupStatus();
  const { data: records = [], isLoading: isRecordsLoading } = useBackupRecords();
  const triggerMutation = useTriggerBackup();

  const [triggerSuccess, setTriggerSuccess] = useState<boolean>(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const canManageBackup =
    session?.role === 'OWNER' || session?.permissions?.includes('BACKUP_MANAGE');

  const isRunning = status?.isBackupRunning || triggerMutation.isPending;

  const handleTriggerBackup = async () => {
    setTriggerSuccess(false);
    setTriggerError(null);

    try {
      const res = await triggerMutation.mutateAsync({ reason: 'نسخ احتياطي يدوي من واجهة الإعدادات' });
      if (res.success) {
        setTriggerSuccess(true);
        refetchStatus();
      }
    } catch (err: any) {
      setTriggerError(err?.message || 'فشلت عملية إنشاء النسخة الاحتياطية.');
    }
  };

  return (
    <div className="space-y-6" data-testid="backup-settings-tab">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            النسخ الاحتياطي وسلامة البيانات
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            يقوم النظام بحفظ نسخ احتياطية كاملة تشمل قاعدة النظام وكافة الأعوام الدراسية ومجلدات الوسائط بأمان.
          </p>
        </div>

        {canManageBackup && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerBackup}
            disabled={isRunning}
            loading={isRunning}
            data-testid="trigger-backup-btn"
          >
            <Play className="w-4 h-4 ml-1.5" aria-hidden="true" />
            <span>{isRunning ? 'جاري النسخ...' : 'إنشاء نسخة احتياطية الآن'}</span>
          </Button>
        )}
      </div>

      {triggerSuccess && (
        <div
          className="flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs"
          role="status"
          data-testid="backup-success-banner"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>تم إنشاء النسخة الاحتياطية والتحقق من سلامتها بنجاح.</span>
        </div>
      )}

      {triggerError && (
        <div
          className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
          role="alert"
          data-testid="backup-error-banner"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{triggerError}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>حالة آخر نسخة</span>
            <HardDrive className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            {isStatusLoading ? (
              <span className="text-xs text-[var(--color-text-muted)]">جاري التحميل...</span>
            ) : status?.lastBackupStatus === 'SUCCESS' ? (
              <Badge variant="primary" size="sm" className="gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                <span>ناجحة ومكتملة</span>
              </Badge>
            ) : status?.lastBackupStatus === 'FAILED' ? (
              <Badge variant="danger" size="sm" className="gap-1">
                <XCircle className="w-3 h-3" aria-hidden="true" />
                <span>فشلت العملية</span>
              </Badge>
            ) : (
              <span className="text-xs text-[var(--color-text-muted)] font-medium">لا توجد نسخ سابقة</span>
            )}
          </div>
        </Card>

        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>تاريخ آخر نسخة</span>
            <Clock className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-sm font-bold text-[var(--color-text-primary)] font-mono dir-ltr text-right">
            {status?.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString('ar-EG') : '—'}
          </div>
        </Card>

        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>حجم آخر نسخة</span>
            <Archive className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-sm font-bold text-[var(--color-text-primary)] font-mono dir-ltr text-right">
            {formatBytes(status?.latestBackupSizeBytes)}
          </div>
        </Card>

        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>إجمالي النسخ المحفوظة</span>
            <HardDrive className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-sm font-bold text-[var(--color-brand-primary)] font-mono text-right">
            {status?.totalBackupsCount ?? 0}
          </div>
        </Card>
      </div>

      {/* Recent Backup Records Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          سجل النسخ الاحتياطية الأخيرة
        </h3>

        {isRecordsLoading ? (
          <Card variant="default" className="p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 text-[var(--color-brand-primary)] animate-spin" />
              <span className="text-xs text-[var(--color-text-secondary)]">جاري تحميل السجلات...</span>
            </div>
          </Card>
        ) : records.length === 0 ? (
          <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)]">
            <p className="text-xs">لم يتم تسجيل أي نسخ احتياطية حتى الآن.</p>
          </Card>
        ) : (
          <Card variant="default" className="overflow-hidden">
            <Table data-testid="backup-records-table">
              <TableHeader>
                <TableRow>
                  <TableHead>تاريخ النسخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الحجم</TableHead>
                  <TableHead>الأعوام المشمولة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id} data-testid={`backup-record-row-${rec.id}`}>
                    <TableCell>
                      <span className="text-xs font-mono dir-ltr text-[var(--color-text-primary)]">
                        {new Date(rec.backupDate || rec.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {rec.status === 'SUCCESS' ? (
                        <Badge variant="primary" size="sm" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          <span>ناجحة</span>
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm" className="gap-1">
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                          <span>فاشلة</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono dir-ltr text-[var(--color-text-secondary)]">
                        {formatBytes(rec.sizeBytes)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rec.academicYearsIncluded.length > 0 ? (
                          rec.academicYearsIncluded.map((yr) => (
                            <Badge key={yr} variant="neutral" size="sm" className="font-mono dir-ltr">
                              {yr}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
