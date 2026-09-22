import { useEffect, useState } from 'react';
import type { ReviewArtifactDto, ReviewGenerationResult } from '@tibyan/contracts';
import { Card, Button, Badge, Input, Select } from '@tibyan/design-system';
import { BookOpen, Loader2, Sparkles, Save, CheckCircle } from 'lucide-react';
import { SourcePicker, type SourceSelection } from './SourcePicker.js';

const REVIEW_TYPES = [
  { value: 'QUESTIONS', label: 'مراجعة أسئلة' },
  { value: 'EXPLANATION', label: 'مراجعة شرح' },
  { value: 'SOLVED_EXAMPLES', label: 'نماذج وأمثلة محلولة' },
  { value: 'MIXED', label: 'شرح + أسئلة + أمثلة' },
];

const DETAIL_LEVELS = [
  { value: 'BRIEF', label: 'مختصر' },
  { value: 'MODERATE', label: 'متوسط' },
  { value: 'DETAILED', label: 'تفصيلي' },
];

interface ReviewSection {
  id: string;
  title: string;
  content: string;
  sourcePage: number;
  type: ReviewGenerationResult['sections'][number]['type'];
  modelAnswer?: string;
}

export function ReviewToolUI() {
  const [selectedSource, setSelectedSource] = useState<SourceSelection | null>(null);
  const [title, setTitle] = useState('مراجعة جديدة');
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [savedReviews, setSavedReviews] = useState<ReviewArtifactDto[]>([]);
  const [reviewType, setReviewType] = useState('MIXED');
  const [questionCount, setQuestionCount] = useState(10);
  const [detailLevel, setDetailLevel] = useState('MODERATE');
  const [scope, setScope] = useState('');
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedSections, setGeneratedSections] = useState<ReviewSection[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => { void window.tibyan.ai.listReviews().then((result) => { if (result.success) setSavedReviews(result.data); }); }, []);

  const openReview = async (id: string) => {
    const result = await window.tibyan.ai.getReview(id);
    if (!result.success || !result.data) { setGenerationError('تعذر فتح المراجعة المحفوظة'); return; }
    const review = result.data;
    setArtifactId(review.id); setTitle(review.title); setReviewType(review.reviewType);
    setDetailLevel(review.detailLevel); setQuestionCount(review.questionCount);
    setScope(review.scope ?? ''); setIncludeAnswers(review.includeModelAnswers);
    setGeneratedSections(review.content.sections.map((section, index) => ({...section, id: `${review.id}-${index}`})));
    setSavedMessage(null); setGenerationError(null);
  };

  const handleGenerate = async () => {
    if (!selectedSource || !selectedSource.id) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await window.tibyan.ai.generateReview({
        sourceDocumentId: selectedSource.id,
        title, reviewType: reviewType as ReviewArtifactDto['reviewType'],
        detailLevel: detailLevel as any, questionCount, includeModelAnswers: includeAnswers,
        scope: scope || undefined,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'فشل توليد المراجعة');
      }

      const parsed = result.data.content.sections;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setGenerationError('لم يتم توليد أقسام المراجعة. تأكد من أن المصدر يحتوي على محتوى كافٍ.');
        return;
      }

      const sections: ReviewSection[] = parsed.map((s, idx) => ({
        id: `sec-${Date.now()}-${idx}`,
        title: s.title,
        content: s.content,
        sourcePage: s.sourcePage,
        type: s.type,
        modelAnswer: s.modelAnswer,
      }));

      setArtifactId(result.data.id);
      setSavedReviews((previous) => [result.data, ...previous.filter((item) => item.id !== result.data.id)]);
      setGeneratedSections(sections);
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء توليد المراجعة');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (generatedSections.length === 0 || !artifactId) return;
    setIsSaving(true);
    setGenerationError(null);
    try {
      const result = await window.tibyan.ai.saveReview(artifactId, {sections: generatedSections.map(({id: _id, ...section}) => section)});
      if (result.success) {
        setSavedMessage('تم حفظ المراجعة بنجاح');
      } else {
        throw new Error(result.error?.message || 'فشل حفظ المراجعة');
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[var(--color-brand-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              إنشاء مراجعة
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              مراجعة منهجية شاملة من مصدر المنهج
            </p>
          </div>
        </div>

        {savedReviews.length > 0 && <Select value="" onChange={(event) => { if (event.target.value) void openReview(event.target.value); }} options={[{value:'',label:'فتح مراجعة محفوظة'}, ...savedReviews.map((review) => ({value:review.id,label:review.title}))]} data-testid="saved-reviews" />}

        {/* Source */}
        <SourcePicker
          selectedSource={selectedSource}
          onSourceSelected={setSelectedSource}
          onSourceCleared={() => setSelectedSource(null)}
          label="مصدر المراجعة"
        />

        {/* Settings */}
        <Card variant="default" className="p-6">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
            إعدادات المراجعة
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="text-xs font-semibold text-[var(--color-text-secondary)]">عنوان المراجعة</label><Input value={title} onChange={(event) => setTitle(event.target.value)} data-testid="review-title" /></div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                نوع المراجعة
              </label>
              <Select
                value={reviewType}
                onChange={(e) => setReviewType(e.target.value)}
                options={REVIEW_TYPES}
                className="mt-1"
                data-testid="review-type"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                مستوى التفصيل
              </label>
              <Select
                value={detailLevel}
                onChange={(e) => setDetailLevel(e.target.value)}
                options={DETAIL_LEVELS}
                className="mt-1"
                data-testid="review-detail"
              />
            </div>
            {(reviewType === 'QUESTIONS' || reviewType === 'MIXED') && (
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  عدد الأسئلة
                </label>
                <Input
                  type="number"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="mt-1"
                  data-testid="review-question-count"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                الموضوع / الوحدة / الصفحات
              </label>
              <Input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="مثال: الفصل الثالث، صفحات 45-60"
                className="mt-1"
                data-testid="review-scope"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={includeAnswers}
                onChange={(e) => setIncludeAnswers(e.target.checked)}
                className="rounded"
                data-testid="review-include-answers"
              />
              تشمل إجابات نموذجية
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
          data-testid="btn-generate-review"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin ml-2" />
          ) : (
            <Sparkles className="w-5 h-5 ml-2" />
          )}
          {isGenerating ? 'جاري توليد المراجعة...' : 'توليد المراجعة'}
        </Button>

        {/* Preview */}
        {generatedSections.length > 0 && (
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                معاينة المراجعة ({generatedSections.length} قسم)
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
                  data-testid={`review-section-${section.id}`}
                >
                  <Input value={section.title} onChange={(event) => setGeneratedSections((items) => items.map((item) => item.id === section.id ? {...item,title:event.target.value} : item))} className="mb-2" aria-label="عنوان القسم" />
                  <textarea value={section.content} onChange={(event) => setGeneratedSections((items) => items.map((item) => item.id === section.id ? {...item,content:event.target.value} : item))} className="w-full min-h-24 p-2 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]" aria-label="محتوى القسم" />
                  {section.modelAnswer !== undefined && <textarea value={section.modelAnswer} onChange={(event) => setGeneratedSections((items) => items.map((item) => item.id === section.id ? {...item,modelAnswer:event.target.value} : item))} className="w-full min-h-16 p-2 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]" aria-label="الإجابة النموذجية" />}
                  <span className="text-xs text-[var(--color-text-secondary)]">صفحة {section.sourcePage}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving}
                data-testid="btn-save-review"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                ) : (
                  <Save className="w-4 h-4 ml-1" />
                )}
                {isSaving ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
            {savedMessage && (
              <div className="mt-3 p-2 rounded bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] text-sm text-center">
                {savedMessage}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
