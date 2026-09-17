import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ipcMain, dialog, type BrowserWindow } from 'electron';
import { z } from 'zod';
import {
  IPC_CHANNELS,
  CreateStudentIpcSchema,
  UpdateStudentIpcSchema,
  CreateStudentNoteSchema,
  StudentFilterSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
  type StudentDto,
  type PhotoSelectionDto,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export interface PendingPhotoToken {
  sourcePath: string;
  userId: string;
  academicYearId: string;
  expiresAt: number;
}

export const photoTokenRegistry = new Map<string, PendingPhotoToken>();

export function cleanExpiredPhotoTokens(): void {
  const now = Date.now();
  for (const [token, data] of photoTokenRegistry.entries()) {
    if (data.expiresAt <= now) {
      photoTokenRegistry.delete(token);
    }
  }
}

/**
 * Validates, consumes, and purges a pending photo token in a single operation.
 * Binds the token to the authenticated user and active academic year that selected it.
 * Enforces one-time consumption (replay protection) and expiration.
 */
export function consumePhotoToken(
  token: string,
  userId: string,
  academicYearId: string
): string {
  const pending = photoTokenRegistry.get(token);
  if (!pending) {
    throw new Error('INVALID_PHOTO_TOKEN: Token not found or already consumed');
  }

  // Purge immediately to prevent replay
  photoTokenRegistry.delete(token);

  if (pending.expiresAt <= Date.now()) {
    throw new Error('PHOTO_TOKEN_EXPIRED: Photo selection token has expired');
  }

  if (pending.userId !== userId) {
    throw new Error('INVALID_PHOTO_TOKEN: Token was selected by a different user session');
  }

  if (pending.academicYearId !== academicYearId) {
    throw new Error('INVALID_PHOTO_TOKEN: Token was selected for a different academic year');
  }

  // Opportunistic cleanup of other expired tokens
  cleanExpiredPhotoTokens();

  return pending.sourcePath;
}

export function registerPhotoTokenForTesting(
  token: string,
  data: PendingPhotoToken
): void {
  photoTokenRegistry.set(token, data);
}

export function clearPhotoTokensForTesting(): void {
  photoTokenRegistry.clear();
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
      const activeYearId = runtime.activeAcademicYear!.id;
      const validated = CreateStudentIpcSchema.parse(payload);

      let resolvedPhotoPath: string | null = null;
      if (typeof validated.photoToken === 'string') {
        resolvedPhotoPath = consumePhotoToken(validated.photoToken, actor.userId, activeYearId);
      }

      const coreInput: CreateStudentInput = {
        fullName: validated.fullName,
        educationSystem: validated.educationSystem,
        gradeLevel: validated.gradeLevel,
        languageTrack: validated.languageTrack,
        guardianPhone: validated.guardianPhone,
        photoPath: resolvedPhotoPath,
        initialNote: validated.initialNote,
      };

      const created = await runtime.studentService!.createStudent(
        coreInput,
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
      const activeYearId = runtime.activeAcademicYear!.id;
      const validated = UpdateStudentIpcSchema.parse(payload);

      let corePhotoPath: string | null | undefined = undefined;
      if (validated.photoToken === null) {
        // Explicit removal: photoToken = null
        corePhotoPath = null;
      } else if (typeof validated.photoToken === 'string') {
        // Replacement: photoToken = string
        corePhotoPath = consumePhotoToken(validated.photoToken, actor.userId, activeYearId);
      } else {
        // Preserved: photoToken = undefined
        corePhotoPath = undefined;
      }

      const coreInput: UpdateStudentInput = {
        studentId: validated.studentId,
        fullName: validated.fullName,
        educationSystem: validated.educationSystem,
        gradeLevel: validated.gradeLevel,
        languageTrack: validated.languageTrack,
        guardianPhone: validated.guardianPhone,
        photoPath: corePhotoPath,
        status: validated.status,
      };

      const updated = await runtime.studentService!.updateStudent(
        coreInput,
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
      const actor = runtime.requireAuthenticatedActor();
      runtime.requireActiveAcademicYear();
      const activeYearId = runtime.activeAcademicYear!.id;

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
        userId: actor.userId,
        academicYearId: activeYearId,
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
