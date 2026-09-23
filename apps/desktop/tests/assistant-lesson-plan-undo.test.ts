import { describe, expect, it, vi } from 'vitest';
import { archiveLessonPlanWithUndo, undoArchivedLessonPlan } from '../electron/ipc/assistant-lesson-plan-undo.js';

describe('assistant lesson plan archive undo', () => {
  it('captures the prior status and restores it after the archived version', () => {
    const service = {
      getLessonPlanById: vi.fn().mockReturnValueOnce({id:'plan-1',status:'DRAFT',version:1}).mockReturnValueOnce({id:'plan-1',status:'ARCHIVED',version:2}),
      archiveLessonPlan: vi.fn().mockReturnValue({id:'plan-1',status:'ARCHIVED',version:2}),
      updateLessonPlan: vi.fn().mockReturnValue({id:'plan-1',status:'DRAFT',version:3}),
    };
    const archived = archiveLessonPlanWithUndo(service as any, 'plan-1', {} as any);
    expect(archived.undoSnapshot).toEqual({kind:'archive_lesson_plan',planId:'plan-1',status:'DRAFT',version:2});
    expect(undoArchivedLessonPlan(service as any, archived.undoSnapshot, {} as any)).toBe(true);
    expect(service.updateLessonPlan).toHaveBeenCalledWith('plan-1',{status:'DRAFT'},{});
  });
});
