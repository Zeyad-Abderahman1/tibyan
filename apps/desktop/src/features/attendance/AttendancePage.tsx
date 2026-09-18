import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Badge, Card, Select } from '@tibyan/design-system';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  MessageSquare,
  Users,
  AlertTriangle,
  Barcode,
} from 'lucide-react';
import type { AttendanceStatus, TodayClassSlotDto } from '@tibyan/contracts';

import { useTodayDashboard } from '../../hooks/useDashboard.js';
import {
  useSessionRoster,
  useRecordAttendance,
  useBatchRecordAttendance,
  useCompleteSession,
} from '../../hooks/useAttendance.js';
import { useUsbScanner } from '../../hooks/useUsbScanner.js';
import { useAuth } from '../../hooks/useAuth.js';

import { AttendanceSummaryStrip } from './AttendanceSummaryStrip.js';
import { AttendanceRosterTable } from './AttendanceRosterTable.js';
import { CompleteSessionModal } from './CompleteSessionModal.js';
import { ParentFollowUpDrawer } from './ParentFollowUpDrawer.js';
import { CameraScannerModal } from './CameraScannerModal.js';

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session: authSession } = useAuth();

  const isOwner = authSession?.role === 'OWNER';
  const canWrite = isOwner || authSession?.permissions?.includes('ATTENDANCE_WRITE');
  const canManageSessions = isOwner || authSession?.permissions?.includes('SESSIONS_MANAGE');

  const initialSessionId = searchParams.get('sessionId') || '';
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId);

  // Modals & Drawers State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [scannerToast, setScannerToast] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Today's classes for the session switcher
  const { data: todayData } = useTodayDashboard();
  const todaySlots: TodayClassSlotDto[] = todayData?.classes || [];

  // If no sessionId in query params but today has slots, select the first active slot
  useEffect(() => {
    if (!selectedSessionId && todaySlots.length > 0) {
      const activeSlot = todaySlots.find((s: TodayClassSlotDto) => s.status !== 'CANCELLED_BY_TEACHER') || todaySlots[0];
      if (activeSlot) {
        setSelectedSessionId(activeSlot.sessionId);
        setSearchParams({ sessionId: activeSlot.sessionId }, { replace: true });
      }
    }
  }, [selectedSessionId, todaySlots, setSearchParams]);

  // Sync selectedSessionId with URL param if it changes
  const handleSessionChange = (newSessionId: string) => {
    setSelectedSessionId(newSessionId);
    setSearchParams({ sessionId: newSessionId });
  };

  // Session Roster Query
  const {
    data: rosterData,
    isLoading: isRosterLoading,
    isError: isRosterError,
    error: rosterError,
    refetch: refetchRoster,
  } = useSessionRoster(selectedSessionId);

  // Mutations
  const recordAttendanceMutation = useRecordAttendance();
  const batchRecordMutation = useBatchRecordAttendance();
  const completeSessionMutation = useCompleteSession();

  const activeSlot = useMemo(() => {
    return todaySlots.find((s: TodayClassSlotDto) => s.sessionId === selectedSessionId);
  }, [todaySlots, selectedSessionId]);

  const currentSession = rosterData?.session;
  const isCancelled = currentSession?.status === 'CANCELLED_BY_TEACHER' || activeSlot?.status === 'CANCELLED_BY_TEACHER';
  const isCompleted = currentSession?.status === 'COMPLETED' || activeSlot?.status === 'COMPLETED';

  // Status Mutation Handler
  const handleUpdateStatus = async (
    studentId: string,
    status: AttendanceStatus,
    arrivalTime?: string | null
  ) => {
    if (!selectedSessionId || !canWrite || isCancelled) return;
    try {
      await recordAttendanceMutation.mutateAsync({
        sessionId: selectedSessionId,
        studentId,
        status,
        arrivalTime: arrivalTime ?? null,
      });
    } catch (err: any) {
      setScannerToast({
        type: 'error',
        message: err?.message || 'فشل تحديث حالة الحضور',
      });
    }
  };

  // Bulk Mark Present Handler
  const handleBulkMarkPresent = async (studentIds: string[]) => {
    if (!selectedSessionId || !canWrite || isCancelled || studentIds.length === 0) return;
    try {
      await batchRecordMutation.mutateAsync({
        sessionId: selectedSessionId,
        records: studentIds.map((studentId) => ({
          studentId,
          status: 'PRESENT',
          arrivalTime: null,
        })),
      });
    } catch (err: any) {
      setScannerToast({
        type: 'error',
        message: err?.message || 'فشل تسجيل الحضور الجماعي',
      });
    }
  };

  // Session Completion Handler
  const handleCompleteSession = async (notes?: string) => {
    if (!selectedSessionId || !canManageSessions) return;
    try {
      await completeSessionMutation.mutateAsync({
        sessionId: selectedSessionId,
        notes,
      });
      setIsCompleteModalOpen(false);
    } catch (err: any) {
      setScannerToast({
        type: 'error',
        message: err?.message || 'فشل إنهاء الحصة',
      });
    }
  };

  // USB Scanner Wedge Integration
  const handleScanCode = (scannedCode: string) => {
    if (!rosterData || isCancelled || !canWrite) return;

    const normalized = scannedCode.trim().toLowerCase();
    const student = rosterData.roster.find((item) => {
      const code = item.studentCode.toLowerCase();
      return code === normalized || code.replace(/^tb-0*/, '') === normalized.replace(/^0*/, '');
    });

    if (!student) {
      setScannerToast({
        type: 'warning',
        message: `الرمز [${scannedCode}] غير مقيد في هذه الحصة/المجموعة.`,
      });
      return;
    }

    if (student.attendanceRecord?.status === 'PRESENT') {
      setScannerToast({
        type: 'warning',
        message: `الطالب ${student.studentName} حاضر بالفعل.`,
      });
      return;
    }

    handleUpdateStatus(student.studentId, 'PRESENT', null);
    setScannerToast({
      type: 'success',
      message: `تم تسجيل حضور: ${student.studentName} (${student.studentCode})`,
    });
  };

  const { isListening } = useUsbScanner({
    onScan: handleScanCode,
    enabled: Boolean(selectedSessionId && !isCancelled && canWrite),
  });

  // Auto-dismiss scanner toast after 4s
  useEffect(() => {
    if (!scannerToast) return;
    const timer = setTimeout(() => setScannerToast(null), 4000);
    return () => clearTimeout(timer);
  }, [scannerToast]);

  return (
    <div className="space-y-6" data-testid="page-attendance" dir="rtl">
      {/* Top Header: Title + Context + Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] dark:bg-[#5CE1E6]/10 dark:text-[#5CE1E6] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4 stroke-[2]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight" data-testid="heading-attendance">
              تسجيل الحضور
            </h1>
            {isCompleted && (
              <Badge variant="success" size="sm" data-testid="badge-session-completed">
                حصة مكتملة
              </Badge>
            )}
            {isCancelled && (
              <Badge variant="danger" size="sm" data-testid="badge-session-cancelled">
                حصة ملغاة
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            تسجيل حضور الطلاب يدويًا، عبر ماسح الباركود USB، أو الكاميرا، ومتابعة أولياء الأمور
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* USB Scanner Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              isListening
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
            }`}
            data-testid="usb-scanner-pill"
          >
            <Barcode className="w-4 h-4" />
            <span>{isListening ? 'الماسح نشط' : 'الماسح متوقف'}</span>
          </div>

          {/* Camera QR Button */}
          {canWrite && !isCancelled && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCameraModalOpen(true)}
              className="text-xs flex items-center gap-1.5"
              data-testid="btn-open-camera-scanner"
            >
              <QrCode className="w-4 h-4" />
              <span>ماسح الكاميرا</span>
            </Button>
          )}

          {/* Parent Follow-Up Drawer Button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsFollowUpOpen(true)}
            className="text-xs flex items-center gap-1.5"
            data-testid="btn-open-followup-drawer"
          >
            <MessageSquare className="w-4 h-4 text-[var(--color-brand-accent)]" />
            <span>متابعة الغياب</span>
          </Button>

          {/* Complete Session Primary CTA */}
          {canManageSessions && !isCompleted && !isCancelled && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsCompleteModalOpen(true)}
              className="text-xs flex items-center gap-1.5"
              data-testid="btn-complete-session"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>إنهاء الحصة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {scannerToast && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs font-medium animate-in fade-in duration-200 ${
            scannerToast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : scannerToast.type === 'warning'
              ? 'bg-[var(--color-status-warning-bg)] border-[var(--color-status-warning-border)] text-[var(--color-status-warning)]'
              : 'bg-[var(--color-status-danger-bg)] border-[var(--color-status-danger-border)] text-[var(--color-status-danger)]'
          }`}
          data-testid="scanner-feedback-toast"
        >
          <div className="flex items-center gap-2">
            {scannerToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : scannerToast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{scannerToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setScannerToast(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Session Selector Strip */}
      <Card variant="default" className="p-4 bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-[var(--color-text-secondary)] shrink-0">
              الحصة المستهدفة:
            </span>
            {todaySlots.length === 0 ? (
              <span className="text-xs text-[var(--color-text-muted)]">
                لا توجد حصص مجدولة لليوم في جدول المجموعات.
              </span>
            ) : (
              <div className="w-72">
                <Select
                  value={selectedSessionId}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  options={todaySlots.map((slot: TodayClassSlotDto) => ({
                    value: slot.sessionId,
                    label: `${slot.groupName} (${slot.effectiveStartTime})`,
                  }))}
                  data-testid="session-selector"
                />
              </div>
            )}
          </div>

          {/* Active Session Badges */}
          {activeSlot && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--color-brand-primary)] dark:text-[#5CE1E6]" />
                <span className="font-semibold text-[var(--color-text-primary)]" dir="ltr">
                  {activeSlot.effectiveStartTime}
                </span>
                <span>({activeSlot.durationMinutes} دقيقة)</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <span>
                  <span className="font-semibold text-[var(--color-text-primary)]" dir="ltr">
                    {activeSlot.enrolledCount}
                  </span>{' '}
                  طالب مقيد
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Cancelled Session Alert */}
      {isCancelled && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger-border)] text-[var(--color-status-danger)] text-sm font-medium"
          role="alert"
          data-testid="alert-cancelled-session"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>تم إلغاء هذه الحصة من قِبل المدرس. لا يمكن تسجيل الحضور لحصة ملغاة.</span>
        </div>
      )}

      {/* Loading State */}
      {isRosterLoading && (
        <div className="py-16 text-center space-y-3" data-testid="attendance-loading">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
          <p className="text-xs text-[var(--color-text-secondary)]">جاري تحميل سجل حضور الطلاب...</p>
        </div>
      )}

      {/* Error State */}
      {isRosterError && (
        <Card variant="default" className="p-8 text-center space-y-3 border-[var(--color-status-danger-border)]">
          <AlertCircle className="w-8 h-8 mx-auto text-[var(--color-status-danger)]" />
          <h3 className="font-bold text-sm text-[var(--color-text-primary)]">تعذر تحميل سجل الحضور</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
            {(rosterError as any)?.message || 'حدث خطأ أثناء محاولة الاتصال بقاعدة بيانات الحصص.'}
          </p>
          <Button variant="primary" size="sm" onClick={() => refetchRoster()} data-testid="btn-retry-roster">
            إعادة المحاولة
          </Button>
        </Card>
      )}

      {/* Active Workspace State */}
      {!isRosterLoading && !isRosterError && rosterData && (
        <div className="space-y-6">
          {/* Real-time Attendance Summary Metrics */}
          <AttendanceSummaryStrip summary={rosterData.summary} />

          {/* Student Roster Table */}
          <AttendanceRosterTable
            roster={rosterData.roster}
            disabled={isCancelled}
            canWrite={canWrite}
            onUpdateStatus={handleUpdateStatus}
            onBulkMarkPresent={handleBulkMarkPresent}
          />
        </div>
      )}

      {/* Session Completion Modal */}
      {rosterData && (
        <CompleteSessionModal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          onConfirm={handleCompleteSession}
          isSubmitting={completeSessionMutation.isPending}
          groupName={rosterData.groupName}
          summary={rosterData.summary}
        />
      )}

      {/* Camera QR Viewfinder Modal */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScan={handleScanCode}
      />

      {/* Parent Follow-Up Drawer */}
      <ParentFollowUpDrawer
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        sessionDate={currentSession?.effectiveDate || new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
