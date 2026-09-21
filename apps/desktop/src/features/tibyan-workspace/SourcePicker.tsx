import { useState, useRef, useCallback } from 'react';
import { Card, Button, Badge } from '@tibyan/design-system';
import { Upload, BookMarked, FileText, X, ChevronLeft, FolderOpen } from 'lucide-react';
import { useCurriculumLibraryList } from '../../hooks/useCurriculumLibrary.js';

export interface SourceSelection {
  type: 'UPLOAD_PDF' | 'CURRICULUM_LIBRARY';
  id?: string;
  title: string;
  filePath?: string;
  gradeLevel?: string;
  subject?: string;
  pageCount?: number;
}

interface SourcePickerProps {
  onSourceSelected: (source: SourceSelection) => void;
  onSourceCleared?: () => void;
  selectedSource: SourceSelection | null;
  label?: string;
  acceptDragDrop?: boolean;
}

export function SourcePicker({
  onSourceSelected,
  onSourceCleared,
  selectedSource,
  label = 'المصدر',
  acceptDragDrop = true,
}: SourcePickerProps) {
  const [mode, setMode] = useState<'CHOICE' | 'LIBRARY'>('CHOICE');
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const { data: libraryDocs, isLoading } = useCurriculumLibraryList();

  const handleBrowse = async () => {
    try {
      const res = await window.tibyan.curriculumLibrary.browseAndImport();
      if (res.success && res.data) {
        onSourceSelected({
          type: 'UPLOAD_PDF',
          title: res.data.fileName,
          filePath: res.data.filePath,
        });
      }
    } catch {
      // user cancelled or error
    }
  };

  const handleSelectFromLibrary = (doc: { id: string; title: string; gradeLevel?: string | null; subject?: string | null; pageCount?: number | null }) => {
    onSourceSelected({
      type: 'CURRICULUM_LIBRARY',
      id: doc.id,
      title: doc.title,
      gradeLevel: doc.gradeLevel ?? undefined,
      subject: doc.subject ?? undefined,
      pageCount: doc.pageCount ?? undefined,
    });
    setMode('CHOICE');
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFile) {
      onSourceSelected({
        type: 'UPLOAD_PDF',
        title: pdfFile.name,
      });
    }
  }, [onSourceSelected]);

  if (selectedSource) {
    return (
      <Card variant="outlined" className="p-4" dir="rtl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{label}</h3>
          {onSourceCleared && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSourceCleared}
              className="h-6 px-2"
              data-testid="clear-source"
            >
              <X className="w-3 h-3" />
              تغيير المصدر
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-brand-primary-bg)] border border-[var(--color-brand-primary)]/20">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-primary)] flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {selectedSource.title}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              {selectedSource.gradeLevel && (
                <Badge variant="neutral" size="sm">{selectedSource.gradeLevel}</Badge>
              )}
              {selectedSource.subject && <span>{selectedSource.subject}</span>}
              {selectedSource.pageCount && <span>{selectedSource.pageCount} صفحة</span>}
              <Badge variant="primary" size="sm">
                {selectedSource.type === 'UPLOAD_PDF' ? 'ملف جديد' : 'من المكتبة'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (mode === 'LIBRARY') {
    return (
      <Card variant="default" className="p-6" dir="rtl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setMode('CHOICE')}>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </Button>
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            اختر من المكتبة
          </h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
          </div>
        ) : (libraryDocs || []).length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            <BookMarked className="w-10 h-10 mx-auto opacity-40 mb-2" />
            <p className="text-sm">لا توجد وثائق في المكتبة بعد</p>
            <p className="text-xs mt-1">قم باستيراد ملف PDF أولاً</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(libraryDocs || []).map((doc) => (
              <button
                key={doc.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-elevated)] transition-colors text-right"
                onClick={() => handleSelectFromLibrary(doc)}
                data-testid={`library-doc-${doc.id}`}
              >
                <div className="w-8 h-8 rounded bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[var(--color-brand-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    {doc.gradeLevel && <Badge variant="neutral" size="sm">{doc.gradeLevel}</Badge>}
                    {doc.pageCount && <span>{doc.pageCount} صفحة</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div
      onDragEnter={acceptDragDrop ? handleDragEnter : undefined}
      onDragLeave={acceptDragDrop ? handleDragLeave : undefined}
      onDragOver={acceptDragDrop ? handleDragOver : undefined}
      onDrop={acceptDragDrop ? handleDrop : undefined}
      className="relative"
    >
      <Card variant="default" className="p-6" dir="rtl">
        <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">
          {label}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          اختر مصدر المحتوى
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Card
            variant="outlined"
            className="p-4 cursor-pointer hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-brand-primary)] transition-all text-center"
            onClick={handleBrowse}
            data-testid="source-browse"
          >
            <FolderOpen className="w-8 h-8 mx-auto text-[var(--color-brand-primary)] mb-2" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">استعراض ملف</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              فتح ملف PDF من جهازك
            </p>
          </Card>
          <Card
            variant="outlined"
            className="p-4 cursor-pointer hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-brand-primary)] transition-all text-center"
            onClick={() => setMode('LIBRARY')}
            data-testid="source-library"
          >
            <BookMarked className="w-8 h-8 mx-auto text-[var(--color-brand-primary)] mb-2" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">من المكتبة</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              اختيار من المناهج المحفوظة
            </p>
          </Card>
        </div>
      </Card>

      {isDragOver && acceptDragDrop && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-brand-primary)] bg-[var(--color-brand-primary-bg)]/90 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto text-[var(--color-brand-primary)] mb-2 animate-bounce" />
            <p className="text-base font-bold text-[var(--color-brand-primary)]">
              أفلت ملف PDF هنا
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
