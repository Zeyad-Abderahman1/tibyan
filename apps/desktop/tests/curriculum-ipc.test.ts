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
  registerCurriculumIpcHandlers,
  unregisterCurriculumIpcHandlers,
} from '../electron/ipc/curriculum.ipc.js';

describe('Curriculum IPC Handlers Suite', () => {
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

  const validCatalogId = '22222222-2222-2222-2222-222222222222';
  const validNodeId = '33333333-3333-3333-3333-333333333333';
  const validGroupId = '44444444-4444-4444-4444-444444444444';

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
      curriculumService: {
        listCatalogs: vi.fn(async (_filter, _actor) => [
          { id: validCatalogId, title: 'منهج الصف الأول الثانوي' },
        ]),
        getCatalog: vi.fn(async (id, _actor) => ({
          id,
          title: 'منهج الصف الأول الثانوي',
        })),
        createCatalog: vi.fn(async (input, _actor) => ({
          id: validCatalogId,
          ...input,
          version: 1,
          status: 'DRAFT',
        })),
        updateCatalog: vi.fn(async (id, input, _actor) => ({
          id,
          ...input,
        })),
        publishCatalog: vi.fn(async (id, _actor) => ({
          id,
          status: 'PUBLISHED',
        })),
        reviseCatalog: vi.fn(async (id, _actor) => ({
          id: '55555555-5555-5555-5555-555555555555',
          previousVersionId: id,
          version: 2,
          status: 'DRAFT',
        })),
        getTree: vi.fn(async (catalogId, _actor) => [
          {
            id: validNodeId,
            catalogId,
            tier: 'UNIT',
            title: 'الوحدة الأولى',
            children: [],
          },
        ]),
        createNode: vi.fn(async (input, _actor) => ({
          id: validNodeId,
          ...input,
        })),
        updateNode: vi.fn(async (id, input, _actor) => ({
          id,
          ...input,
        })),
        deleteNode: vi.fn(async (_id, _actor) => undefined),
        reorderNodes: vi.fn(async (_input, _actor) => undefined),
        getGroupOverview: vi.fn(async (groupId, _actor) => ({
          assignment: { groupId, catalogId: validCatalogId },
          nodes: [],
          stats: { totalSkills: 10, completedSkills: 5, inProgressSkills: 1, skippedSkills: 0, completionRate: 50 },
          projection: { status: 'ON_TRACK', expectedCompletionSessions: 10, projectedCompletionDate: '2026-06-01', confidence: 0.8 },
        })),
        assignGroupCatalog: vi.fn(async (input, _actor) => ({
          id: '66666666-6666-6666-6666-666666666666',
          ...input,
        })),
        updateGroupNodeProgress: vi.fn(async (input, _actor) => ({
          id: '77777777-7777-7777-7777-777777777777',
          ...input,
        })),
        getGroupProgressMap: vi.fn(async (_groupId, _actor) => ({
          [validNodeId]: 'COMPLETED',
        })),
      },
    };

    registerCurriculumIpcHandlers(mockRuntime, mockMainWindow);
  });

  it('registers all 15 curriculum IPC handlers', () => {
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_LIST_CATALOGS)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_GET_CATALOG)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_CREATE_CATALOG)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_UPDATE_CATALOG)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_PUBLISH_CATALOG)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_REVISE_CATALOG)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_GET_TREE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_CREATE_NODE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_UPDATE_NODE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_DELETE_NODE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_REORDER_NODES)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_GET_GROUP_OVERVIEW)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_ASSIGN_GROUP_CATALOG)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_UPDATE_GROUP_PROGRESS)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_GET_GROUP_PROGRESS_MAP)).toBe(true);
  });

  it('unregisters all handlers cleanly', () => {
    unregisterCurriculumIpcHandlers();
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_LIST_CATALOGS)).toBe(false);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_GET_CATALOG)).toBe(false);
    expect(ipcHandlers.has(IPC_CHANNELS.CURRICULUM_CREATE_CATALOG)).toBe(false);
  });

  it('rejects unauthorized sender', async () => {
    senderValid = false;
    const handler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_LIST_CATALOGS)!;
    await expect(handler(mockEvent)).rejects.toThrow('UNAUTHORIZED_IPC_SENDER');
  });

  it('delegates listCatalogs to curriculumService', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_LIST_CATALOGS)!;
    const res = await handler(mockEvent, { educationSystem: 'GENERAL' });

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(mockRuntime.curriculumService.listCatalogs).toHaveBeenCalledWith(
      { educationSystem: 'GENERAL' },
      ownerActor
    );
  });

  it('validates UUID for getCatalog', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_GET_CATALOG)!;
    const res = await handler(mockEvent, 'not-a-uuid');

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(mockRuntime.curriculumService.getCatalog).not.toHaveBeenCalled();
  });

  it('delegates createCatalog when payload is valid', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_CREATE_CATALOG)!;
    const payload = {
      code: 'SEC1-ALG-AR-V1',
      title: 'رياضيات 1 ثانوي',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      mathBranch: 'ALGEBRA',
    };
    const res = await handler(mockEvent, payload);

    expect(res.success).toBe(true);
    expect(res.data.status).toBe('DRAFT');
    expect(mockRuntime.curriculumService.createCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'رياضيات 1 ثانوي' }),
      ownerActor
    );
  });

  it('delegates publishCatalog and reviseCatalog', async () => {
    const publishHandler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_PUBLISH_CATALOG)!;
    const pubRes = await publishHandler(mockEvent, validCatalogId);
    expect(pubRes.success).toBe(true);
    expect(pubRes.data.status).toBe('PUBLISHED');

    const reviseHandler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_REVISE_CATALOG)!;
    const revRes = await reviseHandler(mockEvent, validCatalogId);
    expect(revRes.success).toBe(true);
    expect(revRes.data.version).toBe(2);
  });

  it('delegates assignGroupCatalog and updateGroupProgress', async () => {
    const assignHandler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_ASSIGN_GROUP_CATALOG)!;
    const assignRes = await assignHandler(mockEvent, {
      groupId: validGroupId,
      catalogId: validCatalogId,
      assignedByUserId: ownerActor.userId,
    });
    expect(assignRes.success).toBe(true);

    const progressHandler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_UPDATE_GROUP_PROGRESS)!;
    const progRes = await progressHandler(mockEvent, {
      groupId: validGroupId,
      nodeId: validNodeId,
      status: 'COMPLETED',
      completedSessionsCount: 3,
    });
    expect(progRes.success).toBe(true);
  });

  it('delegates getGroupOverview with pacing projection', async () => {
    const handler = ipcHandlers.get(IPC_CHANNELS.CURRICULUM_GET_GROUP_OVERVIEW)!;
    const res = await handler(mockEvent, validGroupId);

    expect(res.success).toBe(true);
    expect(res.data.stats.totalSkills).toBe(10);
    expect(res.data.projection.status).toBe('ON_TRACK');
  });
});
