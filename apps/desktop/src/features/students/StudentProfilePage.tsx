import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Edit,
  Power,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  Languages,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
} from '@tibyan/design-system';
import type { StudentStatus } from '@tibyan/contracts';
import { useStudent, useUpdateStudent } from '../../hooks/useStudents.js';
import { useAuth } from '../../hooks/useAuth.js';
import { StudentCreateModal } from './StudentCreateModal.js';
import { StudentNotesView } from './StudentNotesView.js';
import { StudentCardPreviewModal } from './cards/StudentCardPreviewModal.js';
import { StudentFinancialView } from './StudentFinancialView.js';

const GRADE_LEVEL_LABELS: Record<string, string> = {
  PREP_1: 'الصف الأول الإعدادي',
  PREP_2: 'الصف الثاني الإعدادي',
  PREP_3: 'الصف الثالث الإعدادي',
  SEC_1: 'الصف الأول الثانوي',
  SEC_2: 'الصف الثاني الثانوي',
  SEC_3: 'الصف الثالث الثانوي',
};

const SYSTEM_LABELS: Record<string, string> = {
  GENERAL: 'التعليم العام',
  EGYPTIAN_BACCALAUREATE: 'البكالوريا المصرية',
};

const TRACK_LABELS: Record<string, string> = {
  ARABIC: 'عربي',
  LANG_ENGLISH: 'لغات (إنجليزي)',
};

