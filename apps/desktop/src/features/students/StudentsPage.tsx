import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Users,
  ChevronLeft,
  X,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Upload,
} from 'lucide-react';
import {
  Card,
  Input,
  Select,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@tibyan/design-system';
import type {
  StudentDto,
  EducationSystem,
  GradeLevel,
  LanguageTrack,
  StudentStatus,
  StudentFilterInput,
} from '@tibyan/contracts';
import { useStudentsList } from '../../hooks/useStudents.js';
import { invalidateDashboardQueries } from '../../hooks/useDashboard.js';
import { useAuth } from '../../hooks/useAuth.js';
import { StudentCreateModal } from './StudentCreateModal.js';
import { StudentCardPreviewModal } from './cards/StudentCardPreviewModal.js';
import { StudentImportModal } from './StudentImportModal.js';
import { ContextualDynamicIsland } from '../../components/layout/ContextualDynamicIsland.js';
import { Filter, List } from 'lucide-react';

const SYSTEM_OPTIONS = [
  { value: '', label: 'جميع الأنظمة' },
  { value: 'GENERAL', label: 'التعليم العام' },
  { value: 'EGYPTIAN_BACCALAUREATE', label: 'البكالوريا المصرية' },
];

const GRADE_OPTIONS = [
  { value: '', label: 'جميع المراحل' },
  { value: 'PREP_1', label: 'أولى إعدادي' },
  { value: 'PREP_2', label: 'تانية إعدادي' },
  { value: 'PREP_3', label: 'تالتة إعدادي' },
  { value: 'SEC_1', label: 'أولى ثانوي' },
  { value: 'SEC_2', label: 'تانية ثانوي' },
  { value: 'SEC_3', label: 'تالتة ثانوي' },
];

const TRACK_OPTIONS = [
  { value: '', label: 'جميع المسارات' },
  { value: 'ARABIC', label: 'عربي' },
  { value: 'LANG_ENGLISH', label: 'لغات (إنجليزي)' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'جميع الحالات' },
  { value: 'ACTIVE', label: 'النشطين فقط' },
  { value: 'INACTIVE', label: 'غير النشطين' },
];

const GRADE_LABELS: Record<string, string> = {
  PREP_1: 'أولى إعدادي',
  PREP_2: 'تانية إعدادي',
  PREP_3: 'تالتة إعدادي',
  SEC_1: 'أولى ثانوي',
  SEC_2: 'تانية ثانوي',
  SEC_3: 'تالتة ثانوي',
};

const SYSTEM_LABELS: Record<string, string> = {
  GENERAL: 'عام',
  EGYPTIAN_BACCALAUREATE: 'بكالوريا',
};

const TRACK_LABELS: Record<string, string> = {
  ARABIC: 'عربي',
  LANG_ENGLISH: 'لغات',
};

export function StudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canWrite = session?.role === 'OWNER' || session?.permissions?.includes('STUDENTS_WRITE');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [educationSystem, setEducationSystem] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<string>('');
  const [languageTrack, setLanguageTrack] = useState<string>('');
  const [status, setStatus] = useState<string>('ACTIVE');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [cardPreviewStudents, setCardPreviewStudents] = useState<StudentDto[]>([]);
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);

  // Construct typed filter input
  const filterInput: StudentFilterInput = useMemo(() => {
    const res: StudentFilterInput = {};
    if (searchQuery.trim()) res.searchQuery = searchQuery.trim();
    if (educationSystem) res.educationSystem = educationSystem as EducationSystem;
    if (gradeLevel) res.gradeLevel = gradeLevel as GradeLevel;
    if (languageTrack) res.languageTrack = languageTrack as LanguageTrack;
    if (status) res.status = status as StudentStatus;
    return res;
  }, [searchQuery, educationSystem, gradeLevel, languageTrack, status]);

  const { data: students = [], isLoading, error, refetch } = useStudentsList(filterInput);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || educationSystem || gradeLevel || languageTrack || (status && status !== 'ACTIVE')
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setEducationSystem('');
    setGradeLevel('');
    setLanguageTrack('');
    setStatus('ACTIVE');
  };

  const toggleSelectStudent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length && students.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const handleOpenBatchCards = () => {
    const selected = students.filter((s) => selectedStudentIds.has(s.id));
    if (selected.length > 0) {
      setCardPreviewStudents(selected);
      setIsCardPreviewOpen(true);
    }
  };

  const handleOpenAllCards = () => {
    if (students.length > 0) {
      setCardPreviewStudents(students);
      setIsCardPreviewOpen(true);
    }
  };

  const handleOpenSingleCard = (student: StudentDto, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardPreviewStudents([student]);
    setIsCardPreviewOpen(true);
  };

  const islandActions = [
    {
      id: 'student-list',
      label: 'قائمة الطلاب',
      icon: List,
      active: true,
      badge: students.length,
      onClick: () => {},
    },
    ...(canWrite
      ? [
          {
            id: 'add-student',
            label: 'إضافة طالب',
            icon: UserPlus,
            onClick: () => setIsCreateModalOpen(true),
          },
          {
            id: 'import-students',
            label: 'استيراد طلاب',
            icon: Upload,
            onClick: () => setIsImportModalOpen(true),
          },
        ]
      : []),
    {
      id: 'print-cards',
      label: 'طباعة البطاقات',
      icon: CreditCard,
      onClick: () => handleOpenAllCards(),
    },
    {
      id: 'filters',
      label: 'فلاتر',
      icon: Filter,
      onClick: () => {
        const el = document.getElementById('students-filter-bar');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  return (
    <div className="space-y-4" data-testid="page-students">
      {/* Layer 3: Contextual Dynamic Island */}
      <ContextualDynamicIsland title="شؤون الطلاب" actions={islandActions} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">إدارة الطلاب</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            سجل بيانات الطلاب ومتابعة مستواهم الأكاديمي وسجل الملاحظات
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedStudentIds.size > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenBatchCards}
              data-testid="batch-print-cards-btn"
            >
              <CreditCard size={15} className="me-1.5 text-[var(--color-brand-primary)]" />
              طباعة بطاقات ({selectedStudentIds.size})
            </Button>
          )}

          {students.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenAllCards}
              data-testid="print-all-cards-btn"
            >
              <CreditCard size={15} className="me-1.5 text-[var(--color-brand-primary)]" />
              طباعة كل البطاقات
            </Button>
          )}

          {canWrite && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
                data-testid="import-students-btn"
              >
                <Upload size={16} className="me-1.5 text-[var(--color-brand-primary)]" />
                استيراد طلاب
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                data-testid="add-student-btn"
              >
                <UserPlus size={16} className="me-1.5" />
                إضافة طالب جديد
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card variant="default" className="p-3.5 space-y-3" data-testid="students-filter-bar">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Search Query */}
          <div className="lg:col-span-1">
            <Input
              placeholder="بحث بالاسم أو الكود أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
              data-testid="filter-search-input"
            />
          </div>

          {/* System */}
          <Select
            options={SYSTEM_OPTIONS}
            value={educationSystem}
            onChange={(e) => setEducationSystem(e.target.value)}
            data-testid="filter-system-select"
          />

          {/* Grade */}
          <Select
            options={GRADE_OPTIONS}
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            data-testid="filter-grade-select"
          />

          {/* Track */}
          <Select
            options={TRACK_OPTIONS}
            value={languageTrack}
            onChange={(e) => setLanguageTrack(e.target.value)}
            data-testid="filter-track-select"
          />

          {/* Status */}
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="filter-status-select"
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-border-subtle)]">
            <span className="text-[var(--color-text-muted)]">
              نتائج البحث المصفاة: {students.length} طالب
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              data-testid="reset-filters-btn"
            >
              <X size={14} className="me-1" />
              إعادة تعيين الفلاتر
            </Button>
          </div>
        )}
      </Card>

      {/* Error State */}
      {error && (
        <Card variant="subtle" className="p-6 text-center space-y-3" data-testid="students-error-state">
          <div className="w-10 h-10 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">تعذر تحميل بيانات الطلاب</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
            {(error as Error)?.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات المحلية.'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} data-testid="retry-students-btn">
            <RefreshCw size={14} className="me-1" />
            إعادة المحاولة
          </Button>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card variant="default" className="p-12 text-center text-xs text-[var(--color-text-muted)]" data-testid="students-loading">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
            <span>جاري تحميل بيانات الطلاب...</span>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && students.length === 0 && (
        <Card variant="default" className="p-12 text-center space-y-3" data-testid="students-empty-state">
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)] flex items-center justify-center mx-auto">
            <Users size={24} />
          </div>
          {hasActiveFilters ? (
            <>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                لم يتم العثور على نتائج تطابق معايير البحث
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                جرب تغيير خيارات التصفية أو البحث عن اسم أو كود آخر.
              </p>
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  إعادة تعيين الفلاتر
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                لا يوجد طلاب مسجلون حالياً
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
                ابدأ بتسجيل أول طالب في النظام لتتمكن من إضافته إلى المجموعات وتتبع حضوره وملاحظاته.
              </p>
              {canWrite && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <UserPlus size={16} className="me-1.5" />
                    إضافة طالب جديد
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Directory Table */}
      {!isLoading && !error && students.length > 0 && (
        <div className="space-y-2">
          <Table data-testid="students-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedStudentIds.size === students.length}
                    onChange={toggleSelectAll}
                    aria-label="تحديد جميع الطلاب"
                    className="rounded border-slate-400 text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)] cursor-pointer"
                    data-testid="select-all-students-checkbox"
                  />
                </TableHead>
                <TableHead className="w-28">كود الطالب</TableHead>
                <TableHead>اسم الطالب</TableHead>
                <TableHead>النظام</TableHead>
                <TableHead>المرحلة</TableHead>
                <TableHead>المسار</TableHead>
                <TableHead>هاتف ولي الأمر</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-28 text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student: StudentDto) => (
                <TableRow
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="cursor-pointer hover:bg-[var(--color-bg-surface-subtle)] transition-colors"
                  data-testid={`student-row-${student.id}`}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={(e) => toggleSelectStudent(student.id, e as any)}
                      aria-label={`تحديد ${student.fullName}`}
                      className="rounded border-slate-400 text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)] cursor-pointer"
                      data-testid={`select-student-checkbox-${student.id}`}
                    />
                  </TableCell>

                  <TableCell>
                    <span
                      className="font-mono text-xs font-semibold text-[var(--color-brand-primary)]"
                      dir="ltr"
                      data-testid={`student-code-${student.id}`}
                    >
                      {student.studentCode}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold text-sm text-[var(--color-text-primary)]" data-testid={`student-name-${student.id}`}>
                      {student.fullName}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={student.educationSystem === 'EGYPTIAN_BACCALAUREATE' ? 'accent' : 'neutral'}
                      size="sm"
                      data-testid={`student-system-${student.id}`}
                    >
                      {SYSTEM_LABELS[student.educationSystem] || student.educationSystem}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {GRADE_LABELS[student.gradeLevel] || student.gradeLevel}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {TRACK_LABELS[student.languageTrack] || student.languageTrack}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span
                      className="font-mono text-xs text-[var(--color-text-secondary)]"
                      dir="ltr"
                      data-testid={`student-phone-${student.id}`}
                    >
                      {student.guardianPhone}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={student.status === 'ACTIVE' ? 'success' : 'warning'}
                      size="sm"
                      dot
                      data-testid={`student-status-${student.id}`}
                    >
                      {student.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleOpenSingleCard(student, e)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)]"
                        aria-label="طباعة بطاقة الطالب"
                        title="طباعة بطاقة الطالب"
                        data-testid={`print-card-btn-${student.id}`}
                      >
                        <CreditCard size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/students/${student.id}`);
                        }}
                        className="p-1.5"
                        aria-label="عرض ملف الطالب"
                        title="عرض ملف الطالب"
                        data-testid={`view-student-${student.id}`}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="p-2 text-xs text-[var(--color-text-muted)] flex items-center justify-between">
            <span>إجمالي الطلاب: {students.length}</span>
            {selectedStudentIds.size > 0 && (
              <span className="text-[var(--color-brand-primary)] font-semibold">
                محدد للطباعة: {selectedStudentIds.size}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {canWrite && (
        <StudentCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newStudent) => {
            navigate(`/students/${newStudent.id}`);
          }}
        />
      )}

      {/* Student Card Preview & Print Modal */}
      <StudentCardPreviewModal
        isOpen={isCardPreviewOpen}
        onClose={() => setIsCardPreviewOpen(false)}
        students={cardPreviewStudents}
      />

      {/* Student Bulk Import Modal */}
      {canWrite && (
        <StudentImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            refetch();
            void invalidateDashboardQueries(queryClient);
          }}
        />
      )}
    </div>
  );
}
