import { z } from 'zod';
import { LessonPlanStatusSchema } from '@tibyan/contracts';
import type { LessonPlannerActor, LessonPlannerService } from '@tibyan/core';

type LessonPlanService = Pick<LessonPlannerService, 'getLessonPlanById' | 'archiveLessonPlan' | 'updateLessonPlan'>;
const SnapshotSchema = z.object({kind:z.literal('archive_lesson_plan'),planId:z.string().min(1),status:LessonPlanStatusSchema,version:z.number().int().nonnegative()}).strict();

export function archiveLessonPlanWithUndo(service: LessonPlanService, planId: string, actor: LessonPlannerActor) {
  const before = service.getLessonPlanById(planId, actor);
  const result = service.archiveLessonPlan(planId, actor);
  return {result, undoSnapshot: SnapshotSchema.parse({kind:'archive_lesson_plan',planId,status:before.status,version:result.version})};
}

export function undoArchivedLessonPlan(service: LessonPlanService, snapshot: unknown, actor: LessonPlannerActor): boolean {
  const saved = SnapshotSchema.parse(snapshot);
  const current = service.getLessonPlanById(saved.planId, actor);
  if (current.version !== saved.version || current.status !== 'ARCHIVED') throw new Error('تغيرت خطة الدرس بعد الأرشفة؛ تعذر التراجع بأمان');
  service.updateLessonPlan(saved.planId, {status:saved.status}, actor);
  return true;
}
