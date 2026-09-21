import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Edit3,
  RotateCcw,
  BookOpen,
  Star,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Input,
} from '@tibyan/design-system';
import type { GradingDecisionDto, ExtractedAnswerDto } from '@tibyan/contracts';
import {
  useCaptureSubmission,
} from '../../hooks/useCapture.js';
import {
  useGradingDecisions,
  useOverrideDecision,
  useFinalizeSubmission,
  useGradeSubmission,
  useGradeSubmissionAi,
  useGradingStatus,
  useExtractedAnswers,
  useReviewAnswer,
  useRegradeSubmission,
} from '../../hooks/useGrading.js';

export function CorrectionWorkspace() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const { data: submission, isLoading: subLoading, error: subError } = useCaptureSubmission(submissionId || '');
  const { data: decisions = [], isLoading: decisionsLoading, refetch: refetchDecisions } = useGradingDecisions(submissionId || '');
  const { data: gradingStatus } = useGradingStatus(submissionId || '');
  const { data: extractedAnswers = [], refetch: refetchExtracted } = useExtractedAnswers(submissionId || '');

  const overrideDecision = useOverrideDecision();
  const finalizeSubmission = useFinalizeSubmission();
  const gradeSubmission = useGradeSubmission();
  const gradeSubmissionAi = useGradeSubmissionAi();
  const reviewAnswer = useReviewAnswer();
  const regrade = useRegradeSubmission();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editAwarded, setEditAwarded] = useState<number>(0);
  const [editRationale, setEditRationale] = useState('');
  const [activeTab, setActiveTab] = useState<'decisions' | 'extracted'>('decisions');

  const currentDecision = decisions[currentIndex];
  const totalPages = decisions.length;
  const isFinalized = gradingStatus?.status === 'FINALIZED';

  const handlePrev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex(i => Math.min(totalPages - 1, i + 1));

  const handleOverride = async (decision: GradingDecisionDto) => {
    if (!submissionId) return;
    try {
      await overrideDecision.mutateAsync({
        decisionId: decision.id,
        awardedMarks: editAwarded,
        rationale: editRationale || undefined,
      });
      setEditMode(false);
      refetchDecisions();
    } catch {
      // Error handled by mutation
    }
  };

  const handleFinalize = async () => {
    if (!submissionId) return;
    try {
      await finalizeSubmission.mutateAsync({ submissionId });
    } catch {
      // Error handled by mutation
    }
  };

  const handleGrade = async () => {
    if (!submissionId) return;
    try {
      await gradeSubmission.mutateAsync({ submissionId, method: 'DETERMINISTIC' });
      refetchDecisions();
    } catch {
      // Error handled by mutation
    }
  };

  const handleGradeAi = async () => {
    if (!submissionId) return;
    try {
      await gradeSubmissionAi.mutateAsync({ submissionId, method: 'AI_ASSISTED' });
      refetchDecisions();
    } catch {
      // Error handled by mutation
    }
  };

  const handleRegrade = async () => {
    if (!submissionId) return;
    try {
      await regrade.mutateAsync({ submissionId });
      refetchDecisions();
    } catch {
      // Error handled by mutation
    }
  };

  const handleReviewAnswer = async (answer: ExtractedAnswerDto, action: string) => {
    if (!submissionId) return;
    try {
      await reviewAnswer.mutateAsync({
        answerId: answer.id,
        action: action as any,
      });
      refetchExtracted();
    } catch {
      // Error handled by mutation
    }
  };

  if (subLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="correction-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
          <span className="text-sm text-[var(--color-text-secondary)]">جاري تحميل بيانات التصحيح...</span>
        </div>
      </div>
    );
  }

  if (subError || !submission) {
    return (
      <Card variant="subtle" className="p-8 text-center space-y-3" data-testid="correction-error">
        <div className="w-10 h-10 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] flex items-center justify-center mx-auto">
          <AlertCircle size={20} />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">تعذر تحميل بيانات التصحيح</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">{(subError as Error)?.message || 'بيانات التسليم غير متوفرة'}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          العودة
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="page-correction-workspace">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
            <ChevronRight size={16} />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">workspace التصحيح</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[var(--color-text-secondary)]">
                {submission.studentName || 'طالب غير محدد'}
              </span>
              {submission.studentCode && (
                <span className="font-mono text-xs text-[var(--color-text-muted)]" dir="ltr">{submission.studentCode}</span>
              )}
              {isFinalized && (
                <Badge variant="success" size="sm">
                  <Check size={10} className="me-1" />
                  مُنهى
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isFinalized && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGrade}
                disabled={gradeSubmission.isPending}
                data-testid="grade-deterministic-btn"
              >
                <BookOpen size={14} className="me-1" />
                تقييم تلقائي
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGradeAi}
                disabled={gradeSubmissionAi.isPending}
                data-testid="grade-ai-btn"
              >
                <Star size={14} className="me-1" />
                تقييم بالذكاء الاصطناعي
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grading Status Bar */}
      {gradingStatus && (
        <Card variant="default" className="p-3 flex items-center justify-between" data-testid="grading-status">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-muted)]">الدرجة الممنوحة</p>
              <p className="text-lg font-bold text-[var(--color-brand-primary)]">{gradingStatus.totalAwarded}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-muted)]">الدرجة القصوى</p>
              <p className="text-lg font-bold text-[var(--color-text-secondary)]">{gradingStatus.totalMax}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-muted)]">النسبة</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">
                {gradingStatus.totalMax > 0 ? Math.round((gradingStatus.totalAwarded / gradingStatus.totalMax) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isFinalized && decisions.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleFinalize}
                disabled={finalizeSubmission.isPending}
                data-testid="finalize-btn"
              >
                <Check size={14} className="me-1" />
                تأكيد التقييم النهائي
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[var(--color-border-subtle)]">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'decisions'
              ? 'text-[var(--color-brand-primary)] border-b-2 border-[var(--color-brand-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          onClick={() => setActiveTab('decisions')}
          data-testid="tab-decisions"
        >
          قرارات التقييم ({decisions.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'extracted'
              ? 'text-[var(--color-brand-primary)] border-b-2 border-[var(--color-brand-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          onClick={() => setActiveTab('extracted')}
          data-testid="tab-extracted"
        >
          الإجابات المستخرجة ({extractedAnswers.length})
        </button>
      </div>

      {/* Decisions Tab */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          {decisionsLoading ? (
            <Card variant="default" className="p-8 text-center text-xs text-[var(--color-text-muted)]">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
                <span>جاري تحميل قرارات التقييم...</span>
              </div>
            </Card>
          ) : decisions.length === 0 ? (
            <Card variant="default" className="p-12 text-center space-y-3" data-testid="no-decisions">
              <div className="w-12 h-12 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)] flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">لم يتم التقييم بعد</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                اضغط "تقييم تلقائي" أو "تقييم بالذكاء الاصطناعي" لبدء التصحيح
              </p>
            </Card>
          ) : (
            <>
              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  data-testid="prev-question-btn"
                >
                  <ChevronRight size={14} className="me-1" />
                  السؤال السابق
                </Button>
                <span className="text-xs text-[var(--color-text-muted)]">
                  سؤال {currentIndex + 1} من {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === totalPages - 1}
                  data-testid="next-question-btn"
                >
                  السؤال التالي
                  <ChevronLeft size={14} className="ms-1" />
                </Button>
              </div>

              {/* Current Decision Card */}
              {currentDecision && (
                <Card variant="default" className="p-5 space-y-4" data-testid="current-decision">
                  {/* Question Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                        السؤال {currentDecision.questionPosition}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        نوع: {currentDecision.gradingMethod}
                      </p>
                    </div>
                    <div className="text-center shrink-0 ms-4">
                      <p className="text-xs text-[var(--color-text-muted)]">الدرجة القصوى</p>
                      <p className="text-lg font-bold text-[var(--color-text-primary)]">{currentDecision.questionMarks}</p>
                    </div>
                  </div>

                  {/* Grading Results */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Current Awarded */}
                    <div className="bg-[var(--color-bg-surface-subtle)] rounded-lg p-3">
                      <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">الدرجة الممنوحة</p>
                      <p className="text-lg font-bold text-[var(--color-brand-primary)]">
                        {currentDecision.awardedMarks} / {currentDecision.questionMarks}
                      </p>
                      {currentDecision.teacherOverride && (
                        <Badge variant="warning" size="sm" className="mt-1">
                          <Edit3 size={10} className="me-1" />
                          تعديل يدوي
                        </Badge>
                      )}
                    </div>

                    {/* Status */}
                    <div className="bg-[var(--color-bg-surface-subtle)] rounded-lg p-3">
                      <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">الحالة</p>
                      <Badge
                        variant={
                          currentDecision.status === 'FINALIZED' ? 'success' :
                          currentDecision.status === 'GRADED' ? 'accent' :
                          currentDecision.status === 'OVERRIDDEN' ? 'warning' : 'neutral'
                        }
                        size="sm"
                      >
                        {currentDecision.status}
                      </Badge>
                    </div>

                    {/* AI Proposal */}
                    <div className="bg-[var(--color-bg-surface-subtle)] rounded-lg p-3">
                      <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">اقتراح الذكاء الاصطناعي</p>
                      {currentDecision.aiProposalJson ? (
                        <p className="text-sm text-[var(--color-brand-accent)]">متوفر</p>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)]">غير متوفر</p>
                      )}
                    </div>
                  </div>

                  {/* Rubric Results */}
                  {currentDecision.rubricResultsJson && (() => {
                    try {
                      const rubric = JSON.parse(currentDecision.rubricResultsJson);
                      return Array.isArray(rubric) && rubric.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-[var(--color-text-secondary)]">تفصيل المعايير:</p>
                          {rubric.map((r: any, ri: number) => (
                            <div key={ri} className="flex items-center justify-between bg-[var(--color-bg-surface-subtle)] rounded p-2">
                              <span className="text-xs text-[var(--color-text-primary)]">{r.criterionLabel || r.criterionKey}</span>
                              <span className="text-xs font-bold text-[var(--color-brand-primary)]">{r.awardedMarks}/{r.maxMarks}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    } catch { return null; }
                  })()}

                  {/* Edit Form */}
                  {editMode && (
                    <div className="border border-[var(--color-brand-primary)] rounded-lg p-4 space-y-3" data-testid="edit-override-form">
                      <h4 className="text-sm font-bold text-[var(--color-text-primary)]">تعديل يدوي</h4>
                      <div className="flex items-end gap-3">
                        <div className="w-32">
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">الدرجة</label>
                          <Input
                            type="number"
                            min={0}
                            max={currentDecision.questionMarks}
                            value={editAwarded}
                            onChange={(e) => setEditAwarded(Number(e.target.value))}
                            data-testid="edit-awarded-input"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">التوضيح</label>
                          <Input
                            value={editRationale}
                            onChange={(e) => setEditRationale(e.target.value)}
                            placeholder="سبب التعديل..."
                            data-testid="edit-rationale-input"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOverride(currentDecision)}
                          disabled={editAwarded < 0 || editAwarded > currentDecision.questionMarks || overrideDecision.isPending}
                          data-testid="save-override-btn"
                        >
                          حفظ التعديل
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditMode(false)}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!editMode && !isFinalized && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditMode(true);
                          setEditAwarded(currentDecision.awardedMarks);
                          setEditRationale('');
                        }}
                        data-testid="edit-decision-btn"
                      >
                        <Edit3 size={14} className="me-1" />
                        تعديل يدوي
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRegrade}
                        disabled={regrade.isPending}
                        data-testid="regrade-btn"
                      >
                        <RotateCcw size={14} className="me-1" />
                        إعادة التقييم
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Extracted Answers Tab */}
      {activeTab === 'extracted' && (
        <div className="space-y-3">
          {extractedAnswers.length === 0 ? (
            <Card variant="default" className="p-12 text-center space-y-3" data-testid="no-extracted">
              <p className="text-sm text-[var(--color-text-secondary)]">لا توجد إجابات مستخرجة</p>
              <p className="text-xs text-[var(--color-text-muted)]">قم بتقييم التسليم أولاً لاستخراج الإجابات</p>
            </Card>
          ) : (
            extractedAnswers.map((answer) => (
              <Card key={answer.id} variant="default" className="p-4 space-y-2" data-testid={`extracted-answer-${answer.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                      السؤال {answer.examQuestionId.slice(0, 8)}
                    </p>
                    <p className="text-sm text-[var(--color-text-primary)] mt-1">
                      {answer.recognizedResponse || answer.recognizedOptionLabel || '—'}
                    </p>
                  </div>
                  <Badge
                    variant={answer.status === 'EXTRACTED' || answer.status === 'REVIEWED' ? 'success' : answer.status === 'FAILED' ? 'danger' : 'neutral'}
                    size="sm"
                  >
                    {answer.status}
                  </Badge>
                </div>
                {answer.confidence != null && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    الثقة: {Math.round(answer.confidence * 100)}% — الطريقة: {answer.extractionMethod}
                  </p>
                )}
                {!isFinalized && answer.status !== 'REVIEWED' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReviewAnswer(answer, 'APPROVE')}
                      disabled={reviewAnswer.isPending}
                    >
                      <Check size={12} className="me-1" />
                      تأكيد
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReviewAnswer(answer, 'REJECT')}
                      disabled={reviewAnswer.isPending}
                    >
                      <X size={12} className="me-1" />
                      رفض
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
