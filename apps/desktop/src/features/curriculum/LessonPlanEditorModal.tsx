import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Badge,
  Input,
  MathRichContentEditor,
} from '@tibyan/design-system';
import {
  type LessonPlanDto,
  type LessonPlanSections,
  type TimingBreakdownItem,
  type LessonPlanStatus,
  createEmptyLessonPlanSections,
  validateLessonPlanTiming,
} from '@tibyan/contracts';
import {
  Target,
  History,
  BookOpen,
  FileSpreadsheet,
  HelpCircle,
  AlertOctagon,
  Home,
  Clock,
  StickyNote,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import {
  useCreateLessonPlan,
  useUpdateLessonPlan,
  useLessonPlan,
} from '../../hooks/useLessonPlanner.js';

export interface LessonPlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculumNodeId: string;
  curriculumNodeTitle: string;
  planId?: string | null;
  onSaved?: (plan: LessonPlanDto) => void;
}

type SectionTab =
  | 'objectives'
  | 'priorReview'
  | 'explanation'
  | 'examples'
  | 'inClassQuestions'
  | 'commonMistakes'
  | 'homework'
  | 'timing'
  | 'notes';

const TABS: { id: SectionTab; label: string; icon: any }[] = [
  { id: 'objectives', label: 'الأهداف', icon: Target },
  { id: 'priorReview', label: 'مراجعة تمهيدية', icon: History },
  { id: 'explanation', label: 'الشرح والمفاهيم', icon: BookOpen },
  { id: 'examples', label: 'أمثلة نموذجية', icon: FileSpreadsheet },
  { id: 'inClassQuestions', label: 'أسئلة وتفاعل', icon: HelpCircle },
  { id: 'commonMistakes', label: 'أخطاء شائعة', icon: AlertOctagon },
  { id: 'homework', label: 'الواجب المنزلي', icon: Home },
  { id: 'timing', label: 'محاكي الوقت', icon: Clock },
  { id: 'notes', label: 'ملاحظات المعلم', icon: StickyNote },
];

