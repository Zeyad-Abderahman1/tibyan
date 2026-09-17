import { ipcMain, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CreateGroupSchema,
  UpdateGroupSchema,
  SetGroupScheduleSchema,
  EnrollStudentSchema,
  UpdateEnrollmentPaymentSchema,
  EndEnrollmentSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerGroupsIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // --- Groups ---

  // 1. List groups (protected, academic-year scoped)
  ipcMain.handle(IPC_CHANNELS.GROUPS_LIST, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      return runtime.groupService!.listGroups({}, actor);
    });
  });

  // 2. Get group by ID (protected)
  ipcMain.handle(IPC_CHANNELS.GROUPS_GET_BY_ID, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const groupId = z.string().uuid('Invalid group ID').parse(payload);
      return runtime.groupService!.getGroupById(groupId, actor);
    });
  });

  // 3. Create group (protected: requires GROUPS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.GROUPS_CREATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateGroupSchema.parse(payload);
      return runtime.groupService!.createGroup(validated, actor);
    });
  });

  // 4. Update group (protected: requires GROUPS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.GROUPS_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = UpdateGroupSchema.parse(payload);
      return runtime.groupService!.updateGroup(validated, actor);
    });
  });

  // 5. Set group schedule (protected: requires GROUPS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.GROUPS_SET_SCHEDULE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = SetGroupScheduleSchema.parse(payload);
      await runtime.groupService!.setWeeklySchedule(validated, actor);
      return runtime.groupService!.getGroupById(validated.groupId, actor);
    });
  });

  // --- Enrollments ---

  // 6. List enrollments by group
  ipcMain.handle(IPC_CHANNELS.ENROLLMENTS_LIST_BY_GROUP, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const groupId = z.string().uuid('Invalid group ID').parse(payload);
      return runtime.enrollmentService!.listGroupEnrollments(groupId, false, actor);
    });
  });

  // 7. Enroll student
  ipcMain.handle(IPC_CHANNELS.ENROLLMENTS_ENROLL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = EnrollStudentSchema.parse(payload);
      return runtime.enrollmentService!.enrollStudent(validated, actor);
    });
  });

  // 8. Update enrollment payment override
  ipcMain.handle(IPC_CHANNELS.ENROLLMENTS_UPDATE_PAYMENT, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = UpdateEnrollmentPaymentSchema.parse(payload);
      return runtime.enrollmentService!.updateEnrollmentPaymentTerms(validated, actor);
    });
  });

  // 9. End enrollment
  ipcMain.handle(IPC_CHANNELS.ENROLLMENTS_END, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = EndEnrollmentSchema.parse(payload);
      await runtime.enrollmentService!.endEnrollment(validated, actor);
      return undefined;
    });
  });
}

export function unregisterGroupsIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.GROUPS_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.GROUPS_GET_BY_ID);
  ipcMain.removeHandler(IPC_CHANNELS.GROUPS_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.GROUPS_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.GROUPS_SET_SCHEDULE);
  ipcMain.removeHandler(IPC_CHANNELS.ENROLLMENTS_LIST_BY_GROUP);
  ipcMain.removeHandler(IPC_CHANNELS.ENROLLMENTS_ENROLL);
  ipcMain.removeHandler(IPC_CHANNELS.ENROLLMENTS_UPDATE_PAYMENT);
  ipcMain.removeHandler(IPC_CHANNELS.ENROLLMENTS_END);
}
