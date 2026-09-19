import { useState } from 'react';
import {
  Card,
  Button,
  Badge,
} from '@tibyan/design-system';
import {
  BookOpen,
  CheckCircle2,
  Link2,
  ChevronDown,
  ChevronRight,
  Layers,
  FileText,
  Lightbulb,
} from 'lucide-react';
import type {
  GroupDto,
  CurriculumProgressStatus,
  CurriculumProjectionStatus,
  CurriculumTreeNodeDto,
} from '@tibyan/contracts';
import {
  useGroupCurriculumOverview,
  useUpdateGroupProgress,
  useGroupProgressMap,
  useCurriculumTree,
} from '../../hooks/useCurriculum.js';
import { AssignCatalogModal } from './AssignCatalogModal.js';

interface GroupSyllabusCardProps {
  group: GroupDto;
  canWrite: boolean;
}

const STATUS_LABELS: Record<CurriculumProgressStatus, { label: string; badgeVariant: any }> = {
  NOT_STARTED: { label: 'لم تبدأ', badgeVariant: 'neutral' },
  IN_PROGRESS: { label: 'قيد الشرح', badgeVariant: 'warning' },
  COMPLETED: { label: 'مكتملة', badgeVariant: 'success' },
};

const PROJECTION_LABELS: Record<
  CurriculumProjectionStatus,
  { label: string; badgeVariant: any; desc: string }
> = {
  COMPLETED: {
    label: 'مكتمل',
    badgeVariant: 'success',
    desc: 'تم إكمال جميع مهارات المنهج بنجاح.',
  },
  ON_TRACK: {
    label: 'على المسار الصحيح',
    badgeVariant: 'success',
    desc: 'معدل إنجاز المهارات يتناسب مع الحصص المتبقية للعام الدراسي.',
  },
  UNREALISTIC_PACING: {
    label: 'خطة غير واقعية / تأخر حرج',
    badgeVariant: 'danger',
    desc: 'معدل الإنجاز الحالي يتطلب وتيرة حصص أسبوعية تفوق المتاح لإتمام المنهج.',
  },
  INSUFFICIENT_DATA: {
    label: 'قيد جمع البيانات',
    badgeVariant: 'neutral',
    desc: 'يلزم إتمام عدد أكبر من الحصص لحساب التقدير الزمني بدقة.',
  },
};