export function StudentProfilePage() {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading, error, refetch } = useStudent(studentId);
  const updateMutation = useUpdateStudent();
  const { session } = useAuth();

  const canWrite = session?.role === 'OWNER' || session?.permissions?.includes('STUDENTS_WRITE');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'finance'>('notes');

  const handleToggleStatus = async () => {
    if (!student || !canWrite) return;
    setStatusError(null);

    const nextStatus: StudentStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      const res = await updateMutation.mutateAsync({
        studentId: student.id,
        status: nextStatus,
      });

      if (!res.success) {
        setStatusError(res.error.message || 'فشل تغيير حالة الطالب');
      }
    } catch (err: any) {
      setStatusError(err?.message || 'فشل تغيير حالة الطالب');
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'long',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="student-profile-loading">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/students')}
            data-testid="back-to-students-btn"
          >
            <ArrowRight size={16} className="me-1" />
            العودة للطلاب
          </Button>
        </div>
        <Card variant="default" className="p-12 text-center text-xs text-[var(--color-text-muted)]">
          جاري تحميل بيانات الطالب...
        </Card>
      </div>
    );
  }

  // Not Found / Error State
  if (error || !student) {
    return (
      <div className="space-y-4" data-testid="student-not-found">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/students')}
            data-testid="back-to-students-btn"
          >
            <ArrowRight size={16} className="me-1" />
            العودة للطلاب
          </Button>
        </div>
        <Card variant="default" className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">لم يتم العثور على الطالب</h2>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
            قد يكون تم حذف الطالب أو أن المعرف المطلوب غير صحيح.
          </p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="student-profile-page">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/students')}
          data-testid="back-to-students-btn"
        >
          <ArrowRight size={16} className="me-1" />
          العودة لقائمة الطلاب
        </Button>
      </div>

      {statusError && (
        <div
          className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-[var(--radius-md)] text-xs font-medium"
          role="alert"
          data-testid="status-mutation-error"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <Card variant="default" className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Identity Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[var(--color-text-primary)]" data-testid="student-fullname">
                  {student.fullName}
                </h1>
                <Badge
                  variant={student.status === 'ACTIVE' ? 'success' : 'warning'}
                  size="sm"
                  dot
                  data-testid="student-status-badge"
                >
                  {student.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                </Badge>
                <Badge
                  variant={student.educationSystem === 'EGYPTIAN_BACCALAUREATE' ? 'accent' : 'neutral'}
                  size="sm"
                  data-testid="student-system-badge"
                >
                  {SYSTEM_LABELS[student.educationSystem] || student.educationSystem}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="font-mono font-medium text-[var(--color-brand-primary)]" dir="ltr" data-testid="student-code">
                  {student.studentCode}
                </span>
                <span>•</span>
                <span>{GRADE_LEVEL_LABELS[student.gradeLevel] || student.gradeLevel}</span>
                <span>•</span>
                <span>{TRACK_LABELS[student.languageTrack] || student.languageTrack}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {canWrite && (
            <div className="flex items-center gap-2 self-stretch sm:self-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCardPreviewOpen(true)}
                data-testid="print-student-card-btn"
              >
                <CreditCard size={14} className="me-1 text-[var(--color-brand-primary)]" />
                طباعة البطاقة
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                data-testid="edit-student-btn"
              >
                <Edit size={14} className="me-1" />
                تعديل البيانات
              </Button>
              <Button
                variant={student.status === 'ACTIVE' ? 'ghost' : 'primary'}
                size="sm"
                onClick={handleToggleStatus}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending}
                className={
                  student.status === 'ACTIVE'
                    ? 'text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)]'
                    : ''
                }
                data-testid="toggle-status-btn"
              >
                <Power size={14} className="me-1" />
                {student.status === 'ACTIVE' ? 'تعطيل الحساب' : 'تنشيط الحساب'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Grid: Details and Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Academic & Contact Metadata */}
        <div className="space-y-4">
          <Card variant="default" className="p-4 space-y-3">
            <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              بيانات التواصل والتسجيل
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-surface-subtle)]">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Phone size={14} className="text-[var(--color-brand-primary)]" />
                  <span>هاتف ولي الأمر:</span>
                </div>
                <a
                  href={`tel:${student.guardianPhone}`}
                  className="font-mono font-medium text-[var(--color-brand-primary)] hover:underline"
                  dir="ltr"
                  data-testid="student-guardian-phone"
                >
                  {student.guardianPhone}
                </a>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-surface-subtle)]">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <GraduationCap size={14} className="text-[var(--color-brand-primary)]" />
                  <span>المرحلة الدراسية:</span>
                </div>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {GRADE_LEVEL_LABELS[student.gradeLevel] || student.gradeLevel}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-surface-subtle)]">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <BookOpen size={14} className="text-[var(--color-brand-primary)]" />
                  <span>النظام التعليمي:</span>
                </div>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {SYSTEM_LABELS[student.educationSystem] || student.educationSystem}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-surface-subtle)]">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Languages size={14} className="text-[var(--color-brand-primary)]" />
                  <span>المسار اللغوي:</span>
                </div>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {TRACK_LABELS[student.languageTrack] || student.languageTrack}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-surface-subtle)]">
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                  <Calendar size={14} className="text-[var(--color-brand-primary)]" />
                  <span>تاريخ التسجيل:</span>
                </div>
                <span className="text-[var(--color-text-secondary)]" data-testid="student-created-at">
                  {formatDate(student.createdAt)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Financial & Notes Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'finance'}
              onClick={() => setActiveTab('finance')}
              className={`px-4 py-2 text-xs font-semibold rounded-[var(--radius-md)] transition-colors ${
                activeTab === 'finance'
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)]'
              }`}
              data-testid="profile-tab-finance"
            >
              السجل المالي والاشتراكات
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'notes'}
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-xs font-semibold rounded-[var(--radius-md)] transition-colors ${
                activeTab === 'notes'
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)]'
              }`}
              data-testid="profile-tab-notes"
            >
              الملاحظات والمتابعة
            </button>
          </div>

          <Card variant="default" className="p-4">
            {activeTab === 'finance' ? (
              <StudentFinancialView
                studentId={student.id}
                studentName={student.fullName}
                canWrite={canWrite}
              />
            ) : (
              <StudentNotesView studentId={student.id} canWrite={canWrite} />
            )}
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      {canWrite && (
        <StudentCreateModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialStudent={student}
        />
      )}

      {/* Student Card Preview & Print Modal */}
      {student && (
        <StudentCardPreviewModal
          isOpen={isCardPreviewOpen}
          onClose={() => setIsCardPreviewOpen(false)}
          students={[student]}
        />
      )}
    </div>
  );
}
