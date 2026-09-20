import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Badge,
  MathRichContentViewer,
} from '@tibyan/design-system';
import {
  type ReflectionCompletionStatus,
  type LessonPlanDto,
} from '@tibyan/contracts';
import {
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useSessionReflection,
  useCreateSessionReflection,
  useUpdateSessionReflection,
  useLessonPlans,
} from '../../hooks/useLessonPlanner.js';

export interface SessionReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  groupName: string;
  sessionDate: string;
  canWrite?: boolean;
}

const STATUS_CONFIG: Record<
  ReflectionCompletionStatus,
  { label: string; badgeVariant: 'success' | 'warning' | 'danger'; desc: string }
> = {
  COMPLETED: {
    label: 'مكتمل بالكامل',
    badgeVariant: 'success',
    desc: 'تم إنجاز الخطة وشرح جميع الأفكار وحل التمارين المقررة بنجاح.',
  },
  PARTIALLY_COMPLETED: {
    label: 'مكتمل جزئياً',
    badgeVariant: 'warning',
    desc: 'تم إنجاز جزء من خطة الدرس وتبقت عناصر محددة للحصة القادمة.',
  },
  POSTPONED: {
    label: 'مؤجل / لم ينفذ',
    badgeVariant: 'danger',
    desc: 'تم تأجيل موضوع الدرس أو تم تخصيص الحصة لحل واجبات أو مراجعة طارئة.',
  },
};