export function GroupSyllabusCard({ group, canWrite }: GroupSyllabusCardProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set());

  const { data: overview, isLoading } = useGroupCurriculumOverview(group.id);
  const { data: progressMap = {} } = useGroupProgressMap(group.id);

  const assignment = overview?.assignment;
  const catalog = overview?.catalog;
  const projection = overview?.projection;

  const { data: tree = [] } = useCurriculumTree(assignment?.catalogId);

  const updateProgressMutation = useUpdateGroupProgress(group.id);

  const toggleUnit = (id: string) => {
    setCollapsedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStatusChange = async (nodeId: string, newStatus: CurriculumProgressStatus) => {
    try {
      await updateProgressMutation.mutateAsync({
        groupId: group.id,
        nodeId,
        status: newStatus,
      });
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة المهارة');
    }
  };

  if (isLoading) {
    return (
      <Card variant="default" className="p-6 text-center text-xs text-[var(--color-text-muted)]">
        جاري تحميل بيانات خطة المنهج...
      </Card>
    );
  }

  return (
    <Card variant="default" className="p-5 space-y-5" data-testid="section-group-syllabus">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                خطة وتغطية المنهج الدراسي
              </h2>
              {assignment ? (
                <Badge variant="primary" size="sm" data-testid="badge-syllabus-version">
                  الإصدار {assignment.catalogVersion}
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  غير مرتبط
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {assignment && catalog
                ? `المنهج المرتبط: ${catalog.title} (${catalog.code})`
                : 'لم يتم ربط منهج معتمد بهذه المجموعة بعد.'}
            </p>
          </div>
        </div>

        {canWrite && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAssignModalOpen(true)}
            className="gap-1.5 text-xs self-start md:self-auto"
            data-testid="btn-open-assign-modal"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{assignment ? 'تغيير المنهج المرتبط' : 'ربط منهج دراسي'}</span>
          </Button>
        )}
      </div>

      {!assignment ? (
        <div className="p-6 text-center rounded-xl bg-[var(--color-bg-surface-subtle)] border border-dashed border-[var(--color-border-subtle)] space-y-2" data-testid="empty-syllabus-state">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            لا يوجد منهج دراسي مرتبط بهذه المجموعة
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto">
            قم بربط المنهج لمتابعة شرح الدروس والمهارات، وحساب نسبة التغطية، وتقدير موعد انتهاء المنهج تلقائياً.
          </p>
          {canWrite && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAssignModalOpen(true)}
              className="gap-1.5 mt-2"
            >
              <Link2 className="w-4 h-4" />
              <span>ربط منهج الآن</span>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Progress & Pacing Projection Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="syllabus-metrics">
            {/* Completion Bar */}
            <div className="p-4 rounded-xl bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-[var(--color-text-primary)]">نسبة تغطية المهارات</span>
                <span className="text-[var(--color-brand-primary)] font-bold text-sm font-mono">
                  {overview?.completionPercentage ?? 0}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand-primary)] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, overview?.completionPercentage ?? 0))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)]">
                <span>{overview?.completedSkills ?? 0} مكتملة</span>
                <span>{overview?.inProgressSkills ?? 0} قيد الشرح</span>
                <span>{overview?.totalSkills ?? 0} إجمالي المهارات</span>
              </div>
            </div>

            {/* Pacing Projection Status */}
            <div className="p-4 rounded-xl bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  المسار الزمني (Pacing)
                </span>
                {projection && (
                  <Badge variant={PROJECTION_LABELS[projection.status].badgeVariant} size="sm" data-testid="badge-pacing-status">
                    {PROJECTION_LABELS[projection.status].label}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                {projection ? projection.messageAr || PROJECTION_LABELS[projection.status].desc : ''}
              </p>
            </div>

            {/* Projection Details */}
            <div className="p-4 rounded-xl bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">الحصص المكتملة:</span>
                <span className="font-bold text-[var(--color-text-primary)] font-mono">
                  {projection?.completedSessionsCount != null
                    ? `${projection.completedSessionsCount} حصة`
                    : '0 حصة'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">التاريخ المتوقع للختام:</span>
                <span className="font-bold text-[var(--color-text-primary)] font-mono" dir="ltr">
                  {projection?.projectedCompletionDate || 'غير محدد'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">معدل الإنجاز الأسبوعي:</span>
                <span className="font-bold text-[var(--color-brand-primary)] font-mono">
                  {projection?.skillsPerWeekRate != null
                    ? `${projection.skillsPerWeekRate} مهارة / أسبوع`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Syllabus Checklist */}
          <div className="space-y-3 pt-2" data-testid="syllabus-checklist">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              قائمة مهارات المنهج وحالة التقدم
            </h3>

            {tree.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] p-4 text-center">
                فهرس المنهج لا يحتوي على وحدات أو مهارات بعد.
              </p>
            ) : (
              <div className="space-y-3">
                {tree.map((unit: CurriculumTreeNodeDto) => {
                  const isUnitCollapsed = collapsedUnits.has(unit.id);
                  return (
                    <div
                      key={unit.id}
                      className="border border-[var(--color-border-subtle)] rounded-xl overflow-hidden bg-[var(--color-bg-surface)]"
                      data-testid={`unit-card-${unit.id}`}
                    >
                      {/* Unit Header */}
                      <div
                        onClick={() => toggleUnit(unit.id)}
                        className="flex items-center justify-between p-3 bg-[var(--color-bg-surface-elevated)] cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isUnitCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          )}
                          <Layers className="w-4 h-4 text-[var(--color-brand-primary)]" />
                          <span className="font-bold text-sm text-[var(--color-text-primary)]">
                            {unit.titleAr}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {unit.children.length} دروس
                        </span>
                      </div>

                      {/* Lessons & Skills */}
                      {!isUnitCollapsed && (
                        <div className="p-3 space-y-3">
                          {unit.children.map((lesson: CurriculumTreeNodeDto) => (
                            <div key={lesson.id} className="space-y-2 pr-4 border-r-2 border-[var(--color-border-subtle)]">
                              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                                <FileText className="w-3.5 h-3.5 text-purple-500" />
                                <span>{lesson.titleAr}</span>
                              </div>

                              {/* Concepts & Skills */}
                              {lesson.children.map((concept: CurriculumTreeNodeDto) => (
                                <div key={concept.id} className="space-y-1.5 pr-3">
                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                                    <Lightbulb className="w-3 h-3 text-amber-500" />
                                    <span>{concept.titleAr}</span>
                                  </div>

                                  {/* Skills list */}
                                  <div className="space-y-1 pr-2">
                                    {concept.children.map((skill: CurriculumTreeNodeDto) => {
                                      const currentStatus = progressMap[skill.id] || 'NOT_STARTED';
                                      return (
                                        <div
                                          key={skill.id}
                                          className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)]/70 text-xs"
                                          data-testid={`skill-item-${skill.id}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <CheckCircle2
                                              className={`w-3.5 h-3.5 ${
                                                currentStatus === 'COMPLETED'
                                                  ? 'text-emerald-500'
                                                  : currentStatus === 'IN_PROGRESS'
                                                  ? 'text-amber-500'
                                                  : 'text-[var(--color-text-muted)]'
                                              }`}
                                            />
                                            <span
                                              className={`${
                                                currentStatus === 'COMPLETED'
                                                  ? 'line-through text-[var(--color-text-muted)]'
                                                  : 'text-[var(--color-text-primary)]'
                                              }`}
                                            >
                                              {skill.titleAr}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            {canWrite ? (
                                              <select
                                                value={currentStatus}
                                                onChange={(e) =>
                                                  handleStatusChange(
                                                    skill.id,
                                                    e.target.value as CurriculumProgressStatus
                                                  )
                                                }
                                                className="text-[11px] font-medium rounded-md px-2 py-1 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                                                data-testid={`select-skill-status-${skill.id}`}
                                              >
                                                <option value="NOT_STARTED">لم تبدأ</option>
                                                <option value="IN_PROGRESS">قيد الشرح</option>
                                                <option value="COMPLETED">مكتملة</option>
                                              </select>
                                            ) : (
                                              <Badge
                                                variant={STATUS_LABELS[currentStatus].badgeVariant}
                                                size="sm"
                                              >
                                                {STATUS_LABELS[currentStatus].label}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <AssignCatalogModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          group={group}
          currentCatalogId={assignment?.catalogId}
        />
      )}
    </Card>
  );
}
