import { useState } from 'react';
import { Card, Button, Input, Select, Badge } from '@tibyan/design-system';
import {
  FileCheck,
  Plus,
  Printer,
  FileDown,
  Sparkles,
  Undo2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  useExams,
  usePreviewAssembly,
  useConfirmAssembly,
  useUndoExamMutation,
  usePreviewAiCandidates,
  useExamLayout,
  useExportExamPdf,
  usePrintExam,
} from '../../hooks/useExams.js';
import { useCurriculumCatalogs, useCurriculumTree } from '../../hooks/useCurriculum.js';
import { MathRichContentViewer } from '@tibyan/design-system';
import type {
  ExamBlueprint,
  AiExamCandidate,
  ExamPlacement,
} from '@tibyan/contracts';

export function ExamBuilderPage() {
  const [activeTab, setActiveTab] = useState<'LIST' | 'BUILDER' | 'PREVIEW'>('LIST');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [previewKind, setPreviewKind] = useState<'STUDENT' | 'TEACHER' | 'ANSWER_KEY'>('STUDENT');

  // Blueprint form state
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState<'SEC_1' | 'SEC_2' | 'SEC_3'>('SEC_1');
  const [languageTrack, setLanguageTrack] = useState<'ARABIC' | 'LANG_ENGLISH'>('ARABIC');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [totalQuestions, setTotalQuestions] = useState<number>(4);
  const [totalMarks, setTotalMarks] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [variantCount, setVariantCount] = useState<number>(2);

  // Distributions
  const [easyCount, setEasyCount] = useState<number>(1);
  const [mediumCount, setMediumCount] = useState<number>(2);
  const [hardCount, setHardCount] = useState<number>(1);
  const [mcqCount, setMcqCount] = useState<number>(2);
  const [shortCount, setShortCount] = useState<number>(2);

  // Draft Exam Working State
  const [stagedPlacements, setStagedPlacements] = useState<ExamPlacement[]>([]);
  const [assemblyConflicts, setAssemblyConflicts] = useState<string[]>([]);

  // AI Prompting State
  const [aiTopic, setAiTopic] = useState('');
  const [aiType, setAiType] = useState<'MULTIPLE_CHOICE' | 'SHORT_ANSWER'>('MULTIPLE_CHOICE');
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [aiCandidates, setAiCandidates] = useState<AiExamCandidate[]>([]);

  // Queries & Mutations
  const { data: exams = [] } = useExams();
  const { data: catalogs = [] } = useCurriculumCatalogs();
  const { data: treeNodes = [] } = useCurriculumTree(selectedCatalogId || undefined);

  const previewAssemblyMutation = usePreviewAssembly();
  const confirmAssemblyMutation = useConfirmAssembly();
  const undoMutation = useUndoExamMutation();
  const aiPreviewMutation = usePreviewAiCandidates();
  const exportPdfMutation = useExportExamPdf();
  const printMutation = usePrintExam();

  const { data: layoutHtml = '' } = useExamLayout(
    selectedExamId || undefined,
    previewKind,
    previewVersion
  );

  const handleRunAssembly = async () => {
    setAssemblyConflicts([]);
    const blueprint: ExamBlueprint = {
      title: title.trim() || 'اختبار فصلي',
      gradeLevel,
      languageTrack,
      curriculumNodeIds: selectedNodeId ? [selectedNodeId] : [],
      sourceReferenceIds: [],
      totalQuestions,
      totalMarks,
      durationMinutes,
      difficultyDistribution: {
        EASY: easyCount,
        MEDIUM: mediumCount,
        HARD: hardCount,
        ADVANCED: 0,
      },
      questionTypeDistribution: {
        MULTIPLE_CHOICE: mcqCount,
        SHORT_ANSWER: shortCount,
        ESSAY: 0,
        TRUE_FALSE: 0,
      },
      variantCount,
    };

    try {
      const res = await previewAssemblyMutation.mutateAsync(blueprint);
      if (!res.valid) {
        setAssemblyConflicts(res.conflicts);
        return;
      }
      setStagedPlacements(
        res.selectedQuestions.map((q, idx) => ({
          id: crypto.randomUUID(),
          questionId: q.questionId,
          provenance: 'QUESTION_BANK',
          body: q.body,
          modelAnswer: q.modelAnswer,
          marks: q.marks,
          answerSpaceLines: 2,
          curriculumNodeIds: q.curriculumNodeIds,
          sourceReferenceIds: q.sourceReferenceIds,
          position: idx,
        }))
      );
    } catch (err: any) {
      setAssemblyConflicts([err.message || 'حدث خطأ أثناء فحص مخطط الاختبار']);
    }
  };

  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) return;
    try {
      const res = await aiPreviewMutation.mutateAsync({
        topicOrStandard: aiTopic,
        gradeLevel,
        languageTrack,
        questionType: aiType,
        difficulty: aiDifficulty,
        marks: 2,
        count: 2,
        curriculumNodeIds: selectedNodeId ? [selectedNodeId] : [],
        sourceReferenceIds: [],
      });
      setAiCandidates(res.candidates);
    } catch (err: any) {
      alert(err.message || 'تعذر توليد أسئلة من خدمة الذكاء الاصطناعي');
    }
  };

  const handleConfirmCandidate = (candidate: AiExamCandidate) => {
    const newPlacement: ExamPlacement = {
      id: crypto.randomUUID(),
      provenance: 'AI_CANDIDATE',
      body: candidate.body,
      modelAnswer: candidate.modelAnswer,
      marks: candidate.marks,
      answerSpaceLines: 3,
      curriculumNodeIds: selectedNodeId ? [selectedNodeId] : [],
      sourceReferenceIds: [],
      position: stagedPlacements.length,
    };
    setStagedPlacements((prev) => [...prev, newPlacement]);
    setAiCandidates((prev) => prev.filter((c) => c !== candidate));
  };

  const handleConfirmExam = async () => {
    if (stagedPlacements.length === 0) return;
    const blueprint: ExamBlueprint = {
      title: title.trim() || 'اختبار رياضيات',
      gradeLevel,
      languageTrack,
      curriculumNodeIds: selectedNodeId ? [selectedNodeId] : [],
      sourceReferenceIds: [],
      totalQuestions: stagedPlacements.length,
      totalMarks: stagedPlacements.reduce((s, p) => s + p.marks, 0),
      durationMinutes,
      difficultyDistribution: {
        EASY: easyCount,
        MEDIUM: mediumCount,
        HARD: hardCount,
        ADVANCED: 0,
      },
      questionTypeDistribution: {
        MULTIPLE_CHOICE: mcqCount,
        SHORT_ANSWER: shortCount,
        ESSAY: 0,
        TRUE_FALSE: 0,
      },
      variantCount,
    };

    try {
      const confirmed = await confirmAssemblyMutation.mutateAsync({
        blueprint,
        placements: stagedPlacements.map((p, idx) => ({ ...p, position: idx })),
        sectionTitle: 'القسم الأول',
      });
      setSelectedExamId(confirmed.id);
      setActiveTab('PREVIEW');
    } catch (err: any) {
      alert(err.message || 'فشل حفظ وتأكيد الاختبار');
    }
  };

  return (
    <div className="space-y-6" dir="rtl" data-testid="page-exam-builder">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              منشئ الاختبارات الذكي (Exam Builder)
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              بناء وتنسيق نماذج الاختبارات A/B/C/D استناداً لبنك الأسئلة ومساعد الذكاء الاصطناعي
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'LIST' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('LIST')}
            data-testid="tab-exam-list"
          >
            سجل الاختبارات
          </Button>
          <Button
            variant={activeTab === 'BUILDER' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('BUILDER')}
            data-testid="tab-exam-builder"
          >
            <Plus className="w-4 h-4 ml-1" />
            بناء اختبار جديد
          </Button>
          {selectedExamId && (
            <Button
              variant={activeTab === 'PREVIEW' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('PREVIEW')}
              data-testid="tab-exam-preview"
            >
              <Eye className="w-4 h-4 ml-1" />
              معاينة وطباعة A4
            </Button>
          )}
        </div>
      </div>

      {/* Tab: LIST */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {exams.length === 0 ? (
            <Card className="p-12 text-center text-[var(--color-text-secondary)]">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">لا توجد اختبارات منشأة حالياً</p>
              <p className="text-xs mt-1">ابدأ بتجميع وتوليد أول اختبار مدرسي بالضغط على "بناء اختبار جديد".</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="p-4 flex flex-col justify-between space-y-4" data-testid={`exam-card-${exam.id}`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-[var(--color-text-primary)]">{exam.title}</h3>
                      <Badge variant="success">{exam.status}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-[var(--color-text-secondary)] space-y-1">
                      <div>عدد الأسئلة: {exam.placements.length} مسألة</div>
                      <div>الدرجة الكلية: {exam.blueprint.totalMarks} درجة</div>
                      <div>الزمن المحدد: {exam.blueprint.durationMinutes} دقيقة</div>
                      <div>النماذج المنشأة: {exam.versions.map((v) => v.label).join(' ، ')}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setActiveTab('PREVIEW');
                      }}
                      data-testid={`preview-exam-${exam.id}`}
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      معاينة A4
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => undoMutation.mutate(exam.id)}
                      data-testid={`undo-exam-${exam.id}`}
                    >
                      <Undo2 className="w-4 h-4 ml-1" />
                      تراجع
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: BUILDER */}
      {activeTab === 'BUILDER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Top Blueprint Form */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-bold text-sm text-[var(--color-text-primary)] border-b pb-2">
                محددات المخطط (Blueprint)
              </h2>

              <div>
                <label className="text-xs font-semibold">عنوان الاختبار</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الاختبار الفصلي الأول"
                  data-testid="input-exam-title"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold">الصف الدراسي</label>
                  <Select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value as any)}
                  >
                    <option value="SEC_1">أولى ثانوي</option>
                    <option value="SEC_2">تانية ثانوي</option>
                    <option value="SEC_3">تالتة ثانوي</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold">المسار</label>
                  <Select
                    value={languageTrack}
                    onChange={(e) => setLanguageTrack(e.target.value as any)}
                  >
                    <option value="ARABIC">عربي</option>
                    <option value="LANG_ENGLISH">لغات (إنجليزي)</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">كتالوج المنهج</label>
                <Select
                  value={selectedCatalogId}
                  onChange={(e) => {
                    setSelectedCatalogId(e.target.value);
                    setSelectedNodeId('');
                  }}
                >
                  <option value="">اختر المنهج...</option>
                  {catalogs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold">مهارة / موضوع محدد</label>
                <Select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  disabled={!selectedCatalogId}
                >
                  <option value="">كامل المنهج (أو اختر مهارة)</option>
                  {treeNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.titleAr}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold">الأسئلة</label>
                  <Input
                    type="number"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">الدرجات</label>
                  <Input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">الزمن (د)</label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">النماذج المطلوبة (A/B/C/D)</label>
                <Select
                  value={String(variantCount)}
                  onChange={(e) => setVariantCount(Number(e.target.value))}
                >
                  <option value="1">نموذج واحد (A)</option>
                  <option value="2">نموذجان (A, B)</option>
                  <option value="3">3 نماذج (A, B, C)</option>
                  <option value="4">4 نماذج (A, B, C, D)</option>
                </Select>
              </div>

              <div className="space-y-2 pt-1 border-t border-[var(--color-border-subtle)]">
                <span className="text-xs font-bold">توزيع الصعوبة (مجموع = {totalQuestions}):</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--color-text-secondary)]">سهل</label>
                    <Input
                      type="number"
                      value={easyCount}
                      onChange={(e) => setEasyCount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--color-text-secondary)]">متوسط</label>
                    <Input
                      type="number"
                      value={mediumCount}
                      onChange={(e) => setMediumCount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--color-text-secondary)]">صعب</label>
                    <Input
                      type="number"
                      value={hardCount}
                      onChange={(e) => setHardCount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <span className="text-xs font-bold pt-1 block">توزيع الأنواع (مجموع = {totalQuestions}):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--color-text-secondary)]">اختيار من متعدد</label>
                    <Input
                      type="number"
                      value={mcqCount}
                      onChange={(e) => setMcqCount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--color-text-secondary)]">مقالي قصير</label>
                    <Input
                      type="number"
                      value={shortCount}
                      onChange={(e) => setShortCount(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleRunAssembly}
                data-testid="btn-run-assembly"
              >
                تجميع آلي من بنك الأسئلة
              </Button>

              {assemblyConflicts.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-xs text-red-600 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    تعارض في المخطط:
                  </div>
                  {assemblyConflicts.map((c, i) => (
                    <div key={i}>• {c}</div>
                  ))}
                </div>
              )}
            </Card>

            {/* AI Generator Card */}
            <Card className="p-4 space-y-3 border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                توليد أسئلة بالذكاء الاصطناعي (Gemini)
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                توليد مقترحات متوافقة بدقة مع المخطط لا تعتمد مباشرة إلا بعد مراجعتك.
              </p>

              <div>
                <label className="text-xs font-semibold">موضوع أو معيار المسألة</label>
                <Input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="مثال: مسائل حياتية على المتتابعة الحسابية"
                  data-testid="input-ai-topic"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold">النوع</label>
                  <Select value={aiType} onChange={(e) => setAiType(e.target.value as any)}>
                    <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
                    <option value="SHORT_ANSWER">إجابة قصيرة</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold">الصعوبة</label>
                  <Select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as any)}>
                    <option value="EASY">سهل</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="HARD">صعب</option>
                  </Select>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full border-emerald-500/40 text-emerald-700"
                onClick={handleGenerateAi}
                disabled={aiPreviewMutation.isPending}
                data-testid="btn-generate-ai"
              >
                <Sparkles className="w-4 h-4 ml-1" />
                {aiPreviewMutation.isPending ? 'جاري التوليد المقيد...' : 'اقتراح مسألتين'}
              </Button>

              {aiCandidates.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-[var(--color-text-primary)]">المقترحات المولدة:</div>
                  {aiCandidates.map((cand, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-50/20 text-xs space-y-2"
                    >
                      <MathRichContentViewer content={cand.body} />
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleConfirmCandidate(cand)}
                          data-testid={`btn-accept-ai-${idx}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                          إضافة للاختبار
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right / Center Staged Placements Review */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h2 className="font-bold text-base text-[var(--color-text-primary)]">
                    مسودة الاختبار الحالية ({stagedPlacements.length} مسألة)
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    إجمالي الدرجات: {stagedPlacements.reduce((s, p) => s + p.marks, 0)} من أصل {totalMarks}
                  </p>
                </div>

                <Button
                  variant="primary"
                  disabled={stagedPlacements.length === 0 || confirmAssemblyMutation.isPending}
                  onClick={handleConfirmExam}
                  data-testid="btn-confirm-exam"
                >
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                  {confirmAssemblyMutation.isPending ? 'جاري الحفظ...' : 'تأكيد وحفظ الاختبار'}
                </Button>
              </div>

              {stagedPlacements.length === 0 ? (
                <div className="p-12 text-center text-[var(--color-text-secondary)]">
                  قم بتشغيل "التجميع الآلي من بنك الأسئلة" أو اقتراح مسائل بالذكاء الاصطناعي لإدراجها هنا.
                </div>
              ) : (
                <div className="space-y-3">
                  {stagedPlacements.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] space-y-2"
                      data-testid={`staged-question-${idx}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">س {idx + 1}.</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={p.provenance === 'AI_CANDIDATE' ? 'info' : 'neutral'}>
                            {p.provenance === 'AI_CANDIDATE' ? 'اقتراح AI' : 'بنك الأسئلة'}
                          </Badge>
                          <span className="text-xs font-semibold">({p.marks} درجات)</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() =>
                              setStagedPlacements((prev) => prev.filter((item) => item.id !== p.id))
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <MathRichContentViewer content={p.body} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab: PREVIEW */}
      {activeTab === 'PREVIEW' && selectedExamId && (
        <div className="space-y-4">
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm">النموذج:</span>
              {(['A', 'B', 'C', 'D'] as const).map((label) => (
                <Button
                  key={label}
                  variant={previewVersion === label ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setPreviewVersion(label)}
                  data-testid={`version-btn-${label}`}
                >
                  نموذج ({label})
                </Button>
              ))}

              <div className="h-4 w-px bg-slate-300 mx-2" />

              <span className="font-bold text-sm">نوع النسخة:</span>
              <Button
                variant={previewKind === 'STUDENT' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewKind('STUDENT')}
                data-testid="kind-student-btn"
              >
                نسخة الطالب
              </Button>
              <Button
                variant={previewKind === 'TEACHER' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewKind('TEACHER')}
                data-testid="kind-teacher-btn"
              >
                نسخة المعلم
              </Button>
              <Button
                variant={previewKind === 'ANSWER_KEY' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewKind('ANSWER_KEY')}
                data-testid="kind-answerkey-btn"
              >
                نموذج الإجابة
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  printMutation.mutate({
                    examId: selectedExamId,
                    kind: previewKind,
                    versionLabel: previewVersion,
                  })
                }
                data-testid="btn-direct-print"
              >
                <Printer className="w-4 h-4 ml-1" />
                طباعة مباشرة
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  exportPdfMutation.mutate({
                    examId: selectedExamId,
                    kind: previewKind,
                    versionLabel: previewVersion,
                  })
                }
                data-testid="btn-export-pdf"
              >
                <FileDown className="w-4 h-4 ml-1" />
                تصدير PDF
              </Button>
            </div>
          </Card>

          {/* Live A4 Print Document Preview Frame */}
          <Card className="p-8 bg-slate-100 dark:bg-slate-900 flex justify-center">
            <div
              className="bg-white text-slate-900 shadow-xl border border-slate-300 rounded-sm w-full max-w-[210mm] min-h-[297mm] p-8 overflow-hidden"
              data-testid="a4-document-preview"
              dangerouslySetInnerHTML={{ __html: layoutHtml }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
