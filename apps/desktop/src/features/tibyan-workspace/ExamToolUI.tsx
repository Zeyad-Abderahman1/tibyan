import { useState } from 'react';
import { Card, Button, Badge, Input, Select } from '@tibyan/design-system';
import { FileText, Loader2, Sparkles, Trash2, RefreshCw, Eye, Save } from 'lucide-react';
import { SourcePicker, type SourceSelection } from './SourcePicker.js';

interface ExamQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER';
  body: string;
  options?: string[];
  correctAnswer: string;
  marks: number;
  sourcePage?: number;
}

const GRADE_LEVELS = [
  { value: 'SEC_1', label: 'الصف الأول الثانوي' },
  { value: 'SEC_2', label: 'الصف الثاني الثانوي' },
  { value: 'SEC_3', label: 'الصف الثالث الثانوي' },
];

const GENERATION_MODES = [
  { value: 'SAME_IDEA_NEW_NUMBERS', label: 'نفس فكرة أسئلة المنهج مع تغيير الأرقام' },
  { value: 'SIMILAR_SKILL', label: 'أسئلة مشابهة من نفس المهارة' },
  { value: 'MIXED', label: 'مزيج بين النوعين' },
];

export function ExamToolUI() {
  const [selectedSource, setSelectedSource] = useState<SourceSelection | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('SEC_1');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [totalMarks, setTotalMarks] = useState(20);
  const [variantCount, setVariantCount] = useState(1);
  const [mcqCount, setMcqCount] = useState(10);
  const [writtenCount, setWrittenCount] = useState(5);
  const [trueFalseCount, setTrueFalseCount] = useState(0);
  const [shortAnswerCount, setShortAnswerCount] = useState(0);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [answerLines, setAnswerLines] = useState(3);
  const [generationMode, setGenerationMode] = useState('SAME_IDEA_NEW_NUMBERS');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<ExamQuestion[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedSource || !selectedSource.id) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const totalRequested = mcqCount + writtenCount + trueFalseCount + shortAnswerCount;
      const types: string[] = [];
      if (mcqCount > 0) types.push('MULTIPLE_CHOICE');
      if (writtenCount > 0) types.push('SHORT_ANSWER');
      if (trueFalseCount > 0) types.push('TRUE_FALSE');
      if (shortAnswerCount > 0) types.push('SHORT_ANSWER');

      const result = await window.tibyan.ai.generateExam({
        sourceId: selectedSource.id,
        config: {
          questionCount: totalRequested,
          difficulty,
          types,
          mcqCount,
          writtenCount,
          generationMode,
        },
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'فشل توليد الاختبار');
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
        setGenerationError('لم يتم توليد أسئلة. تأكد من أن المصدر يحتوي على محتوى كافٍ.');
        return;
      }

      const questions: ExamQuestion[] = parsed.map((q: any, idx: number) => ({
        id: `q-${Date.now()}-${idx}`,
        type: q.type === 'MULTIPLE_CHOICE' || q.type === 'MCQ' ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER',
        body: q.body || q.question || q.text || `سؤال ${idx + 1}`,
        options: q.options || q.choices || undefined,
        correctAnswer: q.correctAnswer || q.answer || q.modelAnswer || '',
        marks: q.marks || Math.ceil(totalMarks / totalRequested),
        sourcePage: q.sourcePage || q.page || undefined,
      }));

      setGeneratedQuestions(questions);
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء توليد الاختبار');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleUpdateMarks = (id: string, marks: number) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, marks } : q))
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
            <FileText className="w-5 h-5 text-[var(--color-brand-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              إنشاء اختبار
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              تحكم كامل في هيكل الاختبار المولد
            </p>
          </div>
        </div>

        {/* Source Selection */}
        <SourcePicker
          selectedSource={selectedSource}
          onSourceSelected={setSelectedSource}
          onSourceCleared={() => setSelectedSource(null)}
          label="مصدر الاختبار"
        />

        {/* Exam Settings */}
        <Card variant="default" className="p-6">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
            إعدادات الاختبار
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                عنوان الاختبار
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="اختبار فصلي - الفصل الأول"
                className="mt-1"
                data-testid="exam-title"
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
                data-testid="exam-grade"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                مدة الاختبار (دقيقة)
              </label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="mt-1"
                data-testid="exam-duration"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                الدرجة الكلية
              </label>
              <Input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="mt-1"
                data-testid="exam-total-marks"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                عدد النماذج
              </label>
              <Input
                type="number"
                value={variantCount}
                onChange={(e) => setVariantCount(Number(e.target.value))}
                min={1}
                max={4}
                className="mt-1"
                data-testid="exam-variants"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                عدد أسطر مساحة الإجابة
              </label>
              <Input
                type="number"
                value={answerLines}
                onChange={(e) => setAnswerLines(Number(e.target.value))}
                min={1}
                max={10}
                className="mt-1"
                data-testid="exam-answer-lines"
              />
            </div>
          </div>
        </Card>

        {/* Question Distribution */}
        <Card variant="default" className="p-6">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
            أنواع الأسئلة
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                أسئلة اختياري (MCQ)
              </label>
              <Input
                type="number"
                value={mcqCount}
                onChange={(e) => setMcqCount(Number(e.target.value))}
                min={0}
                className="mt-1"
                data-testid="exam-mcq-count"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                أسئلة إنشائية / حل باليد
              </label>
              <Input
                type="number"
                value={writtenCount}
                onChange={(e) => setWrittenCount(Number(e.target.value))}
                min={0}
                className="mt-1"
                data-testid="exam-written-count"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                أسئلة صح / خطأ
              </label>
              <Input
                type="number"
                value={trueFalseCount}
                onChange={(e) => setTrueFalseCount(Number(e.target.value))}
                min={0}
                className="mt-1"
                data-testid="exam-truefalse-count"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                أسئلة قصيرة
              </label>
              <Input
                type="number"
                value={shortAnswerCount}
                onChange={(e) => setShortAnswerCount(Number(e.target.value))}
                min={0}
                className="mt-1"
                data-testid="exam-short-count"
              />
            </div>
          </div>
        </Card>

        {/* Generation Mode & Difficulty */}
        <Card variant="default" className="p-6">
          <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
            طريقة توليد الأسئلة
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                نمط التوليد
              </label>
              <Select
                value={generationMode}
                onChange={(e) => setGenerationMode(e.target.value)}
                options={GENERATION_MODES}
                className="mt-1"
                data-testid="exam-gen-mode"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                مستوى الصعوبة
              </label>
              <Select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                options={[
                  { value: 'EASY', label: 'سهل' },
                  { value: 'MEDIUM', label: 'متوسط' },
                  { value: 'HARD', label: 'صعب' },
                ]}
                className="mt-1"
                data-testid="exam-difficulty"
              />
            </div>
          </div>
        </Card>

        {/* Generation Error */}
        {generationError && (
          <div className="p-3 rounded-lg bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger-border)] text-[var(--color-status-danger)] text-sm">
            {generationError}
          </div>
        )}

        {/* Generate Button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={!selectedSource || !selectedSource.id || isGenerating}
          data-testid="btn-generate-exam"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin ml-2" />
          ) : (
            <Sparkles className="w-5 h-5 ml-2" />
          )}
          {isGenerating ? 'جاري توليد الاختبار...' : 'توليد الاختبار'}
        </Button>

        {/* Preview */}
        {generatedQuestions.length > 0 && (
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                معاينة الأسئلة ({generatedQuestions.length})
              </h3>
              <div className="flex gap-2">
                <Badge variant="primary" size="sm">
                  اختياري: {generatedQuestions.filter((q) => q.type === 'MULTIPLE_CHOICE').length}
                </Badge>
                <Badge variant="accent" size="sm">
                  إنشائي: {generatedQuestions.filter((q) => q.type === 'SHORT_ANSWER').length}
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              {generatedQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
                  data-testid={`generated-question-${idx}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0 text-sm font-bold text-[var(--color-brand-primary)]">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={q.type === 'MULTIPLE_CHOICE' ? 'primary' : 'accent'} size="sm">
                        {q.type === 'MULTIPLE_CHOICE' ? 'اختياري' : 'إنشائي'}
                      </Badge>
                      {q.sourcePage && (
                        <Badge variant="neutral" size="sm">صفحة {q.sourcePage}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)]">{q.body}</p>
                    {q.options && (
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {q.options.map((opt, i) => (
                          <span key={i} className="text-xs text-[var(--color-text-secondary)]">
                            {String.fromCharCode(1571 + i)}) {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Input
                      type="number"
                      value={q.marks}
                      onChange={(e) => handleUpdateMarks(q.id, Number(e.target.value))}
                      className="w-16 text-center text-xs"
                      min={1}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      data-testid={`regenerate-question-${idx}`}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-[var(--color-status-danger)]"
                      onClick={() => handleDeleteQuestion(q.id)}
                      data-testid={`delete-question-${idx}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Save / Export */}
            <div className="flex gap-3 mt-4">
              <Button variant="primary" className="flex-1" data-testid="btn-save-exam">
                <Save className="w-4 h-4 ml-1" />
                حفظ كمسودة
              </Button>
              <Button variant="secondary" className="flex-1" data-testid="btn-preview-exam">
                <Eye className="w-4 h-4 ml-1" />
                معاينة A4
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
