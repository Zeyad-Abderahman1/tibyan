import { useState, useCallback, useRef } from 'react';
import { Card, Button, Badge, Select, Input } from '@tibyan/design-system';
import {
  useCurriculumLibraryList,
  useCurriculumLibraryGrouped,
  useDeleteCurriculumLibrary,
} from '../../hooks/useCurriculumLibrary.js';
import {
  BookMarked,
  FileText,
  Trash2,
  ExternalLink,
  Search,
  BookOpen,
  Layers,
  Upload,
  Eye,
} from 'lucide-react';
import { PdfViewer } from './PdfViewer.js';
import { ImportDialog } from './ImportDialog.js';
import { ContextualDynamicIsland } from '../../components/layout/ContextualDynamicIsland.js';

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
  const [viewingPdfId, setViewingPdfId] = useState<string | null>(null);
  const [importDialogFile, setImportDialogFile] = useState<{ filePath: string; fileName: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading: listLoading, refetch: refetchList } = useCurriculumLibraryList(
    filterSystem || filterEducation
      ? { gradeLevel: filterSystem || undefined, educationSystem: filterEducation || undefined }
      : undefined
  );
  const { data: grouped, isLoading: groupedLoading, refetch: refetchGrouped } = useCurriculumLibraryGrouped();
  const deleteMutation = useDeleteCurriculumLibrary();

  const isLoading = viewMode === 'grouped' ? groupedLoading : listLoading;

  const filteredDocuments = (documents || []).filter((doc) =>
    searchQuery
      ? doc.title.includes(searchQuery) || doc.subject?.includes(searchQuery) || doc.description?.includes(searchQuery)
      : true
  );

  const handleBrowseImport = async () => {
    if (!window.tibyan?.curriculumLibrary?.browseAndImport) return;
    const result = await window.tibyan.curriculumLibrary.browseAndImport();
    if (result.success && result.data) {
      setImportDialogFile(result.data);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      // For Electron, we need the real file path from the main process
      // The renderer doesn't have direct access to file paths
      handleBrowseImport();
    }
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    // In Electron with contextIsolation, dropped files don't expose real paths
    // We need to use the native file dialog instead
    handleBrowseImport();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleConfirmImport = async (metadata: {
    title: string;
    gradeLevel: string;
    educationSystem: string;
    subject: string;
    description: string;
  }) => {
    if (!importDialogFile || !window.tibyan?.curriculumLibrary?.import) return;
    try {
      const result = await window.tibyan.curriculumLibrary.import({
        sourceFilePath: importDialogFile.filePath,
        title: metadata.title,
        gradeLevel: metadata.gradeLevel,
        educationSystem: metadata.educationSystem || undefined,
        subject: metadata.subject,
        description: metadata.description || undefined,
      });
      if (result.success) {
        setImportDialogFile(null);
        refetchList();
        refetchGrouped();
      } else {
        alert(result.error || 'فشل استيراد الملف');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل استيراد الملف');
    }
  };

  const handleDelete = async (doc: { id: string; title: string }) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${doc.title}" من المكتبة؟`)) return;
    try {
      await deleteMutation.mutateAsync(doc.id);
      refetchList();
      refetchGrouped();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'فشل حذف الوثيقة');
    }
  };

  const handleViewPdf = (id: string) => {
    setViewingPdfId(id);
  };

  const handleOpenExternal = async (id: string) => {
    if (window.tibyan?.curriculumLibrary?.openExternal) {
      await window.tibyan.curriculumLibrary.openExternal(id);
    }
  };

  if (viewingPdfId) {
    return <PdfViewer documentId={viewingPdfId} onClose={() => setViewingPdfId(null)} />;
  }

  const islandActions = [
    {
      id: 'library-view',
      label: 'المكتبة',
      icon: BookMarked,
      active: true,
      onClick: () => setViewMode('grouped'),
    },
    {
      id: 'import-pdf',
      label: 'استيراد PDF',
      icon: Upload,
      onClick: handleBrowseImport,
    },
    {
      id: 'by-grade',
      label: 'حسب الصف',
      icon: Layers,
      onClick: () => setViewMode('grouped'),
    },
    {
      id: 'by-subject',
      label: 'حسب المادة',
      icon: FileText,
      onClick: () => setViewMode('list'),
    },
    {
      id: 'search',
      label: 'بحث',
      icon: Search,
      onClick: () => {
        const input = document.querySelector('input[placeholder*="بحث"]') as HTMLInputElement;
        input?.focus();
      },
    },
  ];

  return (
    <div
      className="space-y-4"
      data-testid="page-curriculum-library"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Layer 3: Contextual Dynamic Island */}
      <ContextualDynamicIsland title="مكتبة المناهج" actions={islandActions} />
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Import Dialog */}
      {importDialogFile && (
        <ImportDialog
          fileName={importDialogFile.fileName}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportDialogFile(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-[var(--color-brand-primary)]" />
            مكتبة المناهج
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            استيراد وتنظيم وفتح ملفات المناهج حسب المرحلة الدراسية
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleBrowseImport} data-testid="btn-import-curriculum">
          <Upload className="w-4 h-4 ml-1" />
          استيراد ملف PDF
        </Button>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--color-brand-primary)]/10 backdrop-blur-sm border-2 border-dashed border-[var(--color-brand-primary)] rounded-2xl m-4" style={{ cursor: 'copy' }}>
          <div className="text-center space-y-2">
            <Upload className="w-12 h-12 mx-auto text-[var(--color-brand-primary)]" />
            <p className="text-lg font-bold text-[var(--color-brand-primary)]">أفلت ملف PDF هنا</p>
            <p className="text-sm text-[var(--color-text-secondary)]">سيتم فتح نافذة التصنيف بعد الاختيار</p>
          </div>
        </div>
      )}

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
        <GroupedView grouped={grouped || []} onDelete={handleDelete} onViewPdf={handleViewPdf} onOpenExternal={handleOpenExternal} />
      ) : (
        <ListView documents={filteredDocuments} onDelete={handleDelete} onViewPdf={handleViewPdf} onOpenExternal={handleOpenExternal} />
      )}
    </div>
  );
}

