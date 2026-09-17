import crypto from 'crypto';
import {
  type StudentDto,
  type StudentNoteDto,
  type CreateStudentInput,
  type UpdateStudentInput,
  type CreateStudentNoteInput,
  type StudentFilterInput,
  type StudentStatus,
  type UserRole,
  type PermissionCode,
  CreateStudentSchema,
  UpdateStudentSchema,
  CreateStudentNoteSchema,
  StudentFilterSchema,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  getAcademicDatabase,
  StudentRepository,
  AcademicAuditRepository,
  type StudentRow,
  type StudentNoteRow,
} from '@tibyan/db';
import { PhotoService } from './photo.service.js';
import { requirePermission } from '../auth/permissions.js';

export type StudentErrorCode =
  | 'STUDENT_NOT_FOUND'
  | 'STUDENT_CODE_CONFLICT'
  | 'INVALID_STUDENT_STATUS_TRANSITION'
  | 'INVALID_PHOTO'
  | 'PHOTO_TOO_LARGE'
  | 'PHOTO_COPY_FAILED'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class StudentError extends Error {
  constructor(public readonly code: StudentErrorCode, message: string) {
    super(message);
    this.name = 'StudentError';
  }
}

export interface AuthenticatedUser {
  userId: string;
  fullName: string;
  role: UserRole;
  permissions?: PermissionCode[];
}

export class StudentService {
  public readonly studentRepo: StudentRepository;
  public readonly auditRepo: AcademicAuditRepository;

