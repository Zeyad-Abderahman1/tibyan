import { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
} from '@tibyan/design-system';
import {
  GraduationCap,
  Plus,
  BookOpen,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import type {
  CurriculumCatalogDto,
  EducationSystem,
  GradeLevel,
  LanguageTrack,
  CurriculumCatalogStatus,
} from '@tibyan/contracts';
import {
  useCurriculumCatalogs,
  usePublishCatalog,
  useReviseCatalog,
} from '../../hooks/useCurriculum.js';
import { useAuth } from '../../hooks/useAuth.js';
import { CreateCatalogModal } from './CreateCatalogModal.js';
import { CurriculumTreeView } from './CurriculumTreeView.js';

export function CurriculumCatalogsPage() {
  const { session } = useAuth();
  const isOwner = session?.role === 'OWNER';
  const canWrite = isOwner || session?.permissions?.includes('GROUPS_WRITE');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSystem, setFilterSystem] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterTrack, setFilterTrack] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Selected catalog for tree view
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filterParam = useMemo(() => {
    return {
      educationSystem: filterSystem !== 'ALL' ? (filterSystem as EducationSystem) : undefined,
      gradeLevel: filterGrade !== 'ALL' ? (filterGrade as GradeLevel) : undefined,
      languageTrack: filterTrack !== 'ALL' ? (filterTrack as LanguageTrack) : undefined,
      status: filterStatus !== 'ALL' ? (filterStatus as CurriculumCatalogStatus) : undefined,
      search: searchQuery.trim() || undefined,
    };
  }, [filterSystem, filterGrade, filterTrack, filterStatus, searchQuery]);

  const { data: catalogs = [], isLoading } = useCurriculumCatalogs(filterParam);

  const publishMutation = usePublishCatalog();
  const reviseMutation = useReviseCatalog();

  const selectedCatalog = useMemo(() => {
    if (!selectedCatalogId && catalogs.length > 0) {
      return catalogs[0];
    }
    return catalogs.find((c) => c.id === selectedCatalogId) || (catalogs[0] ?? null);
  }, [catalogs, selectedCatalogId]);

  const handlePublish = async (catalog: CurriculumCatalogDto) => {
    if (
      !window.confirm(
        `هل أنت متأكد من نشر المنهج "${catalog.title}" (الإصدار ${catalog.version})؟\n\nبمجرد النشر، سيصبح هذا الإصدار غير قابل للتعديل المباشر لحماية خطط المجموعات المرتبطة به، ويمكنك إنشاء إصدار مراجعة جديد لاحقاً.`
      )
    ) {
      return;
    }
    try {
      await publishMutation.mutateAsync(catalog.id);
    } catch (err: any) {
      alert(err.message || 'فشل نشر المنهج');
    }
  };

  const handleRevise = async (catalog: CurriculumCatalogDto) => {
    if (
      !window.confirm(
        `سيتم إنشاء نسخة مسودة جديدة (الإصدار ${catalog.version + 1}) مستنسخة من "${catalog.title}". هل تريد المتابعة؟`
      )
    ) {
      return;
    }
    try {
      const newRev = await reviseMutation.mutateAsync(catalog.id);
      setSelectedCatalogId(newRev.id);
    } catch (err: any) {
      alert(err.message || 'فشل إصدار نسخة جديدة');
    }
  };

  return (
    <div className="space-y-6" data-testid="page-curriculum">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-6 pb-6 border-b border-[var(--color-border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] dark:bg-[#5CE1E6]/10 dark:text-[#5CE1E6] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 stroke-[2]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight" data-testid="heading-curriculum">
              إدارة المناهج وفهارس المعرفة
            </h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            بناء وتوثيق شجرة المناهج (وحدات • دروس • مفاهيم • مهارات) وإصدار النسخ المعتمدة لربطها بالمجموعات
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canWrite && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 shrink-0 shadow-sm hover:shadow font-semibold text-sm px-4 py-2"
              data-testid="btn-create-catalog"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة منهج جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl p-2.5 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3"
        data-testid="curriculum-filter-toolbar"
      >
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="البحث باسم المنهج أو الكود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs"
            data-testid="input-search-curriculum"
          />
        </div>

        <div className="w-36 shrink-0">
          <Select
            aria-label="تصفية بالنظام"
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
            options={[
              { value: 'ALL', label: 'جميع الأنظمة' },
              { value: 'GENERAL', label: 'التعليم العام' },
              { value: 'EGYPTIAN_BACCALAUREATE', label: 'البكالوريا' },
            ]}
            data-testid="select-curriculum-system"
          />
        </div>

        <div className="w-36 shrink-0">
          <Select
            aria-label="تصفية بالمرحلة"
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
            data-testid="select-curriculum-grade"
          />
        </div>

        <div className="w-32 shrink-0">
          <Select
            aria-label="تصفية بالمسار"
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            options={[
              { value: 'ALL', label: 'جميع المسارات' },
              { value: 'ARABIC', label: 'عربي' },
              { value: 'LANG_ENGLISH', label: 'لغات' },
            ]}
            data-testid="select-curriculum-track"
          />
        </div>

        <div className="w-32 shrink-0">
          <Select
            aria-label="تصفية بالحالة"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'ALL', label: 'جميع الحالات' },
              { value: 'DRAFT', label: 'مسودة (DRAFT)' },
              { value: 'PUBLISHED', label: 'منشور (PUBLISHED)' },
              { value: 'ARCHIVED', label: 'مؤرشف' },
            ]}
            data-testid="select-curriculum-status"
          />
        </div>
      </div>

      {/* Main Master-Detail Layout */}
      {isLoading ? (
        <Card variant="default" className="p-12 text-center text-xs text-[var(--color-text-muted)]">
          جاري تحميل فهارس المناهج...
        </Card>
      ) : catalogs.length === 0 ? (
        <Card variant="default" className="p-12 text-center space-y-3" data-testid="empty-curriculum-state">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">لا توجد مناهج مطابقة للبحث</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
            قم بإنشاء منهج جديد لتحديد الوحدات والدروس والمهارات الخاصة بكل صف دراسي ومسار لغوي.
          </p>
          {canWrite && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول منهج</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Master: Catalogs List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              فهارس المناهج ({catalogs.length})
            </h2>

            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
              {catalogs.map((catalog) => {
                const isSelected = selectedCatalog?.id === catalog.id;
                const isDraft = catalog.status === 'DRAFT';

                return (
                  <div
                    key={catalog.id}
                    onClick={() => setSelectedCatalogId(catalog.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--color-bg-surface-elevated)] border-[var(--color-brand-primary)] shadow-sm'
                        : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-bold)]'
                    }`}
                    data-testid={`catalog-card-${catalog.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                        {catalog.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={isDraft ? 'warning' : 'success'} size="sm">
                          {isDraft ? `مسودة v${catalog.version}` : `معتمد v${catalog.version}`}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] font-mono mb-2" dir="ltr">
                      <span>{catalog.code}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                      <span className="px-2 py-0.5 rounded bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)]">
                        {catalog.gradeLevel}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)]">
                        {catalog.languageTrack === 'ARABIC' ? 'عربي' : 'لغات'}
                      </span>
                      {catalog.mathBranch && (
                        <span className="px-2 py-0.5 rounded bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-brand-primary)]">
                          {catalog.mathBranch}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right / Detail: Selected Catalog Details & Tree (8 cols) */}
          {selectedCatalog && (
            <div className="lg:col-span-8 space-y-4">
              <Card variant="default" className="p-5 space-y-4" data-testid="selected-catalog-header">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                        {selectedCatalog.title}
                      </h2>
                      <Badge variant={selectedCatalog.status === 'DRAFT' ? 'warning' : 'success'}>
                        {selectedCatalog.status === 'DRAFT' ? 'مسودة قيد التحرير' : 'منهج منشور ومعتمد'}
                      </Badge>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)]">
                        الإصدار {selectedCatalog.version}
                      </span>
                    </div>
                    {selectedCatalog.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {selectedCatalog.description}
                      </p>
                    )}
                  </div>

                  {canWrite && (
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedCatalog.status === 'DRAFT' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePublish(selectedCatalog)}
                          loading={publishMutation.isPending}
                          className="gap-1.5 text-xs"
                          data-testid="btn-publish-catalog"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>نشر واعتماد المنهج</span>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRevise(selectedCatalog)}
                          loading={reviseMutation.isPending}
                          className="gap-1.5 text-xs"
                          data-testid="btn-revise-catalog"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>إصدار نسخة مراجعة (v{selectedCatalog.version + 1})</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tree View inside Detail */}
                <CurriculumTreeView catalog={selectedCatalog} canWrite={Boolean(canWrite)} />
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateCatalogModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newId) => {
            setSelectedCatalogId(newId);
          }}
        />
      )}
    </div>
  );
}
