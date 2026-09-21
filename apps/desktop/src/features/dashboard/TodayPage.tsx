import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '@tibyan/design-system';
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  FileCheck,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { useTodayDashboard } from '../../hooks/useDashboard.js';
import { ClassScheduleCard } from './ClassScheduleCard.js';
import { NeedsAttentionCard } from './NeedsAttentionCard.js';

export function TodayPage() {
  const navigate = useNavigate();
  const {
    data: dashboard,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTodayDashboard();

  if (isLoading) {
    return (
      <div
        className="p-12 text-center text-[var(--color-text-secondary)] space-y-3"
        data-testid="dashboard-loading"
      >
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent mx-auto" />
        <p className="text-sm font-medium">جاري تحميل بيانات لوحة اليوم...</p>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="space-y-6" data-testid="page-today">
        <Card variant="default" className="p-8 text-center space-y-3" data-testid="dashboard-error">
          <AlertCircle className="w-8 h-8 text-[var(--color-status-danger)] mx-auto" />
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            تعذر تحميل بيانات اليوم
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
            {error instanceof Error ? error.message : 'حدث خطأ أثناء استرجاع بيانات اليوم من النظام'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            data-testid="btn-retry-dashboard"
          >
            إعادة المحاولة
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-today">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[var(--color-brand-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]" data-testid="heading-today">
              لوحة متابعة اليوم
            </h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 flex items-center gap-1.5">
            <span>{dashboard.weekdayArabic}،</span>
            <span dir="ltr" className="font-semibold text-[var(--color-text-primary)]">
              {dashboard.currentDate}
            </span>
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 self-start md:self-auto"
          data-testid="btn-refresh-dashboard"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Quick-Stats Strip */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
        data-testid="dashboard-quick-stats"
      >
        {/* Stat 1: Today's Classes */}
        <Card variant="default" className="p-4 flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[var(--color-brand-primary)]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[var(--color-text-muted)] block truncate">
              حصص اليوم
            </span>
            <span
              dir="ltr"
              className="text-xl font-bold text-[var(--color-text-primary)] block font-mono"
              data-testid="stat-classes-count"
            >
              {dashboard.classes.length}
            </span>
          </div>
        </Card>

        {/* Stat 2: Expected Students Today */}
        <Card variant="default" className="p-4 flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[var(--color-brand-accent)]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[var(--color-text-muted)] block truncate">
              الطلاب المتوقع حضورهم
            </span>
            <span
              dir="ltr"
              className="text-xl font-bold text-[var(--color-text-primary)] block font-mono"
              data-testid="stat-expected-students"
            >
              {dashboard.totalStudentsExpectedToday}
            </span>
          </div>
        </Card>

        {/* Stat 3: Active Groups */}
        <Card variant="default" className="p-4 flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-[#0B3D3D] dark:text-[#5CE1E6]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[var(--color-text-muted)] block truncate">
              المجموعات النشطة
            </span>
            <span
              dir="ltr"
              className="text-xl font-bold text-[var(--color-text-primary)] block font-mono"
              data-testid="stat-active-groups"
            >
              {dashboard.activeGroupsCount}
            </span>
          </div>
        </Card>

        {/* Stat 4: Total Enrolled Students */}
        <Card variant="default" className="p-4 flex items-center gap-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-status-success)]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[var(--color-text-muted)] block truncate">
              إجمالي الطلاب المقيدين
            </span>
            <span
              dir="ltr"
              className="text-xl font-bold text-[var(--color-text-primary)] block font-mono"
              data-testid="stat-enrolled-students"
            >
              {dashboard.totalEnrolledStudents}
            </span>
          </div>
        </Card>
      </div>

      {/* Phase 4 Featured Shortcut: AI Exam Builder Banner */}
      <Card
        variant="default"
        className="p-4 bg-gradient-to-r from-[var(--color-brand-primary)]/10 via-[var(--color-brand-primary)]/5 to-transparent border-[var(--color-brand-primary)]/30 flex flex-col md:flex-row items-center justify-between gap-4"
        data-testid="banner-exam-builder"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                منشئ الاختبارات الذكي (Exam Builder)
              </h2>
              <Badge variant="accent" size="sm">جديد</Badge>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              بناء وتنسيق نماذج الاختبارات A/B/C/D استناداً لبنك الأسئلة ومساعد الذكاء الاصطناعي، وتصديرها بصيغة A4 جاهزة للطباعة.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/exams')}
          data-testid="btn-open-exams-from-dashboard"
          className="shrink-0"
        >
          <Sparkles className="w-4 h-4 ml-1.5" />
          فتح منشئ الاختبارات
        </Button>
      </Card>

      {/* Phase 5 Featured Shortcut: Paper Correction & Analytics Banner */}
      <Card
        variant="default"
        className="p-4 bg-gradient-to-r from-[#0B3D3D]/10 via-[#0B3D3D]/5 to-transparent dark:from-[#5CE1E6]/10 dark:via-[#5CE1E6]/5 border-[#0B3D3D]/30 dark:border-[#5CE1E6]/30 flex flex-col md:flex-row items-center justify-between gap-4"
        data-testid="banner-paper-correction"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0B3D3D] dark:bg-[#5CE1E6] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                تصحيح الأوراق والتحليلات
              </h2>
              <Badge variant="accent" size="sm">جديد</Badge>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              استيراد صور أوراق الاختبار، التصحيح التلقائي بالذكاء الاصطناعي، وعرض تحليلات الأداء.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/capture')}
          data-testid="btn-open-capture-from-dashboard"
          className="shrink-0"
        >
          <ClipboardCheck className="w-4 h-4 ml-1.5" />
          فتح التصحيح
        </Button>
      </Card>

      {/* Main Content: Schedule & Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Classes Schedule Column (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5" data-testid="dashboard-classes-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                حصص ومواعيد اليوم
              </h2>
              <Badge variant="neutral" size="sm">
                {dashboard.classes.length}
              </Badge>
            </div>
          </div>

          {dashboard.classes.length === 0 ? (
            <Card
              variant="default"
              className="p-8 text-center space-y-2 text-[var(--color-text-secondary)]"
              data-testid="dashboard-classes-empty"
            >
              <Clock className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                لا توجد حصص مجدولة لليوم
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
                يمكنك مراجعة مواعيد المجموعات أو إعادة جدولة حصص عبر قسم المجموعات الدراسية.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {dashboard.classes.map((slot) => (
                <ClassScheduleCard key={slot.sessionId} slot={slot} />
              ))}
            </div>
          )}
        </div>

        {/* Needs Attention Column (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5" data-testid="dashboard-attention-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                تنبيهات ومتابعة الطلاب
              </h2>
              <Badge
                variant={dashboard.needsAttention.length > 0 ? 'warning' : 'neutral'}
                size="sm"
              >
                {dashboard.needsAttention.length}
              </Badge>
            </div>
          </div>

          {dashboard.needsAttention.length === 0 ? (
            <Card
              variant="default"
              className="p-8 text-center space-y-2 text-[var(--color-text-secondary)]"
              data-testid="dashboard-attention-empty"
            >
              <CheckCircle2 className="w-10 h-10 text-[var(--color-status-success)] mx-auto" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                لا توجد حالات تحتاج متابعة
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
                جميع الطلاب بحالة ممتازة ولا توجد ملاحظات متابعة معلقة تتطلب التدخل.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {dashboard.needsAttention.map((item) => (
                <NeedsAttentionCard key={item.studentId} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
