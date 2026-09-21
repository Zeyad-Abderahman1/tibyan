import { useState } from 'react';
import { Card, Button, Badge, Input, Select } from '@tibyan/design-system';
import { FileText, Loader2, Sparkles, Trash2, RefreshCw, Eye, Save } from 'lucide-react';
import { SourcePicker, type SourceSelection } from './SourcePicker.js';
import { createTextBlock, type MathRichContent } from '@tibyan/contracts';

interface ExamQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'TRUE_FALSE';
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

function toRichContent(text: string): MathRichContent {
  return { version: 1, blocks: [createTextBlock(text)] };
}

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
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<ExamQuestion[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [savedExamId, setSavedExamId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedSource || !selectedSource.id) return;
    setIsGenerating(true);
    setGenerationError(null);
    setSavedExamId(null);
    try {
      const totalRequested = mcqCount + writtenCount + trueFalseCount + shortAnswerCount;
      const types: Array<'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'TRUE_FALSE' | 'WRITTEN'> = [];
      if (mcqCount > 0) types.push('MULTIPLE_CHOICE');
      if (trueFalseCount > 0) types.push('TRUE_FALSE');
      if (writtenCount > 0 || shortAnswerCount > 0) types.push('SHORT_ANSWER');

      const result = await window.tibyan.ai.generateExam({
        sourceId: selectedSource.id,
        config: {
          questionCount: totalRequested,
          difficulty,
          types,
          mcqCount,
          writtenCount,
          trueFalseCount,
          shortAnswerCount,
          generationMode,
        },
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'فشل توليد الاختبار');
      }

      const parsed = result.data.data.questions;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setGenerationError('لم يتم توليد أسئلة. تأكد من أن المصدر يحتوي على محتوى كافٍ.');
        return;
      }

      const questions: ExamQuestion[] = parsed.map((q, idx) => {
        let type: ExamQuestion['type'] = 'SHORT_ANSWER';
        if (q.type === 'TRUE_FALSE') {
          type = 'TRUE_FALSE';
        } else if (q.type === 'MULTIPLE_CHOICE') {
          type = 'MULTIPLE_CHOICE';
        }
        const body = q.body;
        let options = q.options;
        if (type === 'TRUE_FALSE') {
          options = options || ['صح', 'خطأ'];
        }
        return {
          id: `q-${Date.now()}-${idx}`,
          type,
          body,
          options: options || undefined,
          correctAnswer: q.correctAnswer,
          marks: q.marks,
          sourcePage: q.sourcePage,
        };
      });

      setGeneratedQuestions(questions);
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء توليد الاختبار');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSingle = async (questionId: string) => {
    if (!selectedSource || !selectedSource.id) return;
    const question = generatedQuestions.find((q) => q.id === questionId);
    if (!question) return;

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await window.tibyan.ai.generateExam({
        sourceId: selectedSource.id,
        config: {
          questionCount: 1,
          difficulty,
          types: [question.type],
          generationMode,
        },
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'فشل إعادة التوليد');
      }

      const parsed = result.data.data.questions;

      if (parsed.length > 0) {
        const newQ = parsed[0]!;
        setGeneratedQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  body: newQ.body,
                  options: newQ.options ?? q.options,
                  correctAnswer: newQ.correctAnswer,
                  sourcePage: newQ.sourcePage,
                }
              : q
          )
        );
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء إعادة التوليد');
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

  const handleSaveDraft = async () => {
    if (generatedQuestions.length === 0) return;
    setIsSaving(true);
    setGenerationError(null);
    try {
      const totalQ = generatedQuestions.length;
      const totalM = generatedQuestions.reduce((s, q) => s + q.marks, 0);
      const typeDistribution: Record<string, number> = {};
      const diffDistribution: Record<string, number> = {};
      for (const q of generatedQuestions) {
        typeDistribution[q.type] = (typeDistribution[q.type] || 0) + 1;
        diffDistribution[difficulty] = (diffDistribution[difficulty] || 0) + 1;
      }

      const blueprint = {
        title: title || `اختبار تجريبي - ${new Date().toLocaleDateString('ar')}`,
        gradeLevel: gradeLevel as any,
        languageTrack: 'ARABIC' as const,
        curriculumNodeIds: [],
        sourceReferenceIds: [],
        totalQuestions: totalQ,
        totalMarks: totalM,
        durationMinutes,
        difficultyDistribution: diffDistribution,
        questionTypeDistribution: typeDistribution,
        variantCount,
      };

      const placements = generatedQuestions.map((q, idx) => ({
        provenance: 'AI_CANDIDATE' as const,
        body: toRichContent(q.body),
        modelAnswer: q.correctAnswer ? toRichContent(q.correctAnswer) : null,
        marks: q.marks,
        answerSpaceLines: answerLines,
        curriculumNodeIds: [],
        sourceReferenceIds: [],
        position: idx,
      }));

      const result = await window.tibyan.exams.confirmAssembly({
        blueprint,
        placements,
        sectionTitle: 'القسم الرئيسي',
      });

      if (result.success) {
        setSavedExamId((result.data as any).id);
      } else {
        throw new Error(result.error?.message || 'فشل حفظ الاختبار');
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewA4 = async (examId?: string) => {
    const targetId = examId || savedExamId;
    if (!targetId) {
      setGenerationError('احفظ الاختبار أولاً ثم قم بالمعاينة');
      return;
    }
    setIsPreviewing(true);
    setGenerationError(null);
    try {
      const result = await window.tibyan.exams.renderLayout({
        examId: targetId,
        kind: 'STUDENT',
      });
      if (result.success) {
        const html = result.data as string;
        const win = window.open('', '_blank', 'width=800,height=1000');
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      } else {
        throw new Error(result.error?.message || 'فشل توليد المعاينة');
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'حدث خطأ أثناء المعاينة');
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
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

        <SourcePicker
          selectedSource={selectedSource}
          onSourceSelected={setSelectedSource}
          onSourceCleared={() => setSelectedSource(null)}
          label="مصدر الاختبار"
        />

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
                أسئلة إنشائية / قصيرة
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
                أسئلة قصيرة جداً
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

        {generationError && (
          <div className="p-3 rounded-lg bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger-border)] text-[var(--color-status-danger)] text-sm">
            {generationError}
          </div>
        )}

        {savedExamId && (
          <div className="p-3 rounded-lg bg-[var(--color-status-success-bg)] border border-[var(--color-status-success-border)] text-[var(--color-status-success)] text-sm">
            تم حفظ الاختبار بنجاح
          </div>
        )}

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
                <Badge variant="info" size="sm">
                  صح/خطأ: {generatedQuestions.filter((q) => q.type === 'TRUE_FALSE').length}
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
                      <Badge
                        variant={
                          q.type === 'MULTIPLE_CHOICE'
                            ? 'primary'
                            : q.type === 'TRUE_FALSE'
                            ? 'info'
                            : 'accent'
                        }
                        size="sm"
                      >
                        {q.type === 'MULTIPLE_CHOICE'
                          ? 'اختياري'
                          : q.type === 'TRUE_FALSE'
                          ? 'صح/خطأ'
                          : 'إنشائي'}
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
                            {q.type === 'TRUE_FALSE'
                              ? i === 0
                                ? '✓'
                                : '✗'
                              : `${String.fromCharCode(1571 + i)})`}{' '}
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                    {q.correctAnswer && (
                      <p className="mt-1 text-xs text-[var(--color-status-success)]">
                        الإجابة: {q.correctAnswer}
                      </p>
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
                      onClick={() => handleRegenerateSingle(q.id)}
                      disabled={isGenerating}
                      data-testid={`regenerate-question-${idx}`}
                    >
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
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

            <div className="flex gap-3 mt-4">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSaveDraft}
                disabled={isSaving}
                data-testid="btn-save-exam"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                ) : (
                  <Save className="w-4 h-4 ml-1" />
                )}
                {isSaving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handlePreviewA4()}
                disabled={isPreviewing || !savedExamId}
                data-testid="btn-preview-exam"
              >
                {isPreviewing ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                ) : (
                  <Eye className="w-4 h-4 ml-1" />
                )}
                {isPreviewing ? 'جاري التحميل...' : 'معاينة A4'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
