import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import type {
  ImportSourceDocumentDto,
  SourceDocumentDto,
  UpdateSourceDocumentDto,
} from '@tibyan/contracts';
import { ImportSourceDocumentSchema, UpdateSourceDocumentSchema } from '@tibyan/contracts';
import {
  type SystemDrizzle,
  SourceDocumentRepository,
  SystemAuditRepository,
  type SourceDocumentRow,
} from '@tibyan/db';
import { PdfScanner } from '../sources/pdf-scanner.js';
import type { AuthActor } from '../sources/pdf-source.service.js';
import { requirePermission } from '../auth/permissions.js';

export interface CurriculumGradeGroup {
  gradeLevel: string | null;
  educationSystem: string | null;
  documents: SourceDocumentDto[];
  count: number;
}

export class CurriculumLibraryService {
  private readonly sourceDocRepo: SourceDocumentRepository;
  private readonly auditRepo: SystemAuditRepository;
  private readonly storageDir: string;

  constructor(systemDb: SystemDrizzle, storageDir: string) {
    this.sourceDocRepo = new SourceDocumentRepository(systemDb);
    this.auditRepo = new SystemAuditRepository(systemDb);
    this.storageDir = path.resolve(storageDir);

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  importCurriculum(input: ImportSourceDocumentDto, actor: AuthActor): SourceDocumentDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = ImportSourceDocumentSchema.parse(input);

    const scanned = PdfScanner.scanFile(validated.sourceFilePath);

    // SHA-256 duplicate detection
    const existing = this.sourceDocRepo.findByHash(scanned.sha256Hash);
    if (existing) {
      throw new Error(`الملف موجود بالفعل: "${existing.title}" (باستثناء التكرار)`);
    }

    const managedFileName = `${scanned.sha256Hash}.pdf`;
    const targetFilePath = path.join(this.storageDir, managedFileName);
    PdfScanner.assertWithinBase(targetFilePath, this.storageDir);

    if (!fs.existsSync(targetFilePath)) {
      fs.copyFileSync(validated.sourceFilePath, targetFilePath);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const created = this.sourceDocRepo.create({
      id,
      title: validated.title,
      author: validated.author ?? null,
      publisher: validated.publisher ?? null,
      editionYear: validated.editionYear ?? null,
      curriculumCatalogId: validated.curriculumCatalogId ?? null,
      filePath: path.relative(this.storageDir, targetFilePath),
      fileName: scanned.fileName,
      fileSizeBytes: scanned.fileSizeBytes,
      sha256Hash: scanned.sha256Hash,
      pageCount: scanned.pageCount,
      status: 'INDEXED',
      metadataJson: null,
      gradeLevel: validated.gradeLevel ?? null,
      educationSystem: validated.educationSystem ?? null,
      subject: validated.subject ?? null,
      description: validated.description ?? null,
      academicYearId: null,
      importSource: 'MANUAL',
      createdAt: now,
      updatedAt: now,
    });

    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'IMPORT_CURRICULUM_LIBRARY',
      entityType: 'SOURCE_DOCUMENT',
      entityId: id,
      afterJson: JSON.stringify(created),
      createdAt: now,
    });

    return this.mapToDto(created);
  }

  list(filter?: { gradeLevel?: string; subject?: string; educationSystem?: string }): SourceDocumentDto[] {
    const docs = filter
      ? this.sourceDocRepo.findByFilter(filter)
      : this.sourceDocRepo.list();
    return docs.map((d) => this.mapToDto(d));
  }

  listGrouped(): CurriculumGradeGroup[] {
    return this.sourceDocRepo.listGroupedByGrade().map((g) => ({
      gradeLevel: g.gradeLevel,
      educationSystem: g.educationSystem,
      documents: g.documents.map((d) => this.mapToDto(d)),
      count: g.count,
    }));
  }

  get(id: string): SourceDocumentDto {
    const doc = this.sourceDocRepo.findById(id);
    if (!doc) throw new Error(`الوثيقة غير موجودة: ${id}`);
    return this.mapToDto(doc);
  }

  update(id: string, input: UpdateSourceDocumentDto, actor: AuthActor): SourceDocumentDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = UpdateSourceDocumentSchema.parse(input);
    const doc = this.sourceDocRepo.findById(id);
    if (!doc) throw new Error(`الوثيقة غير موجودة: ${id}`);

    const updated = this.sourceDocRepo.update(id, {
      title: validated.title ?? doc.title,
      author: validated.author !== undefined ? validated.author : doc.author,
      publisher: validated.publisher !== undefined ? validated.publisher : doc.publisher,
      editionYear: validated.editionYear !== undefined ? validated.editionYear : doc.editionYear,
      curriculumCatalogId:
        validated.curriculumCatalogId !== undefined
          ? validated.curriculumCatalogId
          : doc.curriculumCatalogId,
      gradeLevel: (validated as any).gradeLevel ?? doc.gradeLevel,
      educationSystem: (validated as any).educationSystem ?? doc.educationSystem,
      subject: (validated as any).subject ?? doc.subject,
      description: (validated as any).description ?? doc.description,
    });

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'UPDATE_CURRICULUM_LIBRARY',
      entityType: 'SOURCE_DOCUMENT',
      entityId: id,
      beforeJson: JSON.stringify(doc),
      afterJson: JSON.stringify(updated),
      createdAt: now,
    });

    return this.mapToDto(updated);
  }

  delete(id: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const doc = this.sourceDocRepo.findById(id);
    if (!doc) throw new Error(`الوثيقة غير موجودة: ${id}`);

    this.sourceDocRepo.delete(id);

    const fullPath = path.join(this.storageDir, doc.filePath);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // Ignore physical file delete error
    }

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'DELETE_CURRICULUM_LIBRARY',
      entityType: 'SOURCE_DOCUMENT',
      entityId: id,
      beforeJson: JSON.stringify(doc),
      createdAt: now,
    });
  }

  resolvePdfPath(id: string): { filePath: string; pageCount: number } {
    const doc = this.sourceDocRepo.findById(id);
    if (!doc) throw new Error(`الوثيقة غير موجودة: ${id}`);
    return {
      filePath: path.resolve(this.storageDir, doc.filePath),
      pageCount: doc.pageCount,
    };
  }

  private mapToDto(row: SourceDocumentRow): SourceDocumentDto {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      publisher: row.publisher,
      editionYear: row.editionYear,
      curriculumCatalogId: row.curriculumCatalogId,
      filePath: row.filePath,
      fileName: row.fileName,
      fileSizeBytes: row.fileSizeBytes,
      sha256Hash: row.sha256Hash,
      pageCount: row.pageCount,
      status: row.status as any,
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : undefined,
      gradeLevel: (row as any).gradeLevel ?? null,
      educationSystem: (row as any).educationSystem ?? null,
      subject: (row as any).subject ?? null,
      description: (row as any).description ?? null,
      academicYearId: (row as any).academicYearId ?? null,
      importSource: (row as any).importSource ?? 'MANUAL',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
