import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Select, Card } from '@tibyan/design-system';
import { MathRichContentEditor } from '@tibyan/design-system';
import type {
  QuestionDto,
  MathRichContent,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  CurriculumTreeNodeDto,
} from '@tibyan/contracts';
import {
  createEmptyMathRichContent,
  createTextBlock,
} from '@tibyan/contracts';
import {
  useCreateQuestion,
  useUpdateQuestion,
  useCheckQuestionDuplicate,
} from '../../hooks/useQuestionBank.js';
import { useCurriculumCatalogs, useCurriculumTree } from '../../hooks/useCurriculum.js';
import { usePdfSources, useSourceReferences } from '../../hooks/usePdfSources.js';
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  Layers,
  Plus,
  Search,
  Loader2,
} from 'lucide-react';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: QuestionDto | null;
  onSuccess?: () => void;
}

function flattenTree(nodes?: CurriculumTreeNodeDto[]): Array<{ id: string; title: string; tier: string }> {
  if (!nodes) return [];
  const result: Array<{ id: string; title: string; tier: string }> = [];
  function recurse(list: CurriculumTreeNodeDto[]) {
    for (const item of list) {
      result.push({ id: item.id, title: item.titleAr, tier: item.tier });
      if (item.children && item.children.length > 0) {
        recurse(item.children);
      }
    }
  }
  recurse(nodes);
  return result;
}