export function LessonPlanEditorModal({
  isOpen,
  onClose,
  curriculumNodeId,
  curriculumNodeTitle,
  planId,
  onSaved,
}: LessonPlanEditorModalProps) {
  const { data: existingPlan } = useLessonPlan(planId || undefined);
  const createMutation = useCreateLessonPlan();
  const updateMutation = useUpdateLessonPlan();

  const [activeTab, setActiveTab] = useState<SectionTab>('objectives');
  const [title, setTitle] = useState('');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(60);
  const [status, setStatus] = useState<LessonPlanStatus>('READY');
  const [sections, setSections] = useState<LessonPlanSections>(() => createEmptyLessonPlanSections());
  const [newObjective, setNewObjective] = useState('');
  const [newTimingLabel, setNewTimingLabel] = useState('');
  const [newTimingMinutes, setNewTimingMinutes] = useState(15);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load existing plan data when editing
  useEffect(() => {
    if (existingPlan) {
      setTitle(existingPlan.title);
      setTargetDurationMinutes(existingPlan.targetDurationMinutes);
      setStatus(existingPlan.status);
      setSections(existingPlan.sections);
    } else if (!planId) {
      setTitle(`خطة درس: ${curriculumNodeTitle}`);
      setTargetDurationMinutes(60);
      setStatus('READY');
      setSections(createEmptyLessonPlanSections());
    }
  }, [existingPlan, planId, curriculumNodeTitle]);

  // Dynamic Timing Calculator
  const timingValidation = useMemo(() => {
    return validateLessonPlanTiming(targetDurationMinutes, sections.timingBreakdown);
  }, [targetDurationMinutes, sections.timingBreakdown]);

  // Objectives handlers
  const handleAddObjective = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newObjective.trim();
    if (!text) return;
    setSections((prev) => ({
      ...prev,
      objectives: [...prev.objectives, text],
    }));
    setNewObjective('');
  };

  const handleRemoveObjective = (index: number) => {
    setSections((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  };

  // Timing handlers
  const handleAddTimingItem = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newTimingLabel.trim();
    if (!label || newTimingMinutes < 1) return;
    const item: TimingBreakdownItem = {
      id: `t_${Date.now().toString(36)}`,
      label,
      minutes: Number(newTimingMinutes),
    };
    setSections((prev) => ({
      ...prev,
      timingBreakdown: [...prev.timingBreakdown, item],
    }));
    setNewTimingLabel('');
    setNewTimingMinutes(10);
  };

  const handleRemoveTimingItem = (id: string) => {
    setSections((prev) => ({
      ...prev,
      timingBreakdown: prev.timingBreakdown.filter((item) => item.id !== id),
    }));
  };

  const handleUpdateTimingItemMinutes = (id: string, minutes: number) => {
    setSections((prev) => ({
      ...prev,
      timingBreakdown: prev.timingBreakdown.map((item) =>
        item.id === id ? { ...item, minutes: Math.max(1, minutes) } : item
      ),
    }));
  };

  // Save handler
  const handleSave = async () => {
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('يرجى إدخال عنوان لخطة الدرس');
      return;
    }

    try {
      if (planId) {
        const updated = await updateMutation.mutateAsync({
          id: planId,
          input: {
            title: trimmedTitle,
            targetDurationMinutes,
            status,
            sections,
          },
        });
        setSaveSuccessMsg('تم حفظ التعديلات بنجاح');
        onSaved?.(updated);
      } else {
        const created = await createMutation.mutateAsync({
          curriculumNodeId,
          title: trimmedTitle,
          targetDurationMinutes,
          status,
          sections,
        });
        setSaveSuccessMsg('تم إنشاء خطة الدرس بنجاح');
        onSaved?.(created);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ خطة الدرس');
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <span>{planId ? 'تعديل خطة الدرس' : 'تحضير خطة درس جديدة'}</span>
          <Badge variant="primary" size="sm">
            {curriculumNodeTitle}
          </Badge>
          {existingPlan && (
            <Badge variant="accent" size="sm">
              إصدار {existingPlan.version}
            </Badge>
          )}
        </div>
      }
      description="إعداد وتخصيص الأهداف، الشرح، الأمثلة، والتوزيع الزمني للحصة التعليمية"
      size="xl"
      className="max-w-5xl max-h-[92vh] flex flex-col"
    >
      <div className="space-y-4 flex flex-col h-full overflow-hidden" dir="rtl" data-testid="lesson-plan-modal">
        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border border-[var(--color-status-danger-border)]">
            {errorMsg}
          </div>
        )}
        {saveSuccessMsg && (
          <div className="p-3 text-xs rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Top Metadata Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] items-center">
          <div className="md:col-span-6">
            <Input
              label="عنوان خطة الدرس"
              placeholder="مثال: خطة درس قواعد الاشتقاق وتطبيقاتها"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="input-plan-title"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              المدة المستهدفة (دقيقة)
            </label>
            <input
              type="number"
              min={15}
              max={300}
              step={5}
              value={targetDurationMinutes}
              onChange={(e) => setTargetDurationMinutes(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
              data-testid="input-target-duration"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              حالة الخطة
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus('READY')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                  status === 'READY'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
                }`}
                data-testid="status-ready-btn"
              >
                جاهزة (READY)
              </button>
              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                  status === 'DRAFT'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
                }`}
                data-testid="status-draft-btn"
              >
                مسودة (DRAFT)
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--color-border-subtle)] scrollbar-thin">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-subtle)] hover:text-[var(--color-text-primary)]'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'objectives' && sections.objectives.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20' : 'bg-black/10'}`}>
                    {sections.objectives.length}
                  </span>
                )}
                {tab.id === 'timing' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      timingValidation.status === 'EXACT'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : timingValidation.status === 'UNDER'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {timingValidation.plannedMinutes}د
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto min-h-[380px] max-h-[520px] p-1">
          {/* 1. Objectives */}
          {activeTab === 'objectives' && (
            <div className="space-y-4" data-testid="section-objectives">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">الأهداف السلوكية والتعليمية</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    ما يتوقع من الطالب تحقيقه وفهمه بنهاية هذه الحصة
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddObjective} className="flex gap-2">
                <input
                  type="text"
                  placeholder="أضف هدفاً تعليمياً (مثال: أن يطبق الطالب قاعدة السلسلة على الدوال المثلثية بنجاح)..."
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                  data-testid="input-new-objective"
                />
                <Button type="submit" variant="primary" size="sm" className="gap-1 text-xs" data-testid="btn-add-objective">
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </Button>
              </form>

              <div className="space-y-2">
                {sections.objectives.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--color-text-muted)] border border-dashed rounded-xl">
                    لم تتم إضافة أهداف بعد. أضف أهداف الدرس بالأعلى.
                  </div>
                ) : (
                  sections.objectives.map((obj, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs"
                      data-testid={`objective-item-${i}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center font-bold text-[10px]">
                          {i + 1}
                        </span>
                        <span className="text-[var(--color-text-primary)]">{obj}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveObjective(i)}
                        className="p-1 text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)] rounded"
                        title="حذف الهدف"
                        data-testid={`btn-remove-objective-${i}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. Prior Review */}
          {activeTab === 'priorReview' && (
            <div className="space-y-2" data-testid="section-prior-review">
              <div className="text-xs text-[var(--color-text-secondary)] mb-2">
                المراجعة التمهيدية وربط الدرس بالمعارف الرياضية السابقة:
              </div>
              <MathRichContentEditor
                initialContent={sections.priorReview}
                onChange={(doc) => setSections((prev) => ({ ...prev, priorReview: doc }))}
                testId="editor-prior-review"
              />
            </div>
          )}

          {/* 3. Explanation */}
          {activeTab === 'explanation' && (
            <div className="space-y-2" data-testid="section-explanation">
              <div className="text-xs text-[var(--color-text-secondary)] mb-2">
                شرح النظريات، القوانين، والمفاهيم الرياضية الأساسية:
              </div>
              <MathRichContentEditor
                initialContent={sections.explanation}
                onChange={(doc) => setSections((prev) => ({ ...prev, explanation: doc }))}
                testId="editor-explanation"
              />
            </div>
          )}

          {/* 4. Examples */}
          {activeTab === 'examples' && (
            <div className="space-y-2" data-testid="section-examples">
              <div className="text-xs text-[var(--color-text-secondary)] mb-2">
                الأمثلة والمسائل المحلولة المتدرجة في الصعوبة:
              </div>
              <MathRichContentEditor
                initialContent={sections.examples}
                onChange={(doc) => setSections((prev) => ({ ...prev, examples: doc }))}
                testId="editor-examples"
              />
            </div>
          )}

          {/* 5. In-Class Questions */}
          {activeTab === 'inClassQuestions' && (
            <div className="space-y-2" data-testid="section-in-class-questions">
              <div className="text-xs text-[var(--color-text-secondary)] mb-2">
                الأسئلة الصفية والتطبيقات الفورية لقياس استيعاب الطلاب:
              </div>
              <MathRichContentEditor
                initialContent={sections.inClassQuestions}
                onChange={(doc) => setSections((prev) => ({ ...prev, inClassQuestions: doc }))}
                testId="editor-in-class-questions"
              />
            </div>
          )}

          {/* 6. Common Mistakes */}
          {activeTab === 'commonMistakes' && (
            <div className="space-y-2" data-testid="section-common-mistakes">
              <div className="text-xs text-[var(--color-text-secondary)] mb-2">
                الأخطاء الشائعة ومزالق الحل التي يقع فيها الطلاب عادة في الامتحانات:
              </div>
              <MathRichContentEditor
                initialContent={sections.commonMistakes}
                onChange={(doc) => setSections((prev) => ({ ...prev, commonMistakes: doc }))}
                testId="editor-common-mistakes"
              />
            </div>
          )}

          {/* 7. Homework */}
          {activeTab === 'homework' && (
            <div className="space-y-2" data-testid="section-homework">
              <div className="text-xs text-[var(--color-text-secondary)] mb-2">
                تكليفات الواجب المنزلي وأرقام التمارين المطلوبة:
              </div>
              <MathRichContentEditor
                initialContent={sections.homework}
                onChange={(doc) => setSections((prev) => ({ ...prev, homework: doc }))}
                testId="editor-homework"
              />
            </div>
          )}

          {/* 8. Timing Simulator */}
          {activeTab === 'timing' && (
            <div className="space-y-4" data-testid="section-timing">
              {/* Dynamic Timing Status Calculator Card */}
              <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-elevated)] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[var(--color-brand-primary)]" />
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                        محاكي التوزيع الزمني للحصة التعليمية
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        مقارنة إجمالي الدقائق الموزعة على فقرات الدرس مع المدة المحددة للحصة
                      </p>
                    </div>
                  </div>

                  {/* Arabic Validation Status Badge */}
                  <div data-testid="timing-validation-badge">
                    {timingValidation.status === 'EXACT' && (
                      <Badge variant="success" size="md" className="gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{timingValidation.statusAr}</span>
                      </Badge>
                    )}
                    {timingValidation.status === 'UNDER' && (
                      <Badge variant="warning" size="md" className="gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{timingValidation.statusAr}</span>
                      </Badge>
                    )}
                    {timingValidation.status === 'OVER' && (
                      <Badge variant="danger" size="md" className="gap-1.5 font-bold">
                        <AlertOctagon className="w-4 h-4" />
                        <span>{timingValidation.statusAr}</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] font-mono">
                    <span>المخطط: {timingValidation.plannedMinutes} دقيقة</span>
                    <span>المستهدف: {timingValidation.targetMinutes} دقيقة</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--color-bg-app)] overflow-hidden border border-[var(--color-border-subtle)]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        timingValidation.status === 'EXACT'
                          ? 'bg-emerald-500'
                          : timingValidation.status === 'UNDER'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (timingValidation.plannedMinutes / timingValidation.targetMinutes) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Add Timing Item Form */}
              <form onSubmit={handleAddTimingItem} className="grid grid-cols-12 gap-2">
                <div className="col-span-8">
                  <input
                    type="text"
                    placeholder="اسم الفقرة (مثال: حل مسائل تفاعلية، استراحة سريعة، مراجعة الواجب)..."
                    value={newTimingLabel}
                    onChange={(e) => setNewTimingLabel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                    data-testid="input-timing-label"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={newTimingMinutes}
                    onChange={(e) => setNewTimingMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                    data-testid="input-timing-minutes"
                  />
                </div>
                <div className="col-span-2">
                  <Button type="submit" variant="primary" size="sm" className="w-full text-xs gap-1" data-testid="btn-add-timing-item">
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </Button>
                </div>
              </form>

              {/* Timing Items List */}
              <div className="space-y-2">
                {sections.timingBreakdown.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-xs"
                    data-testid={`timing-item-${item.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-secondary)] flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={item.minutes}
                          onChange={(e) => handleUpdateTimingItemMinutes(item.id, Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-mono rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-xs"
                          data-testid={`input-minutes-${item.id}`}
                        />
                        <span className="text-[var(--color-text-muted)] text-[11px]">دقيقة</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveTimingItem(item.id)}
                        className="p-1 text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)] rounded"
                        title="حذف الفقرة"
                        data-testid={`btn-remove-timing-${item.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. Teacher Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-3" data-testid="section-notes">
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                ملاحظات المعلم والتوجيهات الخاصة بالتدريس:
              </label>
              <textarea
                rows={8}
                value={sections.notes ?? ''}
                onChange={(e) => setSections((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="اكتب أي ملاحظات إدارية، أدوات مساعدة مطلوب إحضارها، أو استراتيجيات تدريس محددة..."
                className="w-full p-3 text-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                data-testid="textarea-notes"
              />
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Clock className="w-3.5 h-3.5" />
            <span>إجمالي وقت الخطة: {timingValidation.plannedMinutes} دقيقة من أصل {targetDurationMinutes} دقيقة</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              data-testid="btn-save-lesson-plan"
            >
              {planId ? 'حفظ التعديلات' : 'اعتماد الخطة وحفظها'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
