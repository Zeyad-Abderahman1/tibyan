import { useState } from 'react';
import {
  X,
  Printer,
  FileDown,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@tibyan/design-system';
import type { StudentDto } from '@tibyan/contracts';
import { StudentCard } from './StudentCard.js';
import { StudentCardPrintSheet } from './StudentCardPrintSheet.js';

export interface StudentCardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentDto[];
  groupName?: string;
  academicYearLabel?: string;
}

type ViewMode = 'single' | 'a4';

export function StudentCardPreviewModal({
  isOpen,
  onClose,
  students,
  groupName,
  academicYearLabel = '2026 - 2027',
}: StudentCardPreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen || students.length === 0) return null;

  const currentStudent = students[currentIdx] || students[0]!;

  const handlePrint = async () => {
    try {
      if (typeof window !== 'undefined' && window.tibyan?.students?.printCards) {
        await window.tibyan.students.printCards();
      } else {
        window.print();
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'فشلت عملية الطباعة',
      });
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setFeedbackMessage(null);
    try {
      if (typeof window !== 'undefined' && window.tibyan?.students?.exportCardsPdf) {
        const defaultFilename =
          students.length === 1
            ? `بطاقة_${currentStudent.studentCode}_${currentStudent.fullName.replace(/\s+/g, '_')}.pdf`
            : `بطاقات_الطلاب_${students.length}_طالب.pdf`;

        const res = await window.tibyan.students.exportCardsPdf({ defaultFilename });
        if (res.success && !res.data.canceled) {
          setFeedbackMessage({
            type: 'success',
            text: `تم حفظ ملف PDF بنجاح: ${res.data.filePath}`,
          });
        }
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'فشل تصدير ملف PDF',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
      data-testid="student-card-preview-modal"
    >
      <div
        className="bg-[var(--color-bg-surface,#182627)] border border-[var(--color-border-subtle,#2a4244)] rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden no-print"
        data-testid="student-card-modal-content"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border-subtle,#2a4244)] bg-[var(--color-bg-surface-subtle,#121e1f)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary,#14b8a6)] flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-primary,#f1f5f9)] font-cairo">
                معاينة وطباعة بطاقات الطلاب
              </h2>
              <p className="text-[11px] text-[var(--color-text-secondary,#94a3b8)] font-cairo">
                {students.length === 1
                  ? `طالب واحد: ${currentStudent.fullName} (${currentStudent.studentCode})`
                  : `إجمالي الطلاب المحددين: ${students.length} طالب`}
              </p>
            </div>
          </div>

          {/* View Mode Toggle & Actions */}
          <div className="flex items-center gap-2">
            {/* View Mode Segmented Control */}
            <div className="flex items-center bg-[var(--color-bg-surface,#182627)] p-1 rounded-lg border border-[var(--color-border-subtle,#2a4244)] text-xs font-cairo">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'single'
                    ? 'bg-[var(--color-brand-primary,#0f3d3e)] text-white font-semibold shadow-xs'
                    : 'text-[var(--color-text-secondary,#94a3b8)] hover:text-white'
                }`}
                data-testid="tab-single-card"
              >
                <CreditCard size={14} />
                <span>بطاقة فردية</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('a4')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'a4'
                    ? 'bg-[var(--color-brand-primary,#0f3d3e)] text-white font-semibold shadow-xs'
                    : 'text-[var(--color-text-secondary,#94a3b8)] hover:text-white'
                }`}
                data-testid="tab-a4-sheet"
              >
                <FileText size={14} />
                <span>ورقة A4 (طباعة)</span>
              </button>
            </div>

            {/* Print Action */}
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
              data-testid="btn-print-cards"
            >
              <Printer size={15} />
              <span>طباعة</span>
            </Button>

            {/* Export PDF Action */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="gap-1.5"
              data-testid="btn-export-pdf"
            >
              <FileDown size={15} />
              <span>{isExporting ? 'جاري الحفظ...' : 'تصدير PDF'}</span>
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--color-text-secondary,#94a3b8)] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="إغلاق"
              data-testid="btn-close-card-modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback Message Banner */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-b border-emerald-800/50'
                : 'bg-red-950/60 text-red-300 border-b border-red-800/50'
            }`}
            data-testid="modal-feedback-banner"
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={14} className="shrink-0" />
            ) : (
              <AlertCircle size={14} className="shrink-0" />
            )}
            <span className="truncate">{feedbackMessage.text}</span>
          </div>
        )}

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg-app,#0d1516)] flex flex-col items-center justify-center min-h-[420px]">
          {viewMode === 'single' ? (
            <div className="flex flex-col items-center gap-4 my-auto">
              {/* Card Container with Paper Shadow */}
              <div
                className="p-2 bg-slate-200/20 dark:bg-black/30 rounded-xl shadow-2xl border border-white/10 transition-transform duration-200"
                style={{ transform: 'scale(1.15)', transformOrigin: 'center' }}
                data-testid="single-card-viewport"
              >
                <StudentCard
                  student={currentStudent}
                  groupName={groupName}
                  academicYearLabel={academicYearLabel}
                />
              </div>

              {/* Navigation Arrows for multi-student selection */}
              {students.length > 1 && (
                <div className="flex items-center gap-4 mt-6 bg-[var(--color-bg-surface,#182627)] px-4 py-1.5 rounded-full border border-[var(--color-border-subtle,#2a4244)] text-xs text-[var(--color-text-secondary,#94a3b8)] font-cairo">
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="p-1 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded"
                    data-testid="btn-prev-student-card"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <span className="font-mono dir-ltr font-bold text-white">
                    {currentIdx + 1} / {students.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((prev) => Math.min(students.length - 1, prev + 1))}
                    disabled={currentIdx === students.length - 1}
                    className="p-1 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded"
                    data-testid="btn-next-student-card"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* A4 Sheet Preview Viewport */
            <div className="w-full flex flex-col items-center gap-8 py-4 overflow-x-auto">
              <div
                className="scale-90 origin-top shadow-2xl rounded-sm border border-slate-400/40"
                data-testid="a4-sheet-viewport"
              >
                <StudentCardPrintSheet
                  students={students}
                  groupName={groupName}
                  academicYearLabel={academicYearLabel}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-[var(--color-bg-surface-subtle,#121e1f)] border-t border-[var(--color-border-subtle,#2a4244)] flex items-center justify-between text-xs text-[var(--color-text-secondary,#94a3b8)] font-cairo">
          <span>
            {viewMode === 'single'
              ? 'معاينة البطاقة الفردية بأبعاد ISO/IEC 7810 القياسية (85.6 × 54 مم)'
              : `معاينة الطباعة A4: تتسع كل صفحة لـ 8 بطاقات مرتبة 2 عمود × 4 صفوف`}
          </span>
          <span className="font-mono dir-ltr text-[11px] text-[var(--color-text-muted)]">
            TIBYAN ID CARDS • OFFLINE WASM
          </span>
        </div>
      </div>

      {/* Hidden container dedicated to physical printer / printToPDF rendering */}
      <div className="hidden print:block print-sheet-root">
        <StudentCardPrintSheet
          students={students}
          groupName={groupName}
          academicYearLabel={academicYearLabel}
        />
      </div>
    </div>
  );
}
