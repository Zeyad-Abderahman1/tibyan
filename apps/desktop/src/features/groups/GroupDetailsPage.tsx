import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Input,
} from '@tibyan/design-system';
import {
  ArrowRight,
  Edit2,
  UserPlus,
  Archive,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  History,
} from 'lucide-react';
import type { SessionDto, GroupEnrollmentDto } from '@tibyan/contracts';
import {
  useGroup,
  useGroupEnrollments,
  useGroupSessions,
  useUpdateGroup,
  useEndEnrollment,
  useUpdateEnrollmentPayment,
} from '../../hooks/useGroups.js';
import { useAuth } from '../../hooks/useAuth.js';
import { GroupCreateModal, WEEKDAY_LABELS } from './GroupCreateModal.js';
import { EnrollmentModal } from './EnrollmentModal.js';
import { RescheduleSessionModal } from './RescheduleSessionModal.js';

export function GroupDetailsPage() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const isOwner = session?.role === 'OWNER';
  const permissions = session?.permissions ?? [];
  const canWrite = isOwner || permissions.includes('GROUPS_WRITE');
  const canManageSessions = isOwner || permissions.includes('SESSIONS_MANAGE');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<SessionDto | null>(null);

  // End Enrollment confirmation state
  const [enrollmentToEnd, setEnrollmentToEnd] = useState<GroupEnrollmentDto | null>(null);
  const [endReason, setEndReason] = useState('');

  // Payment Override quick-edit state
  const [enrollmentToEditPayment, setEnrollmentToEditPayment] = useState<GroupEnrollmentDto | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');

  // Ended students toggle
  const [showEndedEnrollments, setShowEndedEnrollments] = useState(false);

  // Today & 28-day range
  const today = new Date().toISOString().split('T')[0]!;
  const todayPlus27Dt = new Date();
  todayPlus27Dt.setDate(todayPlus27Dt.getDate() + 27);
  const todayPlus27 = todayPlus27Dt.toISOString().split('T')[0]!;

  // Queries
  const {
    data: group,
    isLoading: isGroupLoading,
    isError: isGroupError,
    refetch: refetchGroup,
  } = useGroup(groupId);

  const {
    data: enrollments = [],
  } = useGroupEnrollments(groupId);

  const {
    data: sessions = [],
  } = useGroupSessions(groupId, today, todayPlus27);

  // Mutations
  const updateGroupMutation = useUpdateGroup();
  const endEnrollmentMutation = useEndEnrollment(groupId);
  const updatePaymentMutation = useUpdateEnrollmentPayment(groupId);

  const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');
  const endedEnrollments = enrollments.filter((e) => e.status === 'ENDED');

  const handleToggleArchive = async () => {
    if (!group) return;
    const newStatus = group.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    await updateGroupMutation.mutateAsync({
      groupId: group.id,
      status: newStatus,
    });
  };

  const handleConfirmEndEnrollment = async () => {
    if (!enrollmentToEnd) return;
    await endEnrollmentMutation.mutateAsync({
      enrollmentId: enrollmentToEnd.id,
      reason: endReason.trim() || undefined,
    });
    setEnrollmentToEnd(null);
    setEndReason('');
  };

  const handleConfirmUpdatePayment = async () => {
    if (!enrollmentToEditPayment) return;
    const amountNum = Number(editPaymentAmount);
    await updatePaymentMutation.mutateAsync({
      enrollmentId: enrollmentToEditPayment.id,
      paymentAmountOverride: isNaN(amountNum) ? null : amountNum,
    });
    setEnrollmentToEditPayment(null);
    setEditPaymentAmount('');
  };

  if (isGroupLoading) {
    return (
      <div className="space-y-6" data-testid="group-details-loading">
        <div className="flex items-center gap-4 text-[var(--color-text-secondary)]">
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent" />
          <span className="text-sm">جاري تحميل بيانات المجموعة...</span>
        </div>
      </div>
    );
  }

  if (isGroupError || !group) {
    return (
      <div className="space-y-6" data-testid="group-details-error">
        <Card variant="default" className="p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-[var(--color-status-danger)] mx-auto" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            تعذر تحميل بيانات المجموعة، أو أن المجموعة غير موجودة.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/groups')}>
              العودة لقائمة المجموعات
            </Button>
            <Button variant="primary" onClick={() => refetchGroup()}>
              إعادة المحاولة
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-group-details">
      {/* Header & Back Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/groups')}
            className="p-1.5"
            title="العودة للمجموعات"
            data-testid="btn-back-to-groups"
          >
            <ArrowRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]" data-testid="group-details-name">
                {group.name}
              </h1>
              <Badge
                variant={group.status === 'ACTIVE' ? 'success' : 'neutral'}
                data-testid="group-details-status"
              >
                {group.status === 'ACTIVE' ? 'نشطة' : 'مؤرشفة'}
              </Badge>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              تاريخ الإنشاء:{' '}
              <span dir="ltr">{group.createdAt.split('T')[0]}</span>
            </p>
          </div>
        </div>

        {/* Top Actions */}
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1 text-xs"
              data-testid="btn-edit-group"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>تعديل المجموعة والمواعيد</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleArchive}
              className="gap-1 text-xs text-[var(--color-status-warning)]"
              data-testid="btn-toggle-archive"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{group.status === 'ACTIVE' ? 'أرشفة المجموعة' : 'استعادة المجموعة'}</span>
            </Button>

            {group.status === 'ACTIVE' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEnrollModalOpen(true)}
                className="gap-1 text-xs"
                data-testid="btn-open-enroll-modal"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>تسجيل طالب</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Metadata & Weekly Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Academic Dimensions */}
        <Card variant="default" className="p-4 space-y-3">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] pb-2">
            الأبعاد الأكاديمية
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">نظام التعليم:</span>
              <span className="font-semibold">{group.educationSystem === 'GENERAL' ? 'التعليم العام' : 'البكالوريا المصرية'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">المرحلة الدراسية:</span>
              <span className="font-semibold">{group.gradeLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">المسار اللغوي:</span>
              <span className="font-semibold">{group.languageTrack === 'ARABIC' ? 'عربي' : 'لغات (إنجليزي)'}</span>
            </div>
            {group.focusMathBranch && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">فرع الرياضيات:</span>
                <span className="font-semibold text-[var(--color-brand-primary)]">{group.focusMathBranch}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Terms Defaults */}
        <Card variant="default" className="p-4 space-y-3">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] pb-2">
            المصروفات الافتراضية
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">نوع الاشتراك:</span>
              <span className="font-semibold">{group.defaultPaymentType === 'MONTHLY' ? 'اشتراك شهري' : 'دفع بالحصة'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">القيمة الافتراضية:</span>
              <span dir="ltr" className="font-bold text-[var(--color-brand-primary)]">
                {group.defaultPaymentAmount} ج.م
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">الطلاب المقيدين:</span>
              <span className="font-bold">{activeEnrollments.length} طالب</span>
            </div>
          </div>
        </Card>

        {/* Recurring Weekly Schedule */}
        <Card variant="default" className="p-4 space-y-3">
          <h3 className="text-xs font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] pb-2">
            المواعيد الأسبوعية المتكررة
          </h3>
          {group.schedules.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-2">لا توجد مواعيد محددة</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-[var(--radius-sm)] bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] font-medium"
                >
                  <Clock className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                  <span>{WEEKDAY_LABELS[s.weekday]}</span>
                  <span dir="ltr" className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {s.startTime} ({s.durationMinutes} د)
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Enrolled Students Roster */}
      <Card variant="default" className="p-5 space-y-4" data-testid="section-enrollments">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              قائمة الطلاب المقيدين في المجموعة ({activeEnrollments.length})
            </h2>
          </div>
          {endedEnrollments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEndedEnrollments(!showEndedEnrollments)}
              className="text-xs gap-1"
              data-testid="btn-toggle-ended-students"
            >
              <History className="w-3.5 h-3.5" />
              <span>{showEndedEnrollments ? 'إخفاء الطلاب السابقين' : `عرض السابقين (${endedEnrollments.length})`}</span>
            </Button>
          )}
        </div>

        {activeEnrollments.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border-subtle)] rounded-[var(--radius-md)]">
            لا يوجد طلاب مقيدين حالياً في هذه المجموعة.
          </div>
        ) : (
          <Table data-testid="table-active-enrollments">
            <TableHeader>
              <TableRow>
                <TableHead>كود الطالب</TableHead>
                <TableHead>اسم الطالب</TableHead>
                <TableHead>تاريخ القيد</TableHead>
                <TableHead>المصروفات الفعلية</TableHead>
                {canWrite && <TableHead className="text-end">الإجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeEnrollments.map((e) => (
                <TableRow key={e.id} data-testid={`enrollment-row-${e.id}`}>
                  <TableCell>
                    <span dir="ltr" className="font-mono text-xs font-semibold">
                      {e.studentCode || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-[var(--color-text-primary)]">
                    {e.studentName || 'طالب غير محدد'}
                  </TableCell>
                  <TableCell>
                    <span dir="ltr" className="text-xs text-[var(--color-text-secondary)]">
                      {e.enrolledAt.split('T')[0]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span dir="ltr" className="font-bold">
                        {e.effectivePaymentAmount ?? group.defaultPaymentAmount} ج.م
                      </span>
                      {e.isPaymentOverridden ? (
                        <Badge variant="accent" size="sm">سعر خاص</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">افتراضي المجموعة</Badge>
                      )}
                    </div>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEnrollmentToEditPayment(e);
                            setEditPaymentAmount(String(e.paymentAmountOverride ?? group.defaultPaymentAmount));
                          }}
                          className="text-xs"
                          data-testid={`btn-edit-payment-${e.id}`}
                        >
                          تعديل السعر
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEnrollmentToEnd(e)}
                          className="text-xs text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)]"
                          data-testid={`btn-end-enrollment-${e.id}`}
                        >
                          إنهاء القيد
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Departed / Ended Students Table */}
        {showEndedEnrollments && endedEnrollments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] space-y-2">
            <h3 className="text-xs font-bold text-[var(--color-text-muted)]">
              سجل الطلاب السابقين (المغادرين)
            </h3>
            <Table data-testid="table-ended-enrollments">
              <TableHeader>
                <TableRow>
                  <TableHead>كود الطالب</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead>تاريخ القيد</TableHead>
                  <TableHead>تاريخ المغادرة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endedEnrollments.map((e) => (
                  <TableRow key={e.id} className="opacity-75">
                    <TableCell>
                      <span dir="ltr" className="font-mono text-xs">
                        {e.studentCode || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-[var(--color-text-secondary)]">
                      {e.studentName || '—'}
                    </TableCell>
                    <TableCell>
                      <span dir="ltr" className="text-xs">
                        {e.enrolledAt.split('T')[0]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr" className="text-xs font-semibold text-[var(--color-status-warning)]">
                        {e.leftAt ? e.leftAt.split('T')[0] : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">منتهي</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Upcoming Sessions (28-day horizon) */}
      <Card variant="default" className="p-5 space-y-4" data-testid="section-sessions">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-brand-primary)]" />
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              جدول الحصص القادمة (أفق 28 يوماً)
            </h2>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]" dir="ltr">
            {today} إلى {todayPlus27}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border-subtle)] rounded-[var(--radius-md)]">
            لا توجد حصص مجدولة لهذه المجموعة في الـ 28 يوماً القادمة.
          </div>
        ) : (
          <Table data-testid="table-sessions">
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ الفعلي</TableHead>
                <TableHead>الوقت</TableHead>
                <TableHead>المدة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الملاحظات / سبب التعديل</TableHead>
                {canManageSessions && <TableHead className="text-end">الإجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id} data-testid={`session-row-${s.id}`}>
                  <TableCell>
                    <span dir="ltr" className="font-semibold text-xs text-[var(--color-text-primary)]">
                      {s.effectiveDate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span dir="ltr" className="font-mono text-xs">
                      {s.effectiveStartTime}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span dir="ltr" className="text-xs text-[var(--color-text-secondary)]">
                      {s.durationMinutes} دقيقة
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === 'SCHEDULED'
                          ? 'neutral'
                          : s.status === 'RESCHEDULED'
                          ? 'warning'
                          : s.status === 'COMPLETED'
                          ? 'success'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {s.status === 'SCHEDULED'
                        ? 'مجدولة'
                        : s.status === 'RESCHEDULED'
                        ? 'معدلة الموعد'
                        : s.status === 'COMPLETED'
                        ? 'مكتملة'
                        : 'ملغاة'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--color-text-secondary)] max-w-xs truncate">
                    {s.status === 'RESCHEDULED' && (
                      <span className="text-[var(--color-status-warning)]">
                        (كانت: {s.scheduledDate} {s.scheduledStartTime}) {s.rescheduleReason}
                      </span>
                    )}
                    {s.status === 'CANCELLED_BY_TEACHER' && s.cancellationReason}
                    {s.status === 'SCHEDULED' && '—'}
                  </TableCell>
                  {canManageSessions && (
                    <TableCell className="text-end">
                      {s.status !== 'COMPLETED' && s.status !== 'CANCELLED_BY_TEACHER' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSessionToReschedule(s)}
                          className="text-xs text-[var(--color-brand-primary)]"
                          data-testid={`btn-reschedule-${s.id}`}
                        >
                          تعديل الموعد
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modals */}
      {isEditModalOpen && (
        <GroupCreateModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          groupToEdit={group}
        />
      )}

      {isEnrollModalOpen && (
        <EnrollmentModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          group={group}
        />
      )}

      {sessionToReschedule && (
        <RescheduleSessionModal
          isOpen={Boolean(sessionToReschedule)}
          onClose={() => setSessionToReschedule(null)}
          session={sessionToReschedule}
          groupId={group.id}
        />
      )}

      {/* End Enrollment Dialog */}
      {enrollmentToEnd && (
        <Modal
          isOpen={Boolean(enrollmentToEnd)}
          onClose={() => setEnrollmentToEnd(null)}
          size="sm"
          title="تأكيد إنهاء قيد الطالب"
          description={`إنهاء قيد الطالب ${enrollmentToEnd.studentName} من ${group.name}.`}
        >
          <div className="space-y-3 p-5">
            <Input
              label="سبب المغادرة (اختياري)"
              placeholder="مثال: تغيير المواعيد، انتقال، إلخ..."
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
            />
            <p className="text-[11px] text-[var(--color-text-muted)]">
              سيتم نقل الطالب إلى سجل الطلاب السابقين مع حفظ تاريخ المغادرة وحصصه المسجلة.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
              <Button variant="secondary" onClick={() => setEnrollmentToEnd(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmEndEnrollment}
                loading={endEnrollmentMutation.isPending}
                data-testid="btn-confirm-end-enrollment"
              >
                تأكيد إنهاء القيد
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Payment Override Dialog */}
      {enrollmentToEditPayment && (
        <Modal
          isOpen={Boolean(enrollmentToEditPayment)}
          onClose={() => setEnrollmentToEditPayment(null)}
          size="sm"
          title="تعديل مصروفات الطالب"
          description={`تعديل المصروفات للطالب ${enrollmentToEditPayment.studentName}.`}
        >
          <div className="space-y-3 p-5">
            <Input
              label="المبلغ المخصص (ج.م)"
              type="number"
              min="0"
              step="5"
              value={editPaymentAmount}
              onChange={(e) => setEditPaymentAmount(e.target.value)}
              dir="ltr"
              required
              data-testid="input-edit-payment-amount"
            />
            <p className="text-[11px] text-[var(--color-text-muted)]">
              المصروفات الافتراضية للمجموعة هي {group.defaultPaymentAmount} ج.م.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
              <Button variant="secondary" onClick={() => setEnrollmentToEditPayment(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmUpdatePayment}
                loading={updatePaymentMutation.isPending}
                data-testid="btn-confirm-update-payment"
              >
                حفظ
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
