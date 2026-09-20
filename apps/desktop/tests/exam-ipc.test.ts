import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CHANNELS } from '@tibyan/contracts';

const handlers = new Map<string, (event: unknown, payload?: unknown) => Promise<unknown>>();
let senderValid = true;

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => Promise<unknown>) => handlers.set(channel, handler)),
    removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
  },
  dialog: {
    showSaveDialog: vi.fn(async () => ({ canceled: false, filePath: 'C:/test/exam.pdf' })),
  },
}));

vi.mock('../electron/security.js', () => ({ validateIpcSender: vi.fn(() => senderValid) }));

import { registerExamIpcHandlers, unregisterExamIpcHandlers } from '../electron/ipc/exam.ipc.js';

describe('Exam IPC handlers suite', () => {
  const event = { sender: { id: 1 }, senderFrame: { parent: null } };
  let runtime: any;

  beforeEach(() => {
    handlers.clear();
    senderValid = true;
    runtime = {
      requireAuthenticatedActor: vi.fn(() => ({ userId: 'user-1', role: 'OWNER', permissions: [] })),
      requireActiveAcademicYear: vi.fn(),
      examService: {
        listExams: vi.fn(() => [{ id: 'e1', title: 'اختبار تجريبي' }]),
        getExam: vi.fn((id) => ({ id, title: 'اختبار تجريبي' })),
        previewAssembly: vi.fn(() => ({ valid: true, conflicts: [], selectedQuestions: [] })),
        confirmAssembly: vi.fn((input) => ({ id: 'e1', title: input.blueprint.title })),
        undoLastMutation: vi.fn(),
        renderPrintableHtml: vi.fn(() => '<!doctype html><html><body>اختبار</body></html>'),
      },
      aiExamService: {
        previewCandidates: vi.fn(async () => ({ candidates: [] })),
      },
    };
    registerExamIpcHandlers(runtime, {
      isDestroyed: () => false,
      webContents: {
        id: 1,
        print: vi.fn((_opts, cb) => cb?.(true)),
        printToPDF: vi.fn(async () => Buffer.from('%PDF-1.4')),
      },
    } as any);
  });

  it('handles list and get exam queries', async () => {
    const listHandler = handlers.get(IPC_CHANNELS.EXAMS_LIST)!;
    const listResult: any = await listHandler(event);
    expect(listResult.success).toBe(true);
    expect(listResult.data).toHaveLength(1);

    const getHandler = handlers.get(IPC_CHANNELS.EXAMS_GET)!;
    const getResult: any = await getHandler(event, 'e1');
    expect(getResult.success).toBe(true);
    expect(getResult.data.id).toBe('e1');
  });

  it('handles blueprint assembly preview and explicit confirmation', async () => {
    const previewHandler = handlers.get(IPC_CHANNELS.EXAMS_PREVIEW_ASSEMBLY)!;
    const previewResult: any = await previewHandler(event, {
      title: 'اختبار',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      curriculumNodeIds: ['11111111-1111-1111-1111-111111111111'],
      sourceReferenceIds: [],
      totalQuestions: 1,
      totalMarks: 2,
      durationMinutes: 30,
      difficultyDistribution: { EASY: 1, MEDIUM: 0, HARD: 0, ADVANCED: 0 },
      questionTypeDistribution: { MULTIPLE_CHOICE: 1, SHORT_ANSWER: 0, ESSAY: 0, TRUE_FALSE: 0 },
      variantCount: 1,
    });
    expect(previewResult.success).toBe(true);
    expect(previewResult.data.valid).toBe(true);

    const confirmHandler = handlers.get(IPC_CHANNELS.EXAMS_CONFIRM_ASSEMBLY)!;
    const confirmResult: any = await confirmHandler(event, {
      blueprint: {
        title: 'اختبار',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        curriculumNodeIds: ['11111111-1111-1111-1111-111111111111'],
        sourceReferenceIds: [],
        totalQuestions: 1,
        totalMarks: 2,
        durationMinutes: 30,
        difficultyDistribution: { EASY: 1, MEDIUM: 0, HARD: 0, ADVANCED: 0 },
        questionTypeDistribution: { MULTIPLE_CHOICE: 1, SHORT_ANSWER: 0, ESSAY: 0, TRUE_FALSE: 0 },
        variantCount: 1,
      },
      placements: [
        {
          provenance: 'QUESTION_BANK',
          body: { version: 1, blocks: [{ id: 'b1', type: 'text', content: 'سؤال' }] },
          modelAnswer: null,
          marks: 2,
          answerSpaceLines: 1,
          curriculumNodeIds: ['11111111-1111-1111-1111-111111111111'],
          sourceReferenceIds: [],
          position: 0,
        },
      ],
      sectionTitle: 'القسم الأول',
    });
    expect(confirmResult.success).toBe(true);
    expect(confirmResult.data.id).toBe('e1');
  });

  it('rejects untrusted IPC sender', async () => {
    senderValid = false;
    const listHandler = handlers.get(IPC_CHANNELS.EXAMS_LIST)!;
    await expect(listHandler(event)).rejects.toThrow('UNAUTHORIZED_IPC_SENDER');
  });

  it('unregisters all handlers on shutdown', () => {
    unregisterExamIpcHandlers();
    expect(handlers.size).toBe(0);
  });
});
