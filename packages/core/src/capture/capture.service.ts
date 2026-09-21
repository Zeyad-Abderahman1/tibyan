import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type CaptureSessionDto,
  type CaptureSubmissionDto,
  type CapturePageDto,
  CreateCaptureSessionSchema,
  ImportCaptureFilesSchema,
  AssociateSubmissionSchema,
  ReassignPageSchema,
  ExcludePageSchema,
  RotatePageSchema,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  CaptureRepository,
  AcademicAuditRepository,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import { type AuthActor } from '../sources/pdf-source.service.js';
import * as fsPromises from 'node:fs/promises';

export class CaptureService {
  private readonly captureRepo: CaptureRepository;
  private readonly academicAuditRepo: AcademicAuditRepository;

  constructor(
    academicDb: AcademicDrizzle,
    private readonly mediaRootDir: string,
  ) {
    this.captureRepo = new CaptureRepository(academicDb);
    this.academicAuditRepo = new AcademicAuditRepository(academicDb);
  }

  createSession(input: unknown, actor: AuthActor): CaptureSessionDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = CreateCaptureSessionSchema.parse(input);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const session = this.captureRepo.createSession({
      id,
      examId: validated.examId,
      examFormLabel: validated.examFormLabel,
      status: 'COLLECTING',
      totalSubmissions: 0,
      completedSubmissions: 0,
      createdAt: now,
      updatedAt: now,
    });

    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'CREATE_CAPTURE_SESSION',
      entityType: 'CAPTURE_SESSION',
      entityId: id,
      afterJson: JSON.stringify({ examId: validated.examId, formLabel: validated.examFormLabel }),
      createdAt: now,
    });

    return this.mapSessionToDto(session);
  }

  listSessions(): CaptureSessionDto[] {
    return this.captureRepo.listSessions().map((s) => this.mapSessionToDto(s));
  }

  getSession(id: string): CaptureSessionDto | null {
    const session = this.captureRepo.findSession(id);
    return session ? this.mapSessionToDto(session) : null;
  }

  deleteSession(id: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const now = new Date().toISOString();
    this.captureRepo.deleteSession(id);

    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'DELETE_CAPTURE_SESSION',
      entityType: 'CAPTURE_SESSION',
      entityId: id,
      createdAt: now,
    });
  }

  async importFiles(input: unknown, actor: AuthActor): Promise<{ pages: CapturePageDto[]; duplicates: Array<{ isDuplicate: boolean; existingPageId?: string; existingSubmissionId?: string }> }> {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = ImportCaptureFilesSchema.parse(input);
    const now = new Date().toISOString();
    const session = this.captureRepo.findSession(validated.sessionId);
    if (!session) throw new Error('جلسة التصوير غير موجودة');

    let submissionId = validated.submissionId;
    if (!submissionId) {
      const submission = this.captureRepo.createSubmission({
        id: crypto.randomUUID(),
        sessionId: validated.sessionId,
        studentId: validated.studentId ?? null,
        associationMethod: validated.studentId ? 'MANUAL' : 'UNASSOCIATED',
        status: 'PENDING',
        pageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      submissionId = submission.id;
      this.captureRepo.incrementSubmissionCount(validated.sessionId, now);
    }

    const pages: CapturePageDto[] = [];
    const duplicates: Array<{ isDuplicate: boolean; existingPageId?: string; existingSubmissionId?: string }> = [];
    const captureDir = path.join(this.mediaRootDir, 'captures', validated.sessionId);
    fs.mkdirSync(captureDir, { recursive: true });

    for (const filePath of validated.filePaths) {
      const stat = await fsPromises.stat(filePath).catch(() => null);
      if (!stat || !stat.isFile()) continue;

      const fileBuffer = await fsPromises.readFile(filePath);
      const fingerprint = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const existingPage = this.captureRepo.findByFingerprint(fingerprint);
      if (existingPage) {
        duplicates.push({
          isDuplicate: true,
          existingPageId: existingPage.id,
          existingSubmissionId: existingPage.submissionId,
        });
        continue;
      }

      const pageId = crypto.randomUUID();
      const ext = path.extname(filePath);
      const destPath = path.join(captureDir, `${pageId}${ext}`);
      await fsPromises.copyFile(filePath, destPath);

      const page = this.captureRepo.createPage({
        id: pageId,
        submissionId,
        sessionId: validated.sessionId,
        pageOrder: pages.length,
        source: ext.toLowerCase() === '.pdf' ? 'PDF' : 'IMAGE',
        originalFilePath: filePath,
        originalFileName: path.basename(filePath),
        originalFileSizeBytes: stat.size,
        fingerprintSha256: fingerprint,
        normalizedFilePath: null,
        status: 'IMPORTED',
        rotationDegrees: 0,
        excluded: false,
        failureReason: null,
        createdAt: now,
        updatedAt: now,
      });

      pages.push(this.mapPageToDto(page));
    }

    // Update submission page count
    this.captureRepo.updateSubmissionPageCount(submissionId, now);

    return { pages, duplicates };
  }

  listSubmissions(sessionId: string): CaptureSubmissionDto[] {
    return this.captureRepo.listSubmissions(sessionId).map((s) => this.mapSubmissionToDto(s));
  }

  getSubmission(id: string): CaptureSubmissionDto | null {
    const sub = this.captureRepo.findSubmission(id);
    return sub ? this.mapSubmissionToDto(sub) : null;
  }

  associateSubmission(input: unknown, actor: AuthActor): CaptureSubmissionDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = AssociateSubmissionSchema.parse(input);
    const now = new Date().toISOString();
    const submission = this.captureRepo.findSubmission(validated.submissionId);
    if (!submission) throw new Error('التسليم غير موجود');

    this.captureRepo.updateSubmissionStudent(
      validated.submissionId,
      validated.studentId,
      null,
      null,
      validated.studentId ? 'MANUAL' : 'UNASSOCIATED',
      now,
    );

    const updated = this.captureRepo.findSubmission(validated.submissionId)!;
    return this.mapSubmissionToDto(updated);
  }

  listPages(submissionId: string): CapturePageDto[] {
    return this.captureRepo.listPages(submissionId).map((p) => this.mapPageToDto(p));
  }

  rotatePage(input: unknown, actor: AuthActor): CapturePageDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = RotatePageSchema.parse(input);
    const now = new Date().toISOString();
    this.captureRepo.updatePageRotation(validated.pageId, parseInt(validated.rotationDegrees), now);
    const page = this.captureRepo.findPage(validated.pageId);
    if (!page) throw new Error('الصفحة غير موجودة');
    return this.mapPageToDto(page);
  }

  excludePage(input: unknown, actor: AuthActor): CapturePageDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = ExcludePageSchema.parse(input);
    const now = new Date().toISOString();
    this.captureRepo.updatePageExcluded(validated.pageId, validated.excluded, now);
    const page = this.captureRepo.findPage(validated.pageId);
    if (!page) throw new Error('الصفحة غير موجودة');
    return this.mapPageToDto(page);
  }

  reassignPage(input: unknown, actor: AuthActor): CapturePageDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = ReassignPageSchema.parse(input);
    const now = new Date().toISOString();
    this.captureRepo.reassignPage(validated.pageId, validated.targetSubmissionId, validated.newPageOrder, now);
    const page = this.captureRepo.findPage(validated.pageId);
    if (!page) throw new Error('الصفحة غير موجودة');
    return this.mapPageToDto(page);
  }

  checkDuplicate(fingerprintSha256: string): { isDuplicate: boolean; existingPageId?: string; existingSubmissionId?: string } {
    const existing = this.captureRepo.findByFingerprint(fingerprintSha256);
    if (!existing) {
      return { isDuplicate: false };
    }
    return {
      isDuplicate: true,
      existingPageId: existing.id,
      existingSubmissionId: existing.submissionId,
    };
  }

  private mapSessionToDto(row: any): CaptureSessionDto {
    return {
      id: row.id,
      examId: row.examId,
      examTitle: '',
      examFormLabel: row.examFormLabel,
      status: row.status,
      totalSubmissions: row.totalSubmissions,
      completedSubmissions: row.completedSubmissions,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapSubmissionToDto(row: any): CaptureSubmissionDto {
    return {
      id: row.id,
      sessionId: row.sessionId,
      studentId: row.studentId,
      studentName: row.studentNameSnapshot,
      studentCode: row.studentCodeSnapshot,
      associationMethod: row.associationMethod,
      status: row.status,
      pageCount: row.pageCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapPageToDto(row: any): CapturePageDto {
    return {
      id: row.id,
      submissionId: row.submissionId,
      sessionId: row.sessionId,
      pageOrder: row.pageOrder,
      source: row.source,
      originalFilePath: row.originalFilePath,
      originalFileName: row.originalFileName,
      originalFileSizeBytes: row.originalFileSizeBytes,
      fingerprintSha256: row.fingerprintSha256,
      normalizedFilePath: row.normalizedFilePath,
      status: row.status,
      rotationDegrees: row.rotationDegrees,
      excluded: row.excluded,
      failureReason: row.failureReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