  constructor(
    private db?: AcademicDrizzle,
    public readonly photoService: PhotoService = new PhotoService('./media')
  ) {
    this.studentRepo = new StudentRepository(this.db);
    this.auditRepo = new AcademicAuditRepository(this.db);
  }

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  private toStudentDto(student: StudentRow): StudentDto {
    return {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      photoPath: student.photoPath,
      educationSystem: student.educationSystem,
      gradeLevel: student.gradeLevel,
      languageTrack: student.languageTrack,
      guardianPhone: student.guardianPhone,
      status: student.status,
      qrToken: student.qrToken,
      barcodeValue: student.barcodeValue,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  private toStudentNoteDto(note: StudentNoteRow): StudentNoteDto {
    return {
      id: note.id,
      studentId: note.studentId,
      authorUserId: note.authorUserId,
      authorNameSnapshot: note.authorNameSnapshot,
      noteText: note.noteText,
      tag: note.tag,
      createdAt: note.createdAt,
    };
  }

  private parseSchema<T>(schema: { parse: (v: any) => T }, data: any): T {
    try {
      return schema.parse(data);
    } catch (err: any) {
      throw new StudentError('INVALID_INPUT', err.message || 'Invalid input');
    }
  }

  private checkPermission(actor: AuthenticatedUser, permission: PermissionCode): void {
    try {
      requirePermission(actor.role, actor.permissions ?? [], permission);
    } catch (err: any) {
      throw new StudentError('PERMISSION_DENIED', err.message || `Permission denied: ${permission}`);
    }
  }

  private isStudentCodeCollisionError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const anyErr = err as Record<string, unknown>;
    const code = anyErr.code;
    const message = typeof anyErr.message === 'string' ? anyErr.message : '';

    return (
      (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT') &&
      (message.includes('students.student_code') ||
        message.includes('student_code') ||
        message.includes('students.barcode_value') ||
        message.includes('barcode_value'))
    );
  }

  /**
   * Generates a unique, human-friendly student code with collision resistance.
   */
  private generateUniqueStudentCode(repo: StudentRepository, retryAttempt: number = 0): string {
    const totalCount = repo.list().length + 1 + retryAttempt;

    // 1. Sequential attempt based on active student count
    for (let i = 0; i < 20; i++) {
      const candidateNumber = totalCount + i;
      const candidateCode = `TB-${candidateNumber.toString().padStart(4, '0')}`;
      if (!repo.findByCode(candidateCode)) {
        return candidateCode;
      }
    }

    // 2. Bounded random fallback
    for (let attempt = 0; attempt < 25; attempt++) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const candidateCode = `TB-${randomDigits}`;
      if (!repo.findByCode(candidateCode)) {
        return candidateCode;
      }
    }

    throw new StudentError('STUDENT_CODE_CONFLICT', 'Unable to allocate a unique student code');
  }

  /**
   * Creates a new student and generates immutable/unique identifiers (studentCode, qrToken, barcodeValue).
   */
  async createStudent(
    input: CreateStudentInput,
    actor: AuthenticatedUser
  ): Promise<StudentDto> {
    const validated = this.parseSchema(CreateStudentSchema, input);
    this.checkPermission(actor, 'STUDENTS_WRITE');

    const studentId = crypto.randomUUID();
    let managedPhotoPath: string | null = null;

    // 1. Managed photo storage (compensating cleanup on failure)
    if (validated.photoPath) {
      try {
        const saved = await this.photoService.saveStudentPhoto(studentId, validated.photoPath);
        managedPhotoPath = saved.relativePath;
      } catch (err: any) {
        throw new StudentError(err.code || 'INVALID_PHOTO', err.message);
      }
    }

    const nowIso = new Date().toISOString();
    const MAX_CREATION_ATTEMPTS = 5;
    let lastCollisionError: unknown = null;

    try {
      // 2. Bounded retry loop for TOCTOU constraint collision safety
      for (let attempt = 0; attempt < MAX_CREATION_ATTEMPTS; attempt++) {
        try {
          const createdStudent = this.client.transaction((tx) => {
            const studentRepoTx = new StudentRepository(tx as any);
            const auditRepoTx = new AcademicAuditRepository(tx as any);

            const studentCode = this.generateUniqueStudentCode(studentRepoTx, attempt);
            // Opaque 16-byte random QR token containing no PII
            const qrToken = crypto.randomBytes(16).toString('hex');
            const barcodeValue = studentCode;

            const row = studentRepoTx.create({
              id: studentId,
              studentCode,
              fullName: validated.fullName.trim(),
              photoPath: managedPhotoPath,
              educationSystem: validated.educationSystem,
              gradeLevel: validated.gradeLevel,
              languageTrack: validated.languageTrack,
              guardianPhone: validated.guardianPhone,
              status: 'ACTIVE',
              qrToken,
              barcodeValue,
              createdAt: nowIso,
              updatedAt: nowIso,
            });

            // Optional initial student note
            if (validated.initialNote && validated.initialNote.trim().length > 0) {
              studentRepoTx.addNote({
                id: crypto.randomUUID(),
                studentId,
                authorUserId: actor.userId,
                authorNameSnapshot: actor.fullName,
                noteText: validated.initialNote.trim(),
                tag: 'GENERAL',
                createdAt: nowIso,
              });
            }

            // Academic audit entry
            auditRepoTx.insert({
              id: crypto.randomUUID(),
              actorType: 'USER',
              actorUserId: actor.userId,
              actorNameSnapshot: actor.fullName,
              action: 'STUDENT_CREATED',
              entityType: 'STUDENT',
              entityId: studentId,
              beforeJson: null,
              afterJson: JSON.stringify(this.toStudentDto(row)),
              metadataJson: JSON.stringify({
                studentCode,
                educationSystem: row.educationSystem,
                gradeLevel: row.gradeLevel,
                languageTrack: row.languageTrack,
              }),
              createdAt: nowIso,
            });

            return row;
          });

          return this.toStudentDto(createdStudent);
        } catch (txError: unknown) {
          if (this.isStudentCodeCollisionError(txError)) {
            lastCollisionError = txError;
            continue;
          }
          // Non-collision errors (audit failure, validation error, etc.) must not be retried as collisions
          throw txError;
        }
      }

      // Exhausted bounded retry budget
      throw new StudentError(
        'STUDENT_CODE_CONFLICT',
        `Exhausted collision retry budget for studentCode: ${(lastCollisionError as any)?.message || 'repeated constraint violations'}`
      );
    } catch (dbError) {
      // Compensating action: remove newly copied photo on DB failure
      if (managedPhotoPath) {
        await this.photoService.deleteManagedPhoto(managedPhotoPath);
      }
      throw dbError;
    }
  }

  /**
   * Updates student details, photo, or status.
   */
  async updateStudent(
    input: UpdateStudentInput,
    actor: AuthenticatedUser
  ): Promise<StudentDto> {
    const validated = this.parseSchema(UpdateStudentSchema, input);
    this.checkPermission(actor, 'STUDENTS_WRITE');

    const existing = this.studentRepo.findById(validated.studentId);
    if (!existing) {
      throw new StudentError('STUDENT_NOT_FOUND', `Student not found: ${validated.studentId}`);
    }

    if (validated.status && validated.status !== 'ACTIVE' && validated.status !== 'INACTIVE') {
      throw new StudentError('INVALID_STUDENT_STATUS_TRANSITION', `Unsupported student status: ${validated.status}`);
    }

    let newlyCopiedPhoto: string | null = null;
    let finalPhotoPath: string | null | undefined = existing.photoPath;

    // Handle photo replacement or removal
    if (validated.photoPath !== undefined) {
      if (validated.photoPath === null) {
        finalPhotoPath = null;
      } else if (validated.photoPath !== existing.photoPath) {
        try {
          const saved = await this.photoService.saveStudentPhoto(existing.id, validated.photoPath);
          newlyCopiedPhoto = saved.relativePath;
          finalPhotoPath = newlyCopiedPhoto;
        } catch (err: any) {
          throw new StudentError(err.code || 'INVALID_PHOTO', err.message);
        }
      }
    }

    const nowIso = new Date().toISOString();
    const oldPhotoToDelete = (finalPhotoPath !== existing.photoPath) ? existing.photoPath : null;

    try {
      const updated = this.client.transaction((tx) => {
        const studentRepoTx = new StudentRepository(tx as any);
        const auditRepoTx = new AcademicAuditRepository(tx as any);

        const updates: Partial<Omit<StudentRow, 'id' | 'createdAt'>> = {
          updatedAt: nowIso,
        };

        if (validated.fullName !== undefined) updates.fullName = validated.fullName.trim();
        if (validated.educationSystem !== undefined) updates.educationSystem = validated.educationSystem;
        if (validated.gradeLevel !== undefined) updates.gradeLevel = validated.gradeLevel;
        if (validated.languageTrack !== undefined) updates.languageTrack = validated.languageTrack;
        if (validated.guardianPhone !== undefined) updates.guardianPhone = validated.guardianPhone;
        if (validated.status !== undefined) updates.status = validated.status;
        if (validated.photoPath !== undefined) updates.photoPath = finalPhotoPath;

        const res = studentRepoTx.update(existing.id, updates)!;

        const updatedFields = Object.keys(updates).filter((k) => k !== 'updatedAt');
        const isPhotoOnly = updatedFields.length === 1 && updatedFields[0] === 'photoPath';
        const action = isPhotoOnly ? 'STUDENT_PHOTO_CHANGED' : 'STUDENT_UPDATED';

        auditRepoTx.insert({
          id: crypto.randomUUID(),
          actorType: 'USER',
          actorUserId: actor.userId,
          actorNameSnapshot: actor.fullName,
          action,
          entityType: 'STUDENT',
          entityId: existing.id,
          beforeJson: JSON.stringify(this.toStudentDto(existing)),
          afterJson: JSON.stringify(this.toStudentDto(res)),
          metadataJson: JSON.stringify(
            isPhotoOnly
              ? { oldPhotoPath: existing.photoPath, newPhotoPath: finalPhotoPath }
              : { updatedFields }
          ),
          createdAt: nowIso,
        });

        return res;
      });

      // Post-commit cleanup of superseded photo
      if (oldPhotoToDelete) {
        await this.photoService.deleteManagedPhoto(oldPhotoToDelete);
      }

      return this.toStudentDto(updated);
    } catch (err) {
      // Compensating action: clean newly copied photo if DB transaction fails
      if (newlyCopiedPhoto) {
        await this.photoService.deleteManagedPhoto(newlyCopiedPhoto);
      }
      throw err;
    }
  }

  /**
   * Retrieves a student by ID.
   */
  async getStudentById(studentId: string, actor: AuthenticatedUser): Promise<StudentDto> {
    this.checkPermission(actor, 'STUDENTS_READ');

    const student = this.studentRepo.findById(studentId);
    if (!student) {
      throw new StudentError('STUDENT_NOT_FOUND', `Student not found: ${studentId}`);
    }

    return this.toStudentDto(student);
  }

  /**
   * Searches and filters students.
   */
  async searchStudents(
    filter: StudentFilterInput,
    actor: AuthenticatedUser
  ): Promise<StudentDto[]> {
    const validated = this.parseSchema(StudentFilterSchema, filter);
    this.checkPermission(actor, 'STUDENTS_READ');

    const rows = this.studentRepo.list({
      searchQuery: validated.searchQuery,
      status: validated.status,
      gradeLevel: validated.gradeLevel,
      educationSystem: validated.educationSystem,
      languageTrack: validated.languageTrack,
    });

    return rows.map((r) => this.toStudentDto(r));
  }

  /**
   * Sets student status (soft-state transition: ACTIVE <-> INACTIVE).
   */
  async setStudentStatus(
    studentId: string,
    status: StudentStatus,
    actor: AuthenticatedUser
  ): Promise<StudentDto> {
    this.checkPermission(actor, 'STUDENTS_WRITE');

    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      throw new StudentError('INVALID_STUDENT_STATUS_TRANSITION', `Unsupported student status: ${status}`);
    }

    const existing = this.studentRepo.findById(studentId);
    if (!existing) {
      throw new StudentError('STUDENT_NOT_FOUND', `Student not found: ${studentId}`);
    }

    const nowIso = new Date().toISOString();

    const updated = this.client.transaction((tx) => {
      const studentRepoTx = new StudentRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const res = studentRepoTx.update(studentId, {
        status,
        updatedAt: nowIso,
      })!;

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action: 'STUDENT_STATUS_CHANGED',
        entityType: 'STUDENT',
        entityId: studentId,
        beforeJson: JSON.stringify(this.toStudentDto(existing)),
        afterJson: JSON.stringify(this.toStudentDto(res)),
        metadataJson: JSON.stringify({
          oldStatus: existing.status,
          newStatus: status,
        }),
        createdAt: nowIso,
      });

      return res;
    });

    return this.toStudentDto(updated);
  }

  /**
   * Adds an academic or behavioral note to a student.
   */
  async addStudentNote(
    input: CreateStudentNoteInput,
    actor: AuthenticatedUser
  ): Promise<StudentNoteDto> {
    const validated = this.parseSchema(CreateStudentNoteSchema, input);
    this.checkPermission(actor, 'STUDENTS_WRITE');

    const existing = this.studentRepo.findById(validated.studentId);
    if (!existing) {
      throw new StudentError('STUDENT_NOT_FOUND', `Student not found: ${validated.studentId}`);
    }

    const noteId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const note = this.client.transaction((tx) => {
      const studentRepoTx = new StudentRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const createdNote = studentRepoTx.addNote({
        id: noteId,
        studentId: validated.studentId,
        authorUserId: actor.userId,
        authorNameSnapshot: actor.fullName,
        noteText: validated.noteText.trim(),
        tag: validated.tag,
        createdAt: nowIso,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action: 'STUDENT_NOTE_ADDED',
        entityType: 'STUDENT',
        entityId: validated.studentId,
        beforeJson: null,
        afterJson: JSON.stringify(this.toStudentNoteDto(createdNote)),
        metadataJson: JSON.stringify({
          noteId,
          tag: validated.tag,
        }),
        createdAt: nowIso,
      });

      return createdNote;
    });

    return this.toStudentNoteDto(note);
  }

  /**
   * Lists cumulative notes for a student.
   */
  async listStudentNotes(
    studentId: string,
    actor: AuthenticatedUser
  ): Promise<StudentNoteDto[]> {
    this.checkPermission(actor, 'STUDENTS_READ');

    const existing = this.studentRepo.findById(studentId);
    if (!existing) {
      throw new StudentError('STUDENT_NOT_FOUND', `Student not found: ${studentId}`);
    }

    const notes = this.studentRepo.getNotes(studentId);
    return notes.map((n) => this.toStudentNoteDto(n));
  }

  /**
   * Sets or clears a student's photo using managed photo storage.
   */
  async setStudentPhoto(
    studentId: string,
    sourcePhotoPath: string | null,
    actor: AuthenticatedUser
  ): Promise<StudentDto> {
    return this.updateStudent({ studentId, photoPath: sourcePhotoPath }, actor);
  }
}