export function SessionReflectionModal({
  isOpen,
  onClose,
  sessionId,
  groupName,
  sessionDate,
  canWrite = true,
}: SessionReflectionModalProps) {
  const { data: reflection } = useSessionReflection(sessionId);
  const { data: availablePlans = [] } = useLessonPlans({ status: 'READY' });
  const createMutation = useCreateSessionReflection();
  const updateMutation = useUpdateSessionReflection();

  const [completionStatus, setCompletionStatus] = useState<ReflectionCompletionStatus>('COMPLETED');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [uncompletedItems, setUncompletedItems] = useState('');
  const [topicsNeedingReview, setTopicsNeedingReview] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [showSnapshotDetail, setShowSnapshotDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (reflection) {
      setCompletionStatus(reflection.completionStatus);
      setSelectedPlanId(reflection.lessonPlanId || '');
      setUncompletedItems(reflection.uncompletedItems || '');
      setTopicsNeedingReview(reflection.topicsNeedingReview || '');
      setQuickNotes(reflection.quickNotes || '');
    } else {
      setCompletionStatus('COMPLETED');
      setUncompletedItems('');
      setTopicsNeedingReview('');
      setQuickNotes('');
    }
  }, [reflection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (reflection) {
        await updateMutation.mutateAsync({
          id: reflection.id,
          input: {
            completionStatus,
            uncompletedItems: uncompletedItems.trim() || null,
            topicsNeedingReview: topicsNeedingReview.trim() || null,
            quickNotes: quickNotes.trim() || null,
          },
        });
        setSuccessMsg('تم تحديث تأمل الحصة بنجاح');
      } else {
        await createMutation.mutateAsync({
          sessionId,
          lessonPlanId: selectedPlanId ? selectedPlanId : null,
          completionStatus,
          uncompletedItems: uncompletedItems.trim() || null,
          topicsNeedingReview: topicsNeedingReview.trim() || null,
          quickNotes: quickNotes.trim() || null,
        });
        setSuccessMsg('تم حفظ تأمل الحصة وتجميد نسخة الخطة بنجاح');
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ تأمل الحصة');
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const snapshot = reflection?.lessonPlanSnapshot;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <span>تأمل الحصة والملاحظات الأكاديمية (Session Reflection)</span>
          <Badge variant="primary" size="sm">
            {groupName}
          </Badge>
        </div>
      }
      description={`تسجيل مخرجات تدريس حصة ${sessionDate} وتثبيت الخطة التعليمية المنفذة`}
      size="lg"
      className="max-w-3xl max-h-[90vh] flex flex-col"
    >
      <div className="space-y-4 flex flex-col h-full overflow-y-auto" dir="rtl" data-testid="session-reflection-modal">
        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border border-[var(--color-status-danger-border)]">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 text-xs rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Historical Snapshot Card (if reflection has frozen snapshot) */}
        {snapshot && (
          <div
            className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 space-y-2 text-xs"
            data-testid="reflection-snapshot-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                <Lock className="w-4 h-4" />
                <span>نسخة خطة الدرس المجمدة تاريخياً وقت التدريس</span>
                <Badge variant="accent" size="sm">
                  الإصدار {snapshot.version}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowSnapshotDetail((prev) => !prev)}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                data-testid="toggle-snapshot-detail-btn"
              >
                <span>{showSnapshotDetail ? 'إخفاء التفاصيل' : 'عرض المحتوى المجمد'}</span>
                {showSnapshotDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[11px] text-[var(--color-text-secondary)]">
              عنوان الخطة: <strong className="text-[var(--color-text-primary)]">{snapshot.title}</strong> • تم التجميد بتاريخ:{' '}
              {new Date(snapshot.snapshottedAt).toLocaleString('ar-EG')} (أي تعديلات لاحقة على خطة الدرس لن تؤثر على هذا السجل)
            </p>

            {showSnapshotDetail && (
              <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-[var(--color-border-subtle)] space-y-3">
                {snapshot.sections.objectives.length > 0 && (
                  <div>
                    <h5 className="font-bold text-[var(--color-text-primary)] mb-1">الأهداف التعليمية المقررة:</h5>
                    <ul className="list-disc list-inside space-y-0.5 text-[var(--color-text-secondary)]">
                      {snapshot.sections.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {snapshot.sections.explanation && snapshot.sections.explanation.blocks.length > 0 && (
                  <div>
                    <h5 className="font-bold text-[var(--color-text-primary)] mb-1">محتوى الشرح الرياضي:</h5>
                    <MathRichContentViewer content={snapshot.sections.explanation} />
                  </div>
                )}

                {snapshot.sections.examples && snapshot.sections.examples.blocks.length > 0 && (
                  <div>
                    <h5 className="font-bold text-[var(--color-text-primary)] mb-1">الأمثلة والتمارين:</h5>
                    <MathRichContentViewer content={snapshot.sections.examples} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan Picker (if not yet recorded or modifying reflection) */}
          {!reflection && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
                ربط بخطة درس معتمدة (اختياري)
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                data-testid="select-lesson-plan"
              >
                <option value="">بدون ربط بخطة محددة</option>
                {availablePlans.map((plan: LessonPlanDto) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title} (المدة: {plan.targetDurationMinutes} دقيقة)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                عند اختيار خطة درس، سيقوم النظام تلقائياً بتجميد نسخة مطابقة منها في سجل هذا التأمل لحمايتها تاريخياً.
              </p>
            </div>
          )}

          {/* Outcome Status Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
              حالة إنجاز الحصة التعليمية
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(STATUS_CONFIG) as ReflectionCompletionStatus[]).map((st) => {
                const config = STATUS_CONFIG[st];
                const isSelected = completionStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCompletionStatus(st)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/8 ring-1 ring-[var(--color-brand-primary)] shadow-sm'
                        : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-subtle)]'
                    }`}
                    data-testid={`status-option-${st.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={config.badgeVariant} size="sm">
                        {config.label}
                      </Badge>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-brand-primary)]" />}
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                      {config.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Uncompleted Items (relevant especially for PARTIALLY_COMPLETED) */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
              العناصر والتمارين غير المكتملة (مرحّلة للحصة القادمة)
            </label>
            <textarea
              rows={2}
              value={uncompletedItems}
              onChange={(e) => setUncompletedItems(e.target.value)}
              placeholder="مثال: لم نتمكن من حل مسألة الامتحان التجريبي رقم 5؛ تم ترحيلها لبداية الحصة القادمة..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
              data-testid="textarea-uncompleted-items"
            />
          </div>

          {/* Topics Needing Review */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
              نقاط بحاجة لمراجعة أو دعم إضافي للطلاب
            </label>
            <textarea
              rows={2}
              value={topicsNeedingReview}
              onChange={(e) => setTopicsNeedingReview(e.target.value)}
              placeholder="مثال: لاحظت تشتت بعض الطلاب في قاعدة الضرب الاتجاهي؛ يلزم مراجعة سريعة 5 دقائق..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
              data-testid="textarea-topics-review"
            />
          </div>

          {/* Teacher Quick Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
              ملاحظات عامة حول أداء وتفاعل المجموعة
            </label>
            <textarea
              rows={2}
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="مثال: التزام الطلاب بالواجب ممتاز، ونسبة المشاركة الصفية كانت مرتفعة..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
              data-testid="textarea-quick-notes"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSaving}
              disabled={!canWrite}
              data-testid="btn-save-reflection"
            >
              {reflection ? 'تحديث التأمل' : 'حفظ التأمل واعتماد الخطة'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
