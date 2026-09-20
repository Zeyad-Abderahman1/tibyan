import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '@tibyan/design-system';
import { useImportPdfSource } from '../../hooks/usePdfSources.js';
import { useCurriculumCatalogs } from '../../hooks/useCurriculum.js';
import { FileUp, AlertCircle, Loader2 } from 'lucide-react';

interface ImportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportPdfModal({ isOpen, onClose, onSuccess }: ImportPdfModalProps) {
  const [filePath, setFilePath] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [editionYear, setEditionYear] = useState('');
  const [curriculumCatalogId, setCurriculumCatalogId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const importMutation = useImportPdfSource();
  const { data: catalogs } = useCurriculumCatalogs();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In Electron renderer, File object includes the real filesystem path
      const pathWithFile = (file as unknown as { path?: string }).path || file.name;
      setFilePath(pathWithFile);
      if (!title) {
        // Pre-fill title from filename without extension
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        setTitle(cleanTitle);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim()) {
      setError('يرجى تحديد مسار ملف الـ PDF');
      return;
    }
    if (!title.trim()) {
      setError('يرجى إدخال عنوان الوثيقة');
      return;
    }

    setError(null);
    try {
      await importMutation.mutateAsync({
        sourceFilePath: filePath.trim(),
        title: title.trim(),
        author: author.trim() || undefined,
        publisher: publisher.trim() || undefined,
        editionYear: editionYear.trim() || undefined,
        curriculumCatalogId: curriculumCatalogId || undefined,
      });
      // Reset form
      setFilePath('');
      setTitle('');
      setAuthor('');
      setPublisher('');
      setEditionYear('');
      setCurriculumCatalogId('');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء استيراد الملف');
    }
  };

  const catalogOptions = [
    { value: '', label: 'بدون ارتباط بمنهج محدد' },
    ...(catalogs || []).map((c) => ({
      value: c.id,
      label: `${c.title} (${c.gradeLevel})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="استيراد وثيقة PDF ومصدر أسئلة"
      description="استيراد ملف PDF محلي لتخزينه في مستودع المصادر وإدارة مراجع الصفحات"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl" data-testid="import-pdf-form">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* File Picker & Path */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-primary)]">
            ملف PDF المصدر <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".pdf,application/pdf"
              id="pdf-file-picker"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => document.getElementById('pdf-file-picker')?.click()}
              className="shrink-0"
              data-testid="choose-pdf-btn"
            >
              <FileUp className="w-4 h-4 me-1.5" />
              اختيار ملف
            </Button>
            <Input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="اختر ملفاً أو اكتب المسار المطلق لملف PDF..."
              className="flex-1 text-xs"
              data-testid="pdf-file-path-input"
            />
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            يدعم النظام ملفات PDF الممسوحة ضوئياً والمستندات الرقمية دون اتصال بالإنترنت.
          </p>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-primary)]">
            عنوان الوثيقة أو الكتاب <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: كتاب الرياضيات التفاعلي - الصف الثالث الثانوي"
            data-testid="pdf-title-input"
          />
        </div>

        {/* Author and Publisher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">المؤلف / المترجم</label>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="مثال: نخبة من أساتذة الرياضيات"
              data-testid="pdf-author-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">دار النشر / الجهة</label>
            <Input
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="مثال: وزارة التربية والتعليم / سلسلة المعاصر"
              data-testid="pdf-publisher-input"
            />
          </div>
        </div>

        {/* Edition/Year and Curriculum Link */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">الطبعة أو سنة الإصدار</label>
            <Input
              value={editionYear}
              onChange={(e) => setEditionYear(e.target.value)}
              placeholder="مثال: طبعة 2026"
              data-testid="pdf-edition-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">الربط بمنهج دراسي</label>
            <Select
              value={curriculumCatalogId}
              onChange={(e) => setCurriculumCatalogId(e.target.value)}
              options={catalogOptions}
              data-testid="pdf-curriculum-select"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border-subtle)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={importMutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={importMutation.isPending || !filePath.trim() || !title.trim()}
            data-testid="submit-import-pdf-btn"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                جاري المعالجة والحفظ...
              </>
            ) : (
              'تأكيد الاستيراد'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
