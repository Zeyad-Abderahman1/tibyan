import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ipcMain, dialog, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CreateStudentSchema,
  UpdateStudentSchema,
  CreateStudentNoteSchema,
  StudentFilterSchema,
  type StudentDto,
  type PhotoSelectionDto,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

interface PendingPhotoToken {
  sourcePath: string;
  expiresAt: number;
}

const photoTokenRegistry = new Map<string, PendingPhotoToken>();

function cleanExpiredPhotoTokens(): void {
  const now = Date.now();
  for (const [token, data] of photoTokenRegistry.entries()) {
    if (data.expiresAt <= now) {
      photoTokenRegistry.delete(token);
    }
  }
}

function detectImageType(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

function attachPhotoUrl(student: StudentDto): StudentDto {
  return {
    ...student,
    photoUrl: student.photoPath ? `tibyan-media://${student.photoPath}` : undefined,
  };
}

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
      const students = await runtime.studentService!.searchStudents(filter, actor);
      return students.map(attachPhotoUrl);
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
      const student = await runtime.studentService!.getStudentById(studentId, actor);
      return attachPhotoUrl(student);
    });
  });

  // 3. Create student (protected: requires STUDENTS_WRITE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_CREATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = CreateStudentSchema.parse(payload);

      let resolvedPhotoPath: string | null = null;
      if (validated.photoPath) {
        cleanExpiredPhotoTokens();
        const pending = photoTokenRegistry.get(validated.photoPath);
        if (pending) {
          photoTokenRegistry.delete(validated.photoPath);
          if (pending.expiresAt > Date.now()) {
            resolvedPhotoPath = pending.sourcePath;
          } else {
            throw new Error('PHOTO_TOKEN_EXPIRED');
          }
        } else {
          throw new Error('INVALID_PHOTO_TOKEN: Untrusted photo source');
        }
      }

      const created = await runtime.studentService!.createStudent(
        { ...validated, photoPath: resolvedPhotoPath },
        actor
      );
      return attachPhotoUrl(created);
    });
  });

  // 4. Update student (protected: requires STUDENTS_WRITE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const validated = UpdateStudentSchema.parse(payload);

      let resolvedPhotoPath: string | null | undefined = validated.photoPath;
      if (validated.photoPath !== undefined && validated.photoPath !== null) {
        cleanExpiredPhotoTokens();
        const pending = photoTokenRegistry.get(validated.photoPath);
        if (pending) {
          photoTokenRegistry.delete(validated.photoPath);
          if (pending.expiresAt > Date.now()) {
            resolvedPhotoPath = pending.sourcePath;
          } else {
            throw new Error('PHOTO_TOKEN_EXPIRED');
          }
        } else {
          // If not in token registry, check if it equals existing student's photoPath
          const existing = await runtime.studentService!.getStudentById(validated.studentId, actor);
          if (validated.photoPath === existing.photoPath) {
            resolvedPhotoPath = existing.photoPath;
          } else {
            throw new Error('INVALID_PHOTO_TOKEN: Untrusted photo source');
          }
        }
      }

      const updated = await runtime.studentService!.updateStudent(
        { ...validated, photoPath: resolvedPhotoPath },
        actor
      );
      return attachPhotoUrl(updated);
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

  // 7. Choose photo native open file dialog (protected, opaque selection token)
  ipcMain.handle(IPC_CHANNELS.STUDENTS_CHOOSE_PHOTO_DIALOG, async (event): Promise<any> => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async (): Promise<PhotoSelectionDto | null> => {
      runtime.requireAuthenticatedActor();
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: 'اختر صورة الطالب',
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
          })
        : { canceled: true, filePaths: [] };

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const sourcePath = path.resolve(result.filePaths[0]!);
      cleanExpiredPhotoTokens();

      const stat = await fs.promises.stat(sourcePath);
      if (!stat.isFile()) {
        throw new Error('INVALID_PHOTO: Not a regular file');
      }
      if (stat.size > 10 * 1024 * 1024) {
        throw new Error('PHOTO_TOO_LARGE: Photo exceeds maximum allowed size (10 MB)');
      }

      const handle = await fs.promises.open(sourcePath, 'r');
      const headerBuffer = Buffer.alloc(16);
      await handle.read(headerBuffer, 0, 16, 0);
      await handle.close();

      const imgType = detectImageType(headerBuffer);
      if (!imgType) {
        throw new Error('INVALID_PHOTO: Unsupported or corrupted image format. Only JPEG, PNG, and WebP are allowed.');
      }

      const fileBuffer = await fs.promises.readFile(sourcePath);
      const mimeType = imgType === 'jpg' ? 'image/jpeg' : imgType === 'png' ? 'image/png' : 'image/webp';
      const previewUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      const photoToken = crypto.randomUUID();
      photoTokenRegistry.set(photoToken, {
        sourcePath,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      return { photoToken, previewUrl };
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

