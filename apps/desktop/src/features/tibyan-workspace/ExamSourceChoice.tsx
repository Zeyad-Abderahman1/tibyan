import { useState } from 'react';
import { Card, Button, Badge } from '@tibyan/design-system';
import { Upload, BookMarked, FileText, ChevronLeft } from 'lucide-react';
import { useCurriculumLibraryList } from '../../hooks/useCurriculumLibrary.js';

export interface SelectedSource {
  type: 'UPLOAD_PDF' | 'EXISTING_CURRICULUM';
  id?: string;
  title: string;
  filePath?: string;
}

interface ExamSourceChoiceProps {
  onSourceSelected: (source: SelectedSource) => void;
}

export function ExamSourceChoice({ onSourceSelected }: ExamSourceChoiceProps) {
  const [mode, setMode] = useState<'CHOICE' | 'LIBRARY'>('CHOICE');
  const { data: libraryDocs, isLoading } = useCurriculumLibraryList();

  const handleUpload = () => {
    // TODO: Open file dialog via Electron
    // For now, placeholder
    onSourceSelected({
      type: 'UPLOAD_PDF',
      title: 'ملف PDF جديد',
    });
  };

  const handleSelectFromLibrary = (doc: { id: string; title: string }) => {
    onSourceSelected({
      type: 'EXISTING_CURRICULUM',
      id: doc.id,
      title: doc.title,
    });
  };

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
    <Card variant="default" className="p-6" dir="rtl">
      <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
        مصدر الاختبار
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        اختر مصدر المحتوى لإنشاء الاختبار
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Card
          variant="outlined"
          className="p-4 cursor-pointer hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-brand-primary)] transition-all text-center"
          onClick={handleUpload}
          data-testid="source-choice-upload"
        >
          <Upload className="w-8 h-8 mx-auto text-[var(--color-brand-primary)] mb-2" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">رفع ملف PDF</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            استيراد ملف PDF جديد للمكتبة
          </p>
        </Card>
        <Card
          variant="outlined"
          className="p-4 cursor-pointer hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-brand-primary)] transition-all text-center"
          onClick={() => setMode('LIBRARY')}
          data-testid="source-choice-library"
        >
          <BookMarked className="w-8 h-8 mx-auto text-[var(--color-brand-primary)] mb-2" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">من المكتبة</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            اختيار من المناهج المحفوظة
          </p>
        </Card>
      </div>
    </Card>
  );
}
