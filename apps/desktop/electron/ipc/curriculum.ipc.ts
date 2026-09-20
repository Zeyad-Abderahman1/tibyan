import { ipcMain, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CreateCurriculumCatalogSchema,
  UpdateCurriculumCatalogSchema,
  CurriculumCatalogFilterSchema,
  CreateCurriculumNodeSchema,
  UpdateCurriculumNodeSchema,
  ReorderCurriculumNodesSchema,
  AssignGroupCatalogSchema,
  UpdateGroupNodeProgressSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerCurriculumIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  // 1. List catalogs (protected, requires GROUPS_READ)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIST_CATALOGS, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const filter = payload ? CurriculumCatalogFilterSchema.parse(payload) : undefined;
      return runtime.curriculumService!.listCatalogs(filter, actor);
    });
  });

  // 2. Get catalog by ID (protected, requires GROUPS_READ)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_GET_CATALOG, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const id = z.string().uuid('Invalid catalog ID').parse(payload);
      return runtime.curriculumService!.getCatalog(id, actor);
    });
  });

  // 3. Create catalog (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_CREATE_CATALOG, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateCurriculumCatalogSchema.parse(payload);
      return runtime.curriculumService!.createCatalog(validated, actor);
    });
  });

  // 4. Update catalog (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_UPDATE_CATALOG, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const schema = z.object({
        id: z.string().uuid('Invalid catalog ID'),
        input: UpdateCurriculumCatalogSchema,
      });
      const { id, input } = schema.parse(payload);
      return runtime.curriculumService!.updateCatalog(id, input, actor);
    });
  });

  // 5. Publish catalog (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_PUBLISH_CATALOG, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const id = z.string().uuid('Invalid catalog ID').parse(payload);
      return runtime.curriculumService!.publishCatalog(id, actor);
    });
  });

  // 6. Revise catalog (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_REVISE_CATALOG, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const id = z.string().uuid('Invalid catalog ID').parse(payload);
      return runtime.curriculumService!.reviseCatalog(id, actor);
    });
  });

  // 7. Get hierarchy tree (protected, requires GROUPS_READ)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_GET_TREE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const catalogId = z.string().uuid('Invalid catalog ID').parse(payload);
      return runtime.curriculumService!.getTree(catalogId, actor);
    });
  });

  // 8. Create node (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_CREATE_NODE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateCurriculumNodeSchema.parse(payload);
      return runtime.curriculumService!.createNode(validated, actor);
    });
  });

  // 9. Update node (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_UPDATE_NODE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const schema = z.object({
        id: z.string().uuid('Invalid node ID'),
        input: UpdateCurriculumNodeSchema,
      });
      const { id, input } = schema.parse(payload);
      return runtime.curriculumService!.updateNode(id, input, actor);
    });
  });

  // 10. Delete node (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_DELETE_NODE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const id = z.string().uuid('Invalid node ID').parse(payload);
      return runtime.curriculumService!.deleteNode(id, actor);
    });
  });

  // 11. Reorder nodes (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_REORDER_NODES, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = ReorderCurriculumNodesSchema.parse(payload);
      return runtime.curriculumService!.reorderNodes(validated, actor);
    });
  });

  // 12. Get group curriculum overview (protected, requires GROUPS_READ)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_GET_GROUP_OVERVIEW, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const groupId = z.string().uuid('Invalid group ID').parse(payload);
      return runtime.curriculumService!.getGroupOverview(groupId, actor);
    });
  });

  // 13. Assign catalog to group (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_ASSIGN_GROUP_CATALOG, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = AssignGroupCatalogSchema.parse(payload);
      return runtime.curriculumService!.assignGroupCatalog(validated, actor);
    });
  });

  // 14. Update group node progress (protected, requires GROUPS_WRITE)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_UPDATE_GROUP_PROGRESS, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = UpdateGroupNodeProgressSchema.parse(payload);
      return runtime.curriculumService!.updateGroupNodeProgress(validated, actor);
    });
  });

  // 15. Get group progress map (protected, requires GROUPS_READ)
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_GET_GROUP_PROGRESS_MAP, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const groupId = z.string().uuid('Invalid group ID').parse(payload);
      return runtime.curriculumService!.getGroupProgressMap(groupId, actor);
    });
  });
}

export function unregisterCurriculumIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_LIST_CATALOGS);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_GET_CATALOG);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_CREATE_CATALOG);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_UPDATE_CATALOG);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_PUBLISH_CATALOG);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_REVISE_CATALOG);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_GET_TREE);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_CREATE_NODE);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_UPDATE_NODE);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_DELETE_NODE);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_REORDER_NODES);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_GET_GROUP_OVERVIEW);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_ASSIGN_GROUP_CATALOG);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_UPDATE_GROUP_PROGRESS);
  ipcMain.removeHandler(IPC_CHANNELS.CURRICULUM_GET_GROUP_PROGRESS_MAP);
}
