import { useState } from 'react';
import { Modal, Button, Badge, Card, Select } from '@tibyan/design-system';
import { MathRichContentViewer } from '@tibyan/design-system';
import type {
  BulkQuestionItemDto,
  BulkImportReviewItemDto,
} from '@tibyan/contracts';
import {
  usePreviewBulkQuestions,
  useCommitBulkQuestions,
} from '../../hooks/useQuestionBank.js';
import { useCurriculumCatalogs, useCurriculumTree } from '../../hooks/useCurriculum.js';
import {
  Upload,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Bookmark,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface BulkQuestionIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type IngestionAction = 'CREATE_NEW' | 'LINK_SOURCE' | 'DISMISS';

export function BulkQuestionIngestionModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkQuestionIngestionModalProps) {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [reviewItems, setReviewItems] = useState<BulkImportReviewItemDto[] | null>(null);
  const [actionChoices, setActionChoices] = useState<Record<string, IngestionAction>>({});
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [commitSuccess, setCommitSuccess] = useState<boolean>(false);

  const { data: catalogs } = useCurriculumCatalogs();
  const defaultCatalog = catalogs?.[0];
  const { data: curriculumTree } = useCurriculumTree(defaultCatalog?.id);

  const previewMutation = usePreviewBulkQuestions();
  const commitMutation = useCommitBulkQuestions();

  const handleLoadSample = () => {
    const firstNodeId = curriculumTree?.[0]?.id || '00000000-0000-0000-0000-000000000001';
    const sampleItems: BulkQuestionItemDto[] = [
      {
        tempId: 'sample-1',
        questionType: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        defaultMarks: 1,
        languageTrack: 'ARABIC',
        body: {
          version: 1,
          blocks: [
            { id: 'b1', type: 'text', content: 'أوجد مجموعة حل المعادلة التربيعية الآتية:', direction: 'auto' },
            { id: 'b2', type: 'math', latex: 'x^2 - 5x + 6 = 0', displayMode: 'block' },
          ],
        },
        modelAnswer: {
          version: 1,
          blocks: [
            { id: 'b3', type: 'text', content: 'الحلان هما 2 و 3', direction: 'auto' },
          ],
        },
        curriculumNodeIds: [firstNodeId],
        sourceReferenceIds: [],
      },
      {
        tempId: 'sample-2',
        questionType: 'SHORT_ANSWER',
        difficulty: 'EASY',
        defaultMarks: 2,
        languageTrack: 'ARABIC',
        body: {
          version: 1,
          blocks: [
            { id: 'b4', type: 'text', content: 'إذا كان المثلث قائم الزاوية، احسب طول الوتر إذا كان طولا ضلعي القائمة:', direction: 'auto' },
            { id: 'b5', type: 'math', latex: 'a = 3, \\; b = 4', displayMode: 'inline' },
          ],
        },
        modelAnswer: {
          version: 1,
          blocks: [{ id: 'b6', type: 'math', latex: 'c = 5', displayMode: 'inline' }],
        },
        curriculumNodeIds: [firstNodeId],
        sourceReferenceIds: [],
      },
    ];

    setJsonInput(JSON.stringify(sampleItems, null, 2));
    setError(null);
  };

  const handlePreview = async () => {
    if (!jsonInput.trim()) {
      setError('يرجى إدخال بيانات المسائل بصيغة JSON أو تحميل النموذج');
      return;
    }

    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setError('صيغة JSON غير صالحة، يرجى التحقق من الأقواس والفواصل');
      return;
    }

    if (!Array.isArray(parsed)) {
      setError('يجب أن تكون المدخلات مصفوفة من المسائل');
      return;
    }

    try {
      const results = await previewMutation.mutateAsync(parsed as BulkQuestionItemDto[]);
      setReviewItems(results);

      const initialActions: Record<string, IngestionAction> = {};
      for (const item of results) {
        initialActions[item.tempId] = item.suggestedAction;
      }
      setActionChoices(initialActions);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل تحليل دفعة الاستيراد');
    }
  };

  const handleActionChange = (tempId: string, action: IngestionAction) => {
    setActionChoices((prev) => ({
      ...prev,
      [tempId]: action,
    }));
  };

  const handleCommit = async () => {
    if (!reviewItems || reviewItems.length === 0) return;
    if (!confirmed) {
      setError('يرجى تأكيد مراجعة المسائل قبل بدء الحفظ النهائي');
      return;
    }

    setError(null);
    try {
      const actions = reviewItems.map((item) => ({
        tempId: item.tempId,
        action: actionChoices[item.tempId] || item.suggestedAction,
        targetQuestionId: item.duplicateMatch?.existingQuestionId,
        item: item.item,
      }));

      await commitMutation.mutateAsync({ actions });
      setCommitSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الاستيراد');
    }
  };

  const handleReset = () => {
    setReviewItems(null);
    setActionChoices({});
    setConfirmed(false);
    setError(null);
    setCommitSuccess(false);
  };

  const totalCount = reviewItems?.length || 0;
  const validCount = reviewItems?.filter((i) => i.status === 'VALID').length || 0;
  const errorCount = reviewItems?.filter((i) => i.validationErrors.length > 0).length || 0;
  const exactDuplicates = reviewItems?.filter((i) => i.status === 'DUPLICATE_EXACT').length || 0;
  const candidateDuplicates = reviewItems?.filter((i) => i.status === 'DUPLICATE_CANDIDATE').length || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <span>استيراد دفعة ومراجعة التكرار (Bulk Ingestion Review)</span>
        </div>
      }
      description="استيراد متعدد لمسائل بنك الأسئلة، وفحص دقيق للتكرار وتعدد المصادر قبل الاعتماد"
      size="xl"
    >
      <div className="space-y-6" dir="rtl" data-testid="bulk-ingestion-modal">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {commitSuccess ? (
          <div className="p-8 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
              تم اعتماد واستيراد الدفعة بنجاح!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              تمت معالجة جميع المسائل وفق الإجراءات المحددة، وسجلت العمليات في سجل التدقيق الأمني.
            </p>
            <div className="pt-2">
              <Button variant="primary" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        ) : !reviewItems ? (
          /* Step 1: Input JSON or Load Template */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                بيانات المسائل بصيغة JSON:
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleLoadSample}
                className="text-xs"
                data-testid="load-sample-btn"
              >
                تحميل نموذج تجريبي
              </Button>
            </div>

            <textarea
              rows={12}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="الصق هنا مصفوفة المسائل بصيغة JSON..."
              className="w-full p-3 font-mono text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
              dir="ltr"
              data-testid="bulk-json-input"
            />

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                يدعم الاستيراد صياغة LaTeX، التصنيفات المنهجية، خيارات الأسئلة، ومراجع الصفحات.
              </p>
              <Button
                variant="primary"
                onClick={handlePreview}
                disabled={previewMutation.isPending || !jsonInput.trim()}
                data-testid="preview-bulk-btn"
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                    جاري الفحص والتحليل...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 me-1.5" />
                    معاينة وفحص التكرار
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Interactive Review Table & Action Assignment */
          <div className="space-y-4">
            {/* Stats Summary Bar */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--color-text-primary)]">إجمالي الدفعة: {totalCount}</span>
                <Badge variant="success" size="sm">
                  {validCount} صالحة
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="danger" size="sm">
                    {errorCount} أخطاء تحقق
                  </Badge>
                )}
                {exactDuplicates > 0 && (
                  <Badge variant="warning" size="sm">
                    {exactDuplicates} تطابق تام
                  </Badge>
                )}
                {candidateDuplicates > 0 && (
                  <Badge variant="neutral" size="sm">
                    {candidateDuplicates} تطابق مرشح
                  </Badge>
                )}
              </div>

              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                <RotateCcw className="w-3.5 h-3.5 me-1" />
                إعادة التحميل
              </Button>
            </div>

            {/* Questions Review List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pe-1">
              {reviewItems.map((item, index) => {
                const currentAction = actionChoices[item.tempId] || item.suggestedAction;
                const hasExact = item.status === 'DUPLICATE_EXACT';
                const hasCand = item.status === 'DUPLICATE_CANDIDATE';
                const matchedCode =
                  item.duplicateMatch?.existingQuestionCode || item.duplicateMatch?.existingQuestionId;

                return (
                  <Card
                    key={item.tempId}
                    className={`p-4 space-y-3 border transition-colors bg-[var(--color-bg-surface)] ${
                      item.validationErrors.length > 0
                        ? 'border-red-300 dark:border-red-900/50'
                        : hasExact
                        ? 'border-amber-300 dark:border-amber-900/50'
                        : 'border-[var(--color-border-subtle)]'
                    }`}
                    data-testid={`bulk-review-item-${item.tempId}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[var(--color-text-muted)]">
                          #{index + 1}
                        </span>

                        {item.validationErrors.length === 0 ? (
                          <Badge variant="success" size="sm">
                            <Check className="w-3 h-3 me-0.5" />
                            صالحة
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="sm">
                            <AlertCircle className="w-3 h-3 me-0.5" />
                            بيانات غير مكتملة
                          </Badge>
                        )}

                        {hasExact && (
                          <Badge variant="warning" size="sm">
                            <AlertTriangle className="w-3 h-3 me-0.5" />
                            تطابق تام مع {matchedCode}
                          </Badge>
                        )}

                        {!hasExact && hasCand && (
                          <Badge variant="neutral" size="sm">
                            مرشح تطابق محتمل
                          </Badge>
                        )}

                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                          نوع: {item.item.questionType} | صعوبة: {item.item.difficulty}
                        </span>
                      </div>

                      {/* Action Selector */}
                      <div className="w-56 shrink-0">
                        <Select
                          value={currentAction}
                          onChange={(e) => handleActionChange(item.tempId, e.target.value as IngestionAction)}
                          options={[
                            { value: 'CREATE_NEW', label: 'إنشاء كمسألة جديدة' },
                            {
                              value: 'LINK_SOURCE',
                              label: hasExact ? `ربط المصدر بـ (${matchedCode})` : 'ربط بمصدر مسألة قائمة',
                            },
                            { value: 'DISMISS', label: 'تجاهل وتخطي' },
                          ]}
                          data-testid={`action-select-${item.tempId}`}
                        />
                      </div>
                    </div>

                    {/* Question Preview */}
                    <div className="p-2.5 rounded bg-[var(--color-bg-surface-subtle)] text-xs text-[var(--color-text-primary)]">
                      <MathRichContentViewer content={item.item.body} />
                    </div>

                    {/* Validation Errors */}
                    {item.validationErrors.length > 0 && (
                      <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-[11px] text-red-600 dark:text-red-400 space-y-0.5">
                        <span className="font-bold">أخطاء التحقق:</span>
                        <ul className="list-disc list-inside">
                          {item.validationErrors.map((err, eIdx) => (
                            <li key={eIdx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Footer Tags & Sources */}
                    <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        وسوم المنهج: {item.item.curriculumNodeIds.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3" />
                        مراجع المصادر: {item.item.sourceReferenceIds.length}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Explicit Confirmation & Final Submit */}
            <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[var(--color-text-primary)]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded border-[var(--color-border-default)] text-[var(--color-brand-primary)]"
                  data-testid="confirm-bulk-checkbox"
                />
                <span>
                  أؤكد مراجعة المسائل وتعيين الإجراءات المناسبة لكل سجل قبل الاعتماد النهائي في بنك الأسئلة.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                  إلغاء
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCommit}
                  disabled={commitMutation.isPending || !confirmed}
                  data-testid="commit-bulk-btn"
                >
                  {commitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                      جاري الاستيراد والتسجيل...
                    </>
                  ) : (
                    'اعتماد واستيراد الدفعة'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
