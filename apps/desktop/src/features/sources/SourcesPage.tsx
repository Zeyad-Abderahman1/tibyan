import { useState } from 'react';
import { Card, Button, Badge, Select } from '@tibyan/design-system';
import { usePdfSources, useDeletePdfSource } from '../../hooks/usePdfSources.js';
import { useCurriculumCatalogs } from '../../hooks/useCurriculum.js';
import { ImportPdfModal } from './ImportPdfModal.js';
import { SourceReferencesModal } from './SourceReferencesModal.js';
import type { SourceDocumentDto } from '@tibyan/contracts';
import {
  FileText,
  Plus,
  BookOpen,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Calendar,
  Layers,
  FileCheck2,
} from 'lucide-react';

export function SourcesPage() {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeDocForRefs, setActiveDocForRefs] = useState<SourceDocumentDto | null>(null);

  const { data: catalogs } = useCurriculumCatalogs();
  const { data: documents, isLoading } = usePdfSources(selectedCatalogId || undefined);
  const deleteMutation = useDeletePdfSource();

  const catalogOptions = [
    { value: '', label: 'جميع المناهج والمصادر العامة' },
    ...(catalogs || []).map((c) => ({
      value: c.id,
      label: `${c.title} (${c.gradeLevel})`,
    })),
  ];

  const handleDelete = async (doc: SourceDocumentDto) => {
    if (!window.confirm(`هل أنت متأكد من حذف الوثيقة "${doc.title}" وكافة مراجعها؟`)) return;
    try {
      await deleteMutation.mutateAsync(doc.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'فشل حذف الوثيقة');
    }
  };

  const handleOpenDoc = async (id: string) => {
    if (window.tibyan?.pdfSources?.openDocument) {
      await window.tibyan.pdfSources.openDocument(id);
    }
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl" data-testid="sources-page">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-[var(--color-brand-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">المصادر والمراجع التعليمية (PDF)</h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            إدارة مستندات PDF المحلية، وتحديد مراجع الصفحات لربطها ببنك الأسئلة والمناهج دون اتصال
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setIsImportModalOpen(true)}
            data-testid="open-import-pdf-modal-btn"
          >
            <Plus className="w-4 h-4 me-1.5" />
            استيراد وثيقة PDF
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-[var(--color-bg-surface)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <Layers className="w-4 h-4 text-[var(--color-brand-primary)]" />
          <span>تصفية بحسب المنهج:</span>
        </div>
        <div className="w-72">
          <Select
            value={selectedCatalogId}
            onChange={(e) => setSelectedCatalogId(e.target.value)}
            options={catalogOptions}
            data-testid="filter-catalog-select"
          />
        </div>
        <div className="ms-auto text-xs text-[var(--color-text-muted)]">
          إجمالي الوثائق: <span className="font-bold text-[var(--color-text-primary)]">{documents?.length || 0}</span>
        </div>
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--color-text-secondary)]">جاري تحميل الوثائق...</div>
      ) : !documents || documents.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-[var(--color-bg-surface)] border-dashed">
          <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">لا توجد وثائق PDF مستوردة</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto">
            قم باستيراد الكتب والمراجع التعليمية بصيغة PDF لتخزينها محلياً وبدء إنشاء مراجع الصفحات لربطها ببنك الأسئلة.
          </p>
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="mt-2">
            <Plus className="w-4 h-4 me-1.5" />
            استيراد وثيقتك الأولى الآن
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow bg-[var(--color-bg-surface)]"
              data-testid={`source-doc-card-${doc.id}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[var(--color-text-primary)] line-clamp-1" title={doc.title}>
                        {doc.title}
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {doc.author && <span>{doc.author}</span>}
                        {doc.author && doc.publisher && <span>•</span>}
                        {doc.publisher && <span>{doc.publisher}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="primary" size="sm">
                    <BookOpen className="w-3 h-3 me-1 text-[var(--color-brand-primary)]" />
                    {doc.pageCount} صفحة
                  </Badge>
                  {doc.editionYear && (
                    <Badge variant="neutral" size="sm">
                      <Calendar className="w-3 h-3 me-1" />
                      {doc.editionYear}
                    </Badge>
                  )}
                  <Badge
                    variant="neutral"
                    size="sm"
                    className="font-mono text-[10px] text-[var(--color-text-muted)]"
                    title={`SHA-256: ${doc.sha256Hash}`}
                  >
                    <ShieldCheck className="w-3 h-3 me-1 text-emerald-500" />
                    {doc.sha256Hash.substring(0, 8)}...
                  </Badge>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveDocForRefs(doc)}
                  className="text-xs"
                  data-testid={`manage-refs-btn-${doc.id}`}
                >
                  <Bookmark className="w-3.5 h-3.5 me-1" />
                  مراجع الصفحات
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDoc(doc.id)}
                    title="فتح الوثيقة في قارئ النظام"
                    data-testid={`open-doc-btn-${doc.id}`}
                  >
                    <ExternalLink className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc)}
                    title="حذف الوثيقة"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    data-testid={`delete-doc-btn-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <ImportPdfModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <SourceReferencesModal
        document={activeDocForRefs}
        isOpen={Boolean(activeDocForRefs)}
        onClose={() => setActiveDocForRefs(null)}
      />
    </div>
  );
}
