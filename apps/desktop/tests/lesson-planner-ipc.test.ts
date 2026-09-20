import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IPC_CHANNELS } from '@tibyan/contracts';

const ipcHandlers = new Map<string, (event: any, payload?: any) => Promise<any>>();

vi.mock('electron', () => {
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: (event: any, payload?: any) => Promise<any>) => {
        ipcHandlers.set(channel, handler);
      }),
      removeHandler: vi.fn((channel: string) => {
        ipcHandlers.delete(channel);
      }),
    },
  };
});

let senderValid = true;
vi.mock('../electron/security.js', () => ({
  validateIpcSender: vi.fn(() => senderValid),
}));

import {
  registerLessonPlannerIpcHandlers,
  unregisterLessonPlannerIpcHandlers,
} from '../electron/ipc/lesson-planner.ipc.js';

describe('Lesson Planner & Session Reflection IPC Handlers Suite', () => {
  let mockRuntime: any;
  let mockMainWindow: any;
  const mockSender = { id: 1 };
  const mockEvent = { sender: mockSender };

  const ownerActor = {
    userId: '11111111-1111-1111-1111-111111111111',
    fullName: 'الأستاذ أحمد',
    role: 'OWNER',
    permissions: ['GROUPS_READ', 'GROUPS_WRITE'],
  };

  const validPlanId = '11111111-2222-3333-4444-555555555555';
  const validReflectionId = '66666666-7777-8888-9999-000000000000';
  const validNodeId = 'node_math_01';
  const validSessionId = 'sess_01';

  beforeEach(() => {
    ipcHandlers.clear();
    senderValid = true;

    mockMainWindow = {
      webContents: {},
    };

    mockRuntime = {
      getMainWindow: vi.fn(() => mockMainWindow),
      requireActiveAcademicYear: vi.fn(),
      requireAuthenticatedActor: vi.fn(() => ownerActor),
      lessonPlannerService: {
        createLessonPlan: vi.fn(async (input, _actor) => ({
          id: validPlanId,
          ...input,
          version: 1,
        })),
        updateLessonPlan: vi.fn(async (id, input, _actor) => ({
          id,
          ...input,
          version: 2,
        })),
        getLessonPlanById: vi.fn(async (id, _actor) => ({
          id,
          title: 'خطة التفاضل',
          version: 1,
        })),
        listLessonPlansByNode: vi.fn(async (nodeId, _actor) => [
          { id: validPlanId, curriculumNodeId: nodeId, title: 'خطة التفاضل' },
        ]),
        listLessonPlans: vi.fn(async (_filter, _actor) => [
          { id: validPlanId, title: 'خطة التفاضل' },
        ]),
        archiveLessonPlan: vi.fn(async (id, _actor) => ({
          id,
          status: 'ARCHIVED',
        })),
      },
      sessionReflectionService: {
        createReflection: vi.fn(async (input, _actor) => ({
          id: validReflectionId,
          ...input,
        })),
        updateReflection: vi.fn(async (id, input, _actor) => ({
          id,
          ...input,
        })),
        getReflectionBySessionId: vi.fn(async (sessionId, _actor) => ({
          id: validReflectionId,
          sessionId,
          completionStatus: 'COMPLETED',
        })),
        getReflectionById: vi.fn(async (id, _actor) => ({
          id,
          completionStatus: 'COMPLETED',
        })),
      },
    };

    registerLessonPlannerIpcHandlers(mockRuntime, mockMainWindow);
  });

  it('registers all 10 lesson planner and session reflection IPC handlers', () => {
    expect(ipcHandlers.has(IPC_CHANNELS.LESSON_PLAN_CREATE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.LESSON_PLAN_UPDATE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.LESSON_PLAN_GET)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.LESSON_PLAN_LIST_BY_NODE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.LESSON_PLAN_LIST)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.LESSON_PLAN_ARCHIVE)).toBe(true);

    expect(ipcHandlers.has(IPC_CHANNELS.SESSION_REFLECTION_CREATE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.SESSION_REFLECTION_UPDATE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.SESSION_REFLECTION_GET_BY_SESSION)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.SESSION_REFLECTION_GET)).toBe(true);
  });

  it('unregisters all handlers cleanly', () => {
    unregisterLessonPlannerIpcHandlers();
    expect(ipcHandlers.has(IPC_CHANNELS.LESSON_PLAN_CREATE)).toBe(false);
    expect(ipcHandlers.has(IPC_CHANNELS.SESSION_REFLECTION_CREATE)).toBe(false);
  });

  it('rejects unauthorized IPC sender', async () => {
    senderValid = false;
    const handler = ipcHandlers.get(IPC_CHANNELS.LESSON_PLAN_LIST)!;
    await expect(handler(mockEvent)).rejects.toThrow('UNAUTHORIZED_IPC_SENDER');
  });

  it('delegates createLessonPlan when payload is valid', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.LESSON_PLAN_CREATE)!;
    const payload = {
      curriculumNodeId: validNodeId,
      title: 'خطة درس المشتقة الأولى',
      targetDurationMinutes: 60,
      sections: {
        objectives: ['حساب المشتقة'],
        priorReview: { version: 1, blocks: [] },
        explanation: { version: 1, blocks: [] },
        examples: { version: 1, blocks: [] },
        inClassQuestions: { version: 1, blocks: [] },
        commonMistakes: { version: 1, blocks: [] },
        homework: { version: 1, blocks: [] },
        timingBreakdown: [],
        notes: null,
      },
    };
    const res = await handler(mockEvent, payload);

    expect(res.success).toBe(true);
    expect(res.data.id).toBe(validPlanId);
    expect(mockRuntime.lessonPlannerService.createLessonPlan).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'خطة درس المشتقة الأولى' }),
      ownerActor
    );
  });

  it('delegates createReflection and freezes plan snapshot', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.SESSION_REFLECTION_CREATE)!;
    const payload = {
      sessionId: validSessionId,
      lessonPlanId: validPlanId,
      completionStatus: 'COMPLETED',
      quickNotes: 'تم الشرح بنجاح',
    };
    const res = await handler(mockEvent, payload);

    expect(res.success).toBe(true);
    expect(res.data.id).toBe(validReflectionId);
    expect(mockRuntime.sessionReflectionService.createReflection).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: validSessionId, completionStatus: 'COMPLETED' }),
      ownerActor
    );
  });

  it('delegates getReflectionBySession', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.SESSION_REFLECTION_GET_BY_SESSION)!;
    const res = await handler(mockEvent, validSessionId);

    expect(res.success).toBe(true);
    expect(res.data.sessionId).toBe(validSessionId);
  });
});
