import { useState } from 'react';
import { Card, Button, Badge, Select, Input } from '@tibyan/design-system';
import {
  useCurriculumLibraryList,
  useCurriculumLibraryGrouped,
  useDeleteCurriculumLibrary,
} from '../../hooks/useCurriculumLibrary.js';
import {
  BookMarked,
  Plus,
  FileText,
  Trash2,
  ExternalLink,
  Search,
  BookOpen,
  Layers,
} from 'lucide-react';

const GRADE_SYSTEMS = [
  { value: '', label: 'جميع الأنظمة' },
  { value: 'EGYPT_PRIMARY', label: 'المرحلة الابتدائية (مصر)' },
  { value: 'EGYPT_PREP', label: 'المرحلة الإعدادية (مصر)' },
  { value: 'EGYPT_SECONDARY', label: 'المرحلة الثانوية (مصر)' },
  { value: 'SAUDI_PRIMARY', label: 'المرحلة الابتدائية (السعودية)' },
  { value: 'SAUDI_INTERMEDIATE', label: 'المرحلة المتوسطة (السعودية)' },
  { value: 'SAUDI_SECONDARY', label: 'المرحلة الثانوية (السعودية)' },
];

const EDUCATION_SYSTEMS = [
  { value: '', label: 'جميع المناهج' },
  { value: 'EGYPTIAN', label: 'المنهج المصري' },
  { value: 'SAUDI', label: 'المنهج السعودي' },
  { value: 'IB', label: 'البرنامج الدولي' },
  { value: 'AMERICAN', label: 'المنهج الأمريكي' },
];

export function CurriculumLibraryPage() {
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterEducation, setFilterEducation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documents, isLoading: listLoading } = useCurriculumLibraryList(
    filterSystem || filterEducation
      ? {
          gradeLevel: filterSystem || undefined,
          educationSystem: filterEducation || undefined,
        }
      : undefined
  );
  const { data: grouped, isLoading: groupedLoading } = useCurriculumLibraryGrouped();
  const deleteMutation = useDeleteCurriculumLibrary();

  const isLoading = viewMode === 'grouped' ? groupedLoading : listLoading;

  const filteredDocuments = (documents || []).filter((doc) =>
    searchQuery
      ? doc.title.includes(searchQuery) ||
        doc.subject?.includes(searchQuery) ||
        doc.description?.includes(searchQuery)
      : true
  );

  const handleImport = async () => {
    // TODO: Open file dialog via Electron
    // For now, this is a placeholder
  };

  const handleDelete = async (doc: { id: string; title: string }) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${doc.title}" من المكتبة؟`)) return;
    try {
      await deleteMutation.mutateAsync(doc.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'فشل حذف الوثيقة');
    }
  };

  const handleViewPdf = async (id: string) => {
    if (window.tibyan?.curriculumLibrary?.openExternal) {
      await window.tibyan.curriculumLibrary.openExternal(id);
    }
  };

  return (
    <div className="space-y-4" data-testid="page-curriculum-library">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-[var(--color-brand-primary)]" />
            مكتبة المناهج
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            كتبي鲤ي загруженных PDF-مناهج حسب المرحلة
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleImport} data-testid="btn-import-curriculum">
          <Plus className="w-4 h-4 ml-1" />
          استيراد PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--color-bg-elevated)] rounded-lg p-2">
          <Button
            variant={viewMode === 'grouped' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grouped')}
          >
            <Layers className="w-4 h-4 ml-1" />
            حسب المرحلة
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <FileText className="w-4 h-4 ml-1" />
            قائمة
          </Button>
        </div>

        <Select
          value={filterSystem}
          onChange={(e) => setFilterSystem(e.target.value)}
          options={GRADE_SYSTEMS}
          className="w-48"
          aria-label="المرحلة الدراسية"
        />
        <Select
          value={filterEducation}
          onChange={(e) => setFilterEducation(e.target.value)}
          options={EDUCATION_SYSTEMS}
          className="w-40"
          aria-label="المنهج"
        />
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في العناوين..."
            className="pr-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
        </div>
      ) : viewMode === 'grouped' ? (
        <GroupedView grouped={grouped || []} onDelete={handleDelete} onViewPdf={handleViewPdf} />
      ) : (
        <ListView documents={filteredDocuments} onDelete={handleDelete} onViewPdf={handleViewPdf} />
      )}
    </div>
  );
}

function GroupedView({
  grouped,
  onDelete,
  onViewPdf,
}: {
  grouped: { gradeLevel: string | null; educationSystem: string | null; documents: any[]; count: number }[];
  onDelete: (doc: { id: string; title: string }) => void;
  onViewPdf: (id: string) => void;
}) {
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);

  if (grouped.length === 0) {
    return (
      <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
        <BookMarked className="w-10 h-10 mx-auto opacity-40" />
        <p className="text-sm">لا توجد وثائق في المكتبة بعد</p>
        <p className="text-xs">ابدأ باستيراد ملفات PDF للمناهج الدراسية</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map((group) => {
        const key = `${group.gradeLevel || 'unknown'}-${group.educationSystem || 'unknown'}`;
        const isExpanded = expandedGrade === key;
        return (
          <Card key={key} variant="default" className="overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-[var(--color-bg-elevated)] transition-colors"
              onClick={() => setExpandedGrade(isExpanded ? null : key)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-brand-primary)]" />
                <span className="font-medium text-sm text-[var(--color-text-primary)]">
                  {group.gradeLevel || 'غير محدد'}
                </span>
                {group.educationSystem && (
                  <Badge variant="neutral" size="sm">{group.educationSystem}</Badge>
                )}
              </div>
              <Badge variant="primary" size="sm">{group.count}</Badge>
            </button>
            {isExpanded && (
              <div className="border-t border-[var(--color-border-subtle)] divide-y divide-[var(--color-border-subtle)]">
                {group.documents.map((doc: any) => (
                  <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} onViewPdf={onViewPdf} />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ListView({
  documents,
  onDelete,
  onViewPdf,
}: {
  documents: any[];
  onDelete: (doc: { id: string; title: string }) => void;
  onViewPdf: (id: string) => void;
}) {
  if (documents.length === 0) {
    return (
      <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
        <BookMarked className="w-10 h-10 mx-auto opacity-40" />
        <p className="text-sm">لا توجد وثائق مطابقة</p>
      </Card>
    );
  }

  return (
    <Card variant="default" className="divide-y divide-[var(--color-border-subtle)]">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} onViewPdf={onViewPdf} />
      ))}
    </Card>
  );
}

function DocumentRow({
  doc,
  onDelete,
  onViewPdf,
}: {
  doc: any;
  onDelete: (doc: { id: string; title: string }) => void;
  onViewPdf: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[var(--color-bg-elevated)] transition-colors">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-[var(--color-brand-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {doc.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-0.5">
          {doc.gradeLevel && <Badge variant="neutral" size="sm">{doc.gradeLevel}</Badge>}
          {doc.subject && <span>{doc.subject}</span>}
          {doc.pageCount && <span>{doc.pageCount} صفحة</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewPdf(doc.id)}
          title="فتح الملف"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(doc)}
          title="حذف"
          className="text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)]"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