export function QuestionEditorModal({
  isOpen,
  onClose,
  questionToEdit,
  onSuccess,
}: QuestionEditorModalProps) {
  // Form State
  const [questionType, setQuestionType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [status, setStatus] = useState<QuestionStatus>('ACTIVE');
  const [body, setBody] = useState<MathRichContent>(() => createEmptyMathRichContent());
  const [modelAnswer, setModelAnswer] = useState<MathRichContent>(() => createEmptyMathRichContent());

  // Curriculum tagging state
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [curriculumNodeIds, setCurriculumNodeIds] = useState<string[]>([]);

  // Source references state
  const [selectedSourceRefIds, setSelectedSourceRefIds] = useState<string[]>([]);

  // UI / Feedback state
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    hasDuplicate: boolean;
    isExact: boolean;
    matchingQuestionId?: string;
  } | null>(null);

  // Queries & Mutations
  const { data: catalogs } = useCurriculumCatalogs();
  const { data: curriculumTree } = useCurriculumTree(selectedCatalogId || undefined);
  const { data: sourceDocuments } = usePdfSources();
  const { data: allSourceReferences } = useSourceReferences();

  const flatNodes = useMemo(() => flattenTree(curriculumTree), [curriculumTree]);

  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();
  const checkDuplicateMutation = useCheckQuestionDuplicate();

  // Populate data when editing
  useEffect(() => {
    if (questionToEdit) {
      setQuestionType(questionToEdit.questionType);
      setDifficulty(questionToEdit.difficulty);
      setStatus(questionToEdit.status);
      setBody(questionToEdit.body);
      setModelAnswer(questionToEdit.modelAnswer || createEmptyMathRichContent());
      if (questionToEdit.curriculumTags) {
        setCurriculumNodeIds(questionToEdit.curriculumTags);
      }
      if (questionToEdit.sourceReferences) {
        setSelectedSourceRefIds(questionToEdit.sourceReferences.map((r) => r.sourceReferenceId));
      }
    } else {
      setQuestionType('MULTIPLE_CHOICE');
      setDifficulty('MEDIUM');
      setStatus('ACTIVE');
      setBody({ version: 1, blocks: [createTextBlock('اكتب نص المسألة هنا...')] });
      setModelAnswer(createEmptyMathRichContent());
      setCurriculumNodeIds([]);
      setSelectedSourceRefIds([]);
      setDuplicateWarning(null);
      setError(null);
    }
  }, [questionToEdit, isOpen]);

  const handleAddCurriculumTag = () => {
    if (!selectedNodeId) return;
    if (curriculumNodeIds.includes(selectedNodeId)) return;
    setCurriculumNodeIds([...curriculumNodeIds, selectedNodeId]);
    setSelectedNodeId('');
  };

  const handleRemoveCurriculumTag = (nodeId: string) => {
    setCurriculumNodeIds(curriculumNodeIds.filter((id) => id !== nodeId));
  };

  const handleToggleSourceRef = (refId: string) => {
    if (selectedSourceRefIds.includes(refId)) {
      setSelectedSourceRefIds(selectedSourceRefIds.filter((id) => id !== refId));
    } else {
      setSelectedSourceRefIds([...selectedSourceRefIds, refId]);
    }
  };

  const handleCheckDuplicate = async () => {
    try {
      const res = await checkDuplicateMutation.mutateAsync({
        body,
        excludeQuestionId: questionToEdit?.id,
      });
      if (res.isDuplicate && res.matchLevel === 'EXACT') {
        setDuplicateWarning({
          hasDuplicate: true,
          isExact: true,
          matchingQuestionId: res.existingQuestionCode || res.existingQuestionId,
        });
      } else if (res.isDuplicate && res.matchLevel === 'CANDIDATE') {
        setDuplicateWarning({
          hasDuplicate: true,
          isExact: false,
          matchingQuestionId: res.existingQuestionCode || res.existingQuestionId,
        });
      } else {
        setDuplicateWarning({ hasDuplicate: false, isExact: false });
      }
    } catch {
      // Duplicate check error fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body || body.blocks.length === 0) {
      setError('يرجى كتابة نص المسألة أو إضافة محتواها');
      return;
    }
    if (curriculumNodeIds.length === 0) {
      setError('يجب ربط المسألة بموضوع أو مهارة منهجية واحدة على الأقل');
      return;
    }

    setError(null);
    try {
      if (questionToEdit) {
        await updateMutation.mutateAsync({
          id: questionToEdit.id,
          data: {
            id: questionToEdit.id,
            questionType,
            difficulty,
            status,
            body,
            modelAnswer: modelAnswer.blocks.length > 0 ? modelAnswer : undefined,
            curriculumNodeIds,
            sourceReferenceIds: selectedSourceRefIds,
          },
        });
      } else {
        await createMutation.mutateAsync({
          questionType,
          difficulty,
          status,
          body,
          modelAnswer: modelAnswer.blocks.length > 0 ? modelAnswer : undefined,
          defaultMarks: 1,
          languageTrack: 'ARABIC',
          curriculumNodeIds,
          sourceReferenceIds: selectedSourceRefIds,
        });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المسألة');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <span>{questionToEdit ? `تعديل المسألة (${questionToEdit.code})` : 'إنشاء مسألة جديدة في بنك الأسئلة'}</span>
        </div>
      }
      description="تحرير محتوى المسألة الرياضي، وربطها بالمفاهيم المنهجية ومراجع الكتب الرقمية"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6" dir="rtl" data-testid="question-editor-form">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Duplicate Warning Indicator */}
        {duplicateWarning && (
          <div
            className={`flex items-center justify-between p-3 rounded-lg text-xs border ${
              duplicateWarning.isExact
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : duplicateWarning.hasDuplicate
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            }`}
            data-testid="duplicate-check-indicator"
          >
            <div className="flex items-center gap-2">
              {duplicateWarning.hasDuplicate ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>
                {duplicateWarning.isExact
                  ? `تنبيه: محتوى المسألة مطابق تماماً للمسألة الموجودة (${duplicateWarning.matchingQuestionId})`
                  : duplicateWarning.hasDuplicate
                  ? `ملاحظة: يوجد تشابه مع المسألة (${duplicateWarning.matchingQuestionId})`
                  : 'تم التحقق: لا توجد أي مسائل مكررة مطابقة في بنك الأسئلة'}
              </span>
            </div>
          </div>
        )}

        {/* Classifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">نوع المسألة</label>
            <Select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              options={[
                { value: 'MULTIPLE_CHOICE', label: 'اختيار من متعدد' },
                { value: 'SHORT_ANSWER', label: 'إجابة قصيرة' },
                { value: 'ESSAY', label: 'حل تفصيلي / مقالي' },
                { value: 'TRUE_FALSE', label: 'صواب / خطأ' },
              ]}
              data-testid="question-type-select"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">مستوى الصعوبة</label>
            <Select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
              options={[
                { value: 'EASY', label: 'سهل' },
                { value: 'MEDIUM', label: 'متوسط' },
                { value: 'HARD', label: 'صعب' },
                { value: 'CHALLENGE', label: 'تحدي' },
              ]}
              data-testid="question-difficulty-select"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">الحالة</label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as QuestionStatus)}
              options={[
                { value: 'ACTIVE', label: 'نشطة' },
                { value: 'DRAFT', label: 'مسودة' },
                { value: 'ARCHIVED', label: 'مؤرشفة' },
              ]}
              data-testid="question-status-select"
            />
          </div>
        </div>

        {/* Question Body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              نص المسألة والصياغة الرياضية <span className="text-red-500">*</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCheckDuplicate}
              disabled={checkDuplicateMutation.isPending}
              className="text-xs text-[var(--color-brand-primary)]"
              data-testid="check-duplicate-btn"
            >
              {checkDuplicateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 me-1" />
              )}
              فحص التكرار
            </Button>
          </div>
          <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
            <MathRichContentEditor
              initialContent={body}
              onChange={(doc) => setBody(doc)}
              testId="question-body-editor"
            />
          </div>
        </div>

        {/* Model Answer Content */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--color-text-primary)]">
            الإجابة النموذجية أو خطوات الحل (اختياري)
          </label>
          <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
            <MathRichContentEditor
              initialContent={modelAnswer}
              onChange={(doc) => setModelAnswer(doc)}
              testId="question-answer-editor"
            />
          </div>
        </div>

        {/* Section: Curriculum Tagging */}
        <Card className="p-4 space-y-3 bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--color-brand-primary)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
              التصنيف المنهجي والمهارات <span className="text-red-500">*</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select
              value={selectedCatalogId}
              onChange={(e) => setSelectedCatalogId(e.target.value)}
              options={[
                { value: '', label: 'اختر المنهج الدراسي...' },
                ...(catalogs || []).map((c) => ({ value: c.id, label: `${c.title} (${c.gradeLevel})` })),
              ]}
              data-testid="tag-catalog-select"
            />

            <Select
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              disabled={!selectedCatalogId}
              options={[
                { value: '', label: 'اختر الموضوع المنهجي...' },
                ...flatNodes.map((n) => ({ value: n.id, label: `${n.title} (${n.tier})` })),
              ]}
              data-testid="tag-node-select"
            />

            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCurriculumTag}
                disabled={!selectedNodeId}
                data-testid="add-curriculum-tag-btn"
              >
                <Plus className="w-3.5 h-3.5 me-1" />
                إضافة وسام المنهج
              </Button>
            </div>
          </div>

          {/* Tags List */}
          {curriculumNodeIds.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              {curriculumNodeIds.map((nodeId) => (
                <div
                  key={nodeId}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs"
                >
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {flatNodes.find((n) => n.id === nodeId)?.title || nodeId.substring(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCurriculumTag(nodeId)}
                    className="text-red-500 hover:text-red-700 ms-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--color-text-muted)] pt-1">
              يجب تعيين وسام منهجي واحد على الأقل قبل حفظ المسألة.
            </p>
          )}
        </Card>

        {/* Section: Source References Linking */}
        <Card className="p-4 space-y-3 bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[var(--color-brand-primary)]" />
            <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
              ربط مراجع الكتب الرقمية (Multi-Source Linking)
            </h3>
          </div>

          {!allSourceReferences || allSourceReferences.length === 0 ? (
            <div className="text-[11px] text-[var(--color-text-muted)] italic">
              لا توجد مراجع صفحات مسجلة بعد. يمكنك إضافة مراجع من صفحة "المصادر والمراجع (PDF)".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pe-1">
              {allSourceReferences.map((ref) => {
                const isSelected = selectedSourceRefIds.includes(ref.id);
                const docTitle =
                  sourceDocuments?.find((d) => d.id === ref.sourceDocumentId)?.title || 'وثيقة';

                return (
                  <label
                    key={ref.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                        : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSourceRef(ref.id)}
                      className="rounded border-[var(--color-border-default)] text-[var(--color-brand-primary)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--color-text-primary)] truncate">{ref.referenceLabel}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)] truncate">
                        {docTitle} (ص {ref.startPage}
                        {ref.endPage && ref.endPage !== ref.startPage ? ` - ${ref.endPage}` : ''})
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-border-subtle)]">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="save-question-submit-btn"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                جاري الحفظ...
              </>
            ) : questionToEdit ? (
              'تحديث المسألة'
            ) : (
              'حفظ المسألة في البنك'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
