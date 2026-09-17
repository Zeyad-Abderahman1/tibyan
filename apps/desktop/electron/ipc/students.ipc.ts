import { ipcMain, dialog, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CreateStudentSchema,
  UpdateStudentSchema,
  CreateStudentNoteSchema,
  StudentFilterSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerStudentsIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // 1. List students (protected, academic-year scoped)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_LIST, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const filter = payload ? StudentFilterSchema.parse(payload) : {};
      return runtime.studentService!.searchStudents(filter, actor);
    });
  });

  // 2. Get student by ID (protected)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_GET_BY_ID, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const studentId = z.string().uuid('Invalid student ID').parse(payload);
      return runtime.studentService!.getStudentById(studentId, actor);
    });
  });

  // 3. Create student (protected: requires STUDENTS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_CREATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateStudentSchema.parse(payload);
      return runtime.studentService!.createStudent(validated, actor);
    });
  });

  // 4. Update student (protected: requires STUDENTS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = UpdateStudentSchema.parse(payload);
      return runtime.studentService!.updateStudent(validated, actor);
    });
  });

  // 5. Add student note (protected)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_ADD_NOTE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateStudentNoteSchema.parse(payload);
      return runtime.studentService!.addStudentNote(validated, actor);
    });
  });

  // 6. List student notes (protected)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_LIST_NOTES, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const studentId = z.string().uuid('Invalid student ID').parse(payload);
      return runtime.studentService!.listStudentNotes(studentId, actor);
    });
  });

  // 7. Choose photo native open file dialog (protected)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_CHOOSE_PHOTO_DIALOG, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: 'اختر صورة الطالب',
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
          })
        : { canceled: true, filePaths: [] };

      return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]!;
    });
  });
}

export function unregisterStudentsIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.STUDENTS_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.STUDENTS_GET_BY_ID);
  ipcMain.removeHandler(IPC_CHANNELS.STUDENTS_CREATE);
  ipcMain.removeHandler(IPC_CHANNELS.STUDENTS_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.STUDENTS_ADD_NOTE);
  ipcMain.removeHandler(IPC_CHANNELS.STUDENTS_LIST_NOTES);
  ipcMain.removeHandler(IPC_CHANNELS.STUDENTS_CHOOSE_PHOTO_DIALOG);
}
