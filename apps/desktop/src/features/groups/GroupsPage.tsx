import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@tibyan/design-system';
import { Plus, BookOpen, Clock, Users, AlertCircle, ChevronLeft, GraduationCap } from 'lucide-react';
import { useGroupsList } from '../../hooks/useGroups.js';
import { useAuth } from '../../hooks/useAuth.js';
import { GroupCreateModal, WEEKDAY_LABELS } from './GroupCreateModal.js';

export function GroupsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const isOwner = session?.role === 'OWNER';
  const canWrite = isOwner || session?.permissions?.includes('GROUPS_WRITE');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSystem, setFilterSystem] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterTrack, setFilterTrack] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    data: groups = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGroupsList();

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      // Name Search
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!group.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Education System Filter
      if (filterSystem !== 'ALL' && group.educationSystem !== filterSystem) {
        return false;
      }

      // Grade Level Filter
      if (filterGrade !== 'ALL' && group.gradeLevel !== filterGrade) {
        return false;
      }

      // Language Track Filter
      if (filterTrack !== 'ALL' && group.languageTrack !== filterTrack) {
        return false;
      }

      // Status Filter
      if (filterStatus !== 'ALL' && group.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [groups, searchQuery, filterSystem, filterGrade, filterTrack, filterStatus]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterSystem('ALL');
    setFilterGrade('ALL');
    setFilterTrack('ALL');
    setFilterStatus('ALL');
  };

  return (
    <div className="space-y-6" data-testid="page-groups">
      {/* Professional Page Header: Title + Subtitle on Right, Primary CTA on Left in Same Row */}
      <div className="flex flex-row items-center justify-between gap-6 pb-6 border-b border-[var(--color-border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] dark:bg-[#5CE1E6]/10 dark:text-[#5CE1E6] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 stroke-[2]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight" data-testid="heading-groups">
              المجموعات الدراسية
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            إدارة المجموعات، الجداول الأسبوعية الدورية، قيد الطلاب، والمصروفات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/curriculum')}
            className="gap-2 shrink-0 font-semibold text-sm px-4 py-2"
            data-testid="btn-manage-curriculum"
          >
            <GraduationCap className="w-4 h-4 text-[var(--color-brand-primary)]" />
            <span>إدارة المناهج</span>
          </Button>

          {canWrite && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 shrink-0 shadow-sm hover:shadow font-semibold text-sm px-4 py-2"
              data-testid="btn-create-group"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مجموعة جديدة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Compact Working Toolbar: Search takes primary flex width, filters progressively sized */}
      <div
        className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-2.5 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3"
        data-testid="filter-card"
      >
        {/* Search Input */}
        <div className="flex-1 min-w-[240px]">
          <Input
            placeholder="البحث باسم المجموعة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs"
            data-testid="input-search-groups"
          />
        </div>

        {/* System */}
        <div className="w-36 shrink-0">
          <Select
            aria-label="تصفية بنظام التعليم"
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
            options={[
              { value: 'ALL', label: 'جميع الأنظمة' },
              { value: 'GENERAL', label: 'التعليم العام' },
              { value: 'EGYPTIAN_BACCALAUREATE', label: 'البكالوريا' },
            ]}
            data-testid="select-filter-system"
          />
        </div>

        {/* Grade */}
        <div className="w-36 shrink-0">
          <Select
            aria-label="تصفية بالمرحلة الدراسية"
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            options={[
              { value: 'ALL', label: 'جميع المراحل' },
              { value: 'PREP_1', label: 'أولى إعدادي' },
              { value: 'PREP_2', label: 'تانية إعدادي' },
              { value: 'PREP_3', label: 'تالتة إعدادي' },
              { value: 'SEC_1', label: 'أولى ثانوي' },
              { value: 'SEC_2', label: 'تانية ثانوي' },
              { value: 'SEC_3', label: 'تالتة ثانوي' },
            ]}
            data-testid="select-filter-grade"
          />
        </div>

        {/* Track */}
        <div className="w-32 shrink-0">
          <Select
            aria-label="تصفية بالمسار اللغوي"
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            options={[
              { value: 'ALL', label: 'جميع المسارات' },
              { value: 'ARABIC', label: 'عربي' },
              { value: 'LANG_ENGLISH', label: 'لغات' },
            ]}
            data-testid="select-filter-track"
          />
        </div>

        {/* Status */}
        <div className="w-28 shrink-0">
          <Select
            aria-label="تصفية بالحالة"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'ALL', label: 'الكل' },
              { value: 'ACTIVE', label: 'النشطة' },
              { value: 'ARCHIVED', label: 'المؤرشفة' },
            ]}
            data-testid="select-filter-status"
          />
        </div>

        {(searchQuery.trim() !== '' || filterSystem !== 'ALL' || filterGrade !== 'ALL' || filterTrack !== 'ALL' || filterStatus !== 'ACTIVE') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-status-danger)] shrink-0"
            data-testid="btn-reset-filters"
          >
            إعادة ضبط
          </Button>
        )}
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="p-12 text-center text-[var(--color-text-secondary)] space-y-3" data-testid="groups-loading">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent mx-auto" />
          <p className="text-sm">جاري تحميل المجموعات الدراسية...</p>
        </div>
      ) : isError ? (
        <div className="max-w-md mx-auto my-8 p-6 text-center space-y-3 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-xs" data-testid="groups-error">
          <AlertCircle className="w-8 h-8 text-[var(--color-status-danger)] mx-auto" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {error instanceof Error ? error.message : 'فشل استرجاع قائمة المجموعات'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} data-testid="btn-retry-groups">
            إعادة المحاولة
          </Button>
        </div>
      ) : groups.length === 0 ? (
        /* Redesigned Centered Empty State: Proportioned container with no oversized empty box */
        <div
          className="max-w-xl mx-auto my-12 p-8 sm:p-10 text-center space-y-5 rounded-2xl bg-[var(--color-bg-surface)]/70 border border-[var(--color-border-subtle)] shadow-xs"
          data-testid="groups-empty"
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary)]/10 dark:bg-[#5CE1E6]/10 text-[var(--color-brand-primary)] dark:text-[#5CE1E6] flex items-center justify-center mx-auto border border-[var(--color-brand-primary)]/15 shadow-xs">
            <BookOpen className="w-8 h-8 stroke-[1.75]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              لا توجد مجموعات بعد
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
              ابدأ بإنشاء أول مجموعة دراسية وتحديد مواعيد حصصها الأسبوعية ومصروفاتها الافتراضية.
            </p>
          </div>
          {canWrite && (
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-1.5 font-medium"
                data-testid="btn-empty-create-group"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء أول مجموعة</span>
              </Button>
            </div>
          )}
        </div>
      ) : filteredGroups.length === 0 ? (
        /* Filtered Empty State */
        <div
          className="max-w-md mx-auto my-10 p-6 text-center space-y-3 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-xs"
          data-testid="groups-filtered-empty"
        >
          <p className="text-sm text-[var(--color-text-secondary)]">
            لا توجد مجموعات تطابق معايير البحث والتصفية المحددة.
          </p>
          <Button variant="secondary" size="sm" onClick={handleResetFilters} data-testid="btn-reset-filters">
            إعادة ضبط الفلاتر
          </Button>
        </div>
      ) : (
        /* High Density Table using full available workspace width */
        <Table data-testid="table-groups">
          <TableHeader>
            <TableRow>
              <TableHead>اسم المجموعة</TableHead>
              <TableHead>المرحلة والنظام</TableHead>
              <TableHead>المسار اللغوي</TableHead>
              <TableHead>المواعيد الأسبوعية</TableHead>
              <TableHead>المصروفات الافتراضية</TableHead>
              <TableHead>الطلاب المقيدين</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.map((group) => (
              <TableRow
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="cursor-pointer hover:bg-[var(--color-bg-surface-subtle)]/70 transition-colors"
                data-testid={`group-row-${group.id}`}
              >
                {/* Name & Math Branch */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--color-text-primary)] hover:text-[var(--color-brand-primary)] transition-colors">
                      {group.name}
                    </span>
                    {group.focusMathBranch && (
                      <span className="text-[11px] text-[var(--color-brand-primary)] dark:text-[#5CE1E6] font-medium">
                        فرع: {group.focusMathBranch}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* System & Grade */}
                <TableCell>
                  <div className="flex flex-col text-xs">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {group.gradeLevel}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {group.educationSystem === 'GENERAL' ? 'التعليم العام' : 'البكالوريا المصرية'}
                    </span>
                  </div>
                </TableCell>

                {/* Language Track */}
                <TableCell>
                  <Badge variant="neutral" size="sm">
                    {group.languageTrack === 'ARABIC' ? 'عربي' : 'لغات'}
                  </Badge>
                </TableCell>

                {/* Schedules */}
                <TableCell>
                  {group.schedules.length === 0 ? (
                    <span className="text-[11px] text-[var(--color-text-muted)]">بدون مواعيد</span>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {group.schedules.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] font-medium"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{WEEKDAY_LABELS[s.weekday]}</span>
                          <span dir="ltr">{s.startTime}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>

                {/* Payment Defaults */}
                <TableCell>
                  <div className="flex items-center gap-1 text-xs">
                    <span dir="ltr" className="font-bold text-[var(--color-text-primary)]">
                      {group.defaultPaymentAmount} ج.م
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      ({group.defaultPaymentType === 'MONTHLY' ? 'شهرياً' : 'بالحصة'})
                    </span>
                  </div>
                </TableCell>

                {/* Student Count */}
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-primary)] font-semibold">
                    <Users className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    <span>{group.enrolledCount ?? 0} طالب</span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge
                    variant={group.status === 'ACTIVE' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {group.status === 'ACTIVE' ? 'نشطة' : 'مؤرشفة'}
                  </Badge>
                </TableCell>

                {/* Chevron */}
                <TableCell className="text-end">
                  <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)] inline-block" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <GroupCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
