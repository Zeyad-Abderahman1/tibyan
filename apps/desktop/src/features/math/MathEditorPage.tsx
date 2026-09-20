import React, { useState } from 'react';
import {
  MathRichContent,
  createTextBlock,
  createMathBlock,
  deserializeMathRichContent,
  extractPreviewSummary,
  validateLatexSyntax,
} from '@tibyan/contracts';
import { MathRichContentEditor } from '@tibyan/design-system';
import { Sigma, CheckCircle2, Copy, FileCode } from 'lucide-react';

const STORAGE_KEY = 'tibyan_math_editor_draft';

const INITIAL_DOC: MathRichContent = {
  version: 1,
  blocks: [
    createTextBlock('مسألة نموذجية في التفاضل والتكامل (الصف الثالث الثانوي):', {
      direction: 'rtl',
      formatting: { bold: true },
    }),
    createMathBlock('\\lim_{x \\to 0} \\frac{\\sin(5x)}{\\tan(2x)} = \\frac{5}{2}', {
      displayMode: 'block',
      altTextAr: 'نهاية دالة مثلثية',
    }),
    createTextBlock('أوجد معادلة المماس للمنحنى التالي عند النقطة المعطاة:', {
      direction: 'rtl',
    }),
    createMathBlock('y = \\sqrt{2x^2 + 1}, \\quad x = 2', {
      displayMode: 'block',
      altTextAr: 'دالة جذرية',
    }),
  ],
};

export const MathEditorPage: React.FC = () => {
  const [content, setContent] = useState<MathRichContent>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return deserializeMathRichContent(saved);
      }
    } catch {
      // Fall back to initial
    }
    return INITIAL_DOC;
  });

  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = (serialized: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      setSavedJson(serialized);
    } catch {
      // Storage error fallback
    }
  };

  const handleCopyJson = () => {
    if (!savedJson) return;
    navigator.clipboard.writeText(savedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const summary = extractPreviewSummary(content, 120);

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto p-4 md:p-6"
      dir="rtl"
      data-testid="page-math-editor"
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                محرر الرياضيات والصيغ الأكاديمية
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                نظام تحرير ومعاينة المعادلات الرياضية الغنية 100% دون اتصال مع عزل تام للرموز
              </p>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/30"
            data-testid="badge-offline-katex"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>KaTeX مدمج دون إنترنت</span>
          </span>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-500/30"
            data-testid="badge-bidi-isolate"
          >
            <span>عزل BiDi (LTR/RTL) نشط</span>
          </span>
        </div>
      </div>

      {/* Main MathRichContentEditor */}
      <MathRichContentEditor
        initialContent={content}
        onChange={setContent}
        onSave={handleSave}
        validateLatex={validateLatexSyntax}
        testId="desktop-math-editor"
      />

      {/* Serialization and Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Document Metadata & Plain Text Summary */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>ملخص المستند النصي (Plain-Text Summary):</span>
            <span className="text-[11px] font-mono text-slate-400">
              {content.blocks.length} كتل
            </span>
          </div>
          <p
            className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-sans"
            data-testid="document-plain-summary"
          >
            {summary}
          </p>
        </div>

        {/* JSON Serialization Inspection Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>مخرجات التسلسل المتطابق (Serialized Document):</span>
            </span>
            {savedJson && (
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-[11px] flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                data-testid="copy-json-btn"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'تم النسخ' : 'نسخ JSON'}</span>
              </button>
            )}
          </div>
          <div
            className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-black/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 max-h-32 overflow-y-auto"
            dir="ltr"
            data-testid="serialized-json-output"
          >
            {savedJson ? savedJson : 'انقر فوق "حفظ المحتوى" بالأعلى لعرض الـ JSON المتطابق.'}
          </div>
        </div>
      </div>
    </div>
  );
};
