import { useState } from 'react';
import { Card, Button, Badge, Input, Select } from '@tibyan/design-system';
import { StickyNote, Loader2, Sparkles, Save, Download, CheckCircle } from 'lucide-react';
import { SourcePicker, type SourceSelection } from './SourcePicker.js';

const DETAIL_STYLES = [
  { value: 'CONDENSED', label: 'مختصرة' },
  { value: 'MODERATE', label: 'متوسطة' },
  { value: 'DETAILED', label: 'تفصيلية' },
  { value: 'EXPLAIN_ONLY', label: 'شرح فقط' },
  { value: 'EXPLAIN_EXAMPLES', label: 'شرح + أمثلة' },
  { value: 'EXPLAIN_EXAMPLES_PRACTICE', label: 'شرح + أمثلة + تدريبات' },
];

const GRADE_LEVELS = [
  { value: 'SEC_1', label: 'الصف الأول الثانوي' },
  { value: 'SEC_2', label: 'الصف الثاني الثانوي' },
  { value: 'SEC_3', label: 'الصف الثالث الثانوي' },
];

interface NoteSection {
  id: string;
  title: string;
  content: string;
  type: 'heading' | 'content' | 'example' | 'exercise';
}

export function NotesToolUI() {
  const [selectedSource, setSelectedSource] = useState<SourceSelection | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('SEC_1');
  const [detailStyle, setDetailStyle] = useState('MODERATE');
  const [scope, setScope] = useState('');
  const [includeExercises, setIncludeExercises] = useState(false);
  const [includeModelSolutions, setIncludeModelSolutions] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSections, setGeneratedSections] = useState<NoteSection[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedSource || !selectedSource.id) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await window.tibyan.ai.generateNotes({
        sourceId: selectedSource.id,
        scope: scope || undefined,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'فشل توليد المذكرة');
      }

      const generated = result.data as any;
      const contentStr = generated?.content || '[]';
      let parsed: any[];
      try {
        parsed = typeof contentStr === 'string' ? JSON.parse(contentStr) : contentStr;
      } catch {
        parsed = [];
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setGenerationError('لم يتم توليد أقسام المذكرة. تأكد من أن المصدر يحتوي على محتوى كافٍ.');
        return;
      }

      const sections: NoteSection[] = parsed.map((s: any, idx: number) => ({
        id: `n-${Date.now()}-${idx}`,
        title: s.title || s.heading || `قسم ${idx + 1}`,
        content: s.content || s.text || s.body || '',
        type: s.type || (idx === 0 ? 'heading' : 'content'),
      }));

      setGeneratedSections(sections);
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء توليد المذكرة');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'heading': return '📘';
      case 'example': return '💡';
      case 'exercise': return '✏️';
      default: return '📄';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
            <StickyNote className="w-5 h-5 text-[var(--color-brand-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              إنشاء مذكرة
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              مذكرة دراسية شاملة من مصدر المنهج
            </p>
          </div>
        </div>

        {/* Source */}
        <SourcePicker
          selectedSource={selectedSource}
          onSourceSelected={setSelectedSource}
          onSourceCleared={() => setSelectedSource(null)}
          label="مصدر المذكرة"
        />

        {/* Settings */}
        <Card variant="default" className="p-6">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
            إعدادات المذكرة
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                عنوان المذكرة
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مذكرة رياضيات - الفصل الأول"
                className="mt-1"
                data-testid="notes-title"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                الصف الدراسي
              </label>
              <Select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                options={GRADE_LEVELS}
                className="mt-1"
                data-testid="notes-grade"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                نمط المحتوى
              </label>
              <Select
                value={detailStyle}
                onChange={(e) => setDetailStyle(e.target.value)}
                options={DETAIL_STYLES}
                className="mt-1"
                data-testid="notes-style"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                الوحدة / الفصل / الصفحات
              </label>
              <Input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="مثال: الوحدة الثانية، الفصل الأول، صفحات 20-35"
                className="mt-1"
                data-testid="notes-scope"
              />
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={includeExercises}
                onChange={(e) => setIncludeExercises(e.target.checked)}
                className="rounded"
                data-testid="notes-exercises"
              />
              تشمل أسئلة تدريبية
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={includeModelSolutions}
                onChange={(e) => setIncludeModelSolutions(e.target.checked)}
                className="rounded"
                data-testid="notes-solutions"
              />
              تشمل حلولاً نموذجية
            </label>
          </div>
        </Card>

        {/* Generation Error */}
        {generationError && (
          <div className="p-3 rounded-lg bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger-border)] text-[var(--color-status-danger)] text-sm">
            {generationError}
          </div>
        )}

        {/* Generate */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={!selectedSource || !selectedSource.id || isGenerating}
          data-testid="btn-generate-notes"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin ml-2" />
          ) : (
            <Sparkles className="w-5 h-5 ml-2" />
          )}
          {isGenerating ? 'جاري توليد المذكرة...' : 'توليد المذكرة'}
        </Button>

        {/* Preview */}
        {generatedSections.length > 0 && (
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                معاينة المذكرة ({generatedSections.length} قسم)
              </h3>
              <Badge variant="success" size="sm">
                <CheckCircle className="w-3 h-3 ml-1" />
                تم التوليد
              </Badge>
            </div>
            <div className="space-y-3">
              {generatedSections.map((section) => (
                <div
                  key={section.id}
                  className="p-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
                  data-testid={`note-section-${section.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getSectionIcon(section.type)}</span>
                    <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                      {section.title}
                    </h4>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="primary" className="flex-1" data-testid="btn-save-notes">
                <Save className="w-4 h-4 ml-1" />
                حفظ
              </Button>
              <Button variant="secondary" className="flex-1" data-testid="btn-export-notes">
                <Download className="w-4 h-4 ml-1" />
                تصدير PDF
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