function GroupedView({
  grouped,
  onDelete,
  onViewPdf,
  onOpenExternal,
}: {
  grouped: { gradeLevel: string | null; educationSystem: string | null; documents: any[]; count: number }[];
  onDelete: (doc: { id: string; title: string }) => void;
  onViewPdf: (id: string) => void;
  onOpenExternal: (id: string) => void;
}) {
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);

  if (grouped.length === 0) {
    return (
      <Card variant="default" className="p-8 text-center text-[var(--color-text-secondary)] space-y-2">
        <BookMarked className="w-10 h-10 mx-auto opacity-40" />
        <p className="text-sm">لا توجد وثائق في المكتبة بعد</p>
        <p className="text-xs">اسحب ملف PDF هنا أو اضغط "استيراد ملف PDF" للبدء</p>
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
                  <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} onViewPdf={onViewPdf} onOpenExternal={onOpenExternal} />
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
  onOpenExternal,
}: {
  documents: any[];
  onDelete: (doc: { id: string; title: string }) => void;
  onViewPdf: (id: string) => void;
  onOpenExternal: (id: string) => void;
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
        <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} onViewPdf={onViewPdf} onOpenExternal={onOpenExternal} />
      ))}
    </Card>
  );
}

function DocumentRow({
  doc,
  onDelete,
  onViewPdf,
  onOpenExternal,
}: {
  doc: any;
  onDelete: (doc: { id: string; title: string }) => void;
  onViewPdf: (id: string) => void;
  onOpenExternal: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-[var(--color-bg-elevated)] transition-colors">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-[var(--color-brand-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{doc.title}</p>
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
          title="عرض داخل التطبيق"
          data-testid={`view-pdf-${doc.id}`}
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenExternal(doc.id)}
          title="فتح في مستعرض خارجي"
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
