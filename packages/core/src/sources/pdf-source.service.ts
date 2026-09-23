import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import {
  type SourceDocumentDto,
  type ImportSourceDocumentDto,
  type UpdateSourceDocumentDto,
  type SourceReferenceDto,
  type CreateSourceReferenceDto,
  type UpdateSourceReferenceDto,
  ImportSourceDocumentSchema,
  UpdateSourceDocumentSchema,
  CreateSourceReferenceSchema,
  UpdateSourceReferenceSchema,
  type PermissionCode,
  type UserRole,
} from '@tibyan/contracts';
import {
  type SystemDrizzle,
  SourceDocumentRepository,
  SourceReferenceRepository,
  CurriculumCatalogRepository,
  SystemAuditRepository,
  type SourceDocumentRow,
  type SourceReferenceRow,
} from '@tibyan/db';
import { PdfScanner } from './pdf-scanner.js';
import { requirePermission } from '../auth/permissions.js';

export interface AuthActor {
  userId?: string;
  username?: string;
  fullName: string;
  role: UserRole;
  permissions?: PermissionCode[];
}

export class PdfSourceService {
  private readonly sourceDocRepo: SourceDocumentRepository;
  private readonly sourceRefRepo: SourceReferenceRepository;
  private readonly catalogRepo: CurriculumCatalogRepository;
  private readonly auditRepo: SystemAuditRepository;
  private readonly storageDir: string;

  constructor(
    systemDb: SystemDrizzle,
    storageDir: string
  ) {
    this.sourceDocRepo = new SourceDocumentRepository(systemDb);
    this.sourceRefRepo = new SourceReferenceRepository(systemDb);
    this.catalogRepo = new CurriculumCatalogRepository(systemDb);
    this.auditRepo = new SystemAuditRepository(systemDb);
    this.storageDir = path.resolve(storageDir);

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  importSource(input: ImportSourceDocumentDto, actor: AuthActor): SourceDocumentDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = ImportSourceDocumentSchema.parse(input);

    // 1. Scan PDF file structure and integrity
    const scanned = PdfScanner.scanFile(validated.sourceFilePath);

    // 2. Validate optional curriculum catalog reference
    if (validated.curriculumCatalogId) {
      const cat = this.catalogRepo.findById(validated.curriculumCatalogId);
      if (!cat) {
        throw new Error(`فهرس المنهج المحدد غير موجود: ${validated.curriculumCatalogId}`);
      }
    }

    // 3. Check for existing identical PDF (by SHA-256)
    const existing = this.sourceDocRepo.findByHash(scanned.sha256Hash);
    if (existing) {
      return this.mapDocToDto(existing);
    }

    // 4. Safely store in managed directory: <storageDir>/<sha256Hash>.pdf
    const managedFileName = `${scanned.sha256Hash}.pdf`;
    const targetFilePath = path.join(this.storageDir, managedFileName);
    PdfScanner.assertWithinBase(targetFilePath, this.storageDir);

    if (!fs.existsSync(targetFilePath)) {
      fs.copyFileSync(validated.sourceFilePath, targetFilePath);
    }

    // 5. Persist record in System DB
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
      createdAt: now,
      updatedAt: now,
    });

    // 6. Audit Log
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'IMPORT_SOURCE_DOCUMENT',
      entityType: 'SOURCE_DOCUMENT',
      entityId: id,
      afterJson: JSON.stringify(created),
      createdAt: now,
    });

    return this.mapDocToDto(created);
  }

  getSource(id: string): SourceDocumentDto {
    const doc = this.sourceDocRepo.findById(id);
    if (!doc) {
      throw new Error(`وثيقة المصدر غير موجودة: ${id}`);
    }
    return this.mapDocToDto(doc);
  }

  listSources(curriculumCatalogId?: string): SourceDocumentDto[] {
    const docs = this.sourceDocRepo.list(curriculumCatalogId);
    return docs.map((d) => this.mapDocToDto(d));
  }

  updateSource(id: string, input: UpdateSourceDocumentDto, actor: AuthActor): SourceDocumentDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = UpdateSourceDocumentSchema.parse(input);

    const doc = this.sourceDocRepo.findById(id);
    if (!doc) {
      throw new Error(`وثيقة المصدر غير موجودة: ${id}`);
    }

    if (validated.curriculumCatalogId) {
      const cat = this.catalogRepo.findById(validated.curriculumCatalogId);
      if (!cat) {
        throw new Error(`فهرس المنهج المحدد غير موجود: ${validated.curriculumCatalogId}`);
      }
    }

    const updated = this.sourceDocRepo.update(id, {
      title: validated.title ?? doc.title,
      author: validated.author !== undefined ? validated.author : doc.author,
      publisher: validated.publisher !== undefined ? validated.publisher : doc.publisher,
      editionYear: validated.editionYear !== undefined ? validated.editionYear : doc.editionYear,
      curriculumCatalogId:
        validated.curriculumCatalogId !== undefined
          ? validated.curriculumCatalogId
          : doc.curriculumCatalogId,
    });

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'UPDATE_SOURCE_DOCUMENT',
      entityType: 'SOURCE_DOCUMENT',
      entityId: id,
      beforeJson: JSON.stringify(doc),
      afterJson: JSON.stringify(updated),
      createdAt: now,
    });

    return this.mapDocToDto(updated);
  }

  deleteSource(id: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const doc = this.sourceDocRepo.findById(id);
    if (!doc) {
      throw new Error(`وثيقة المصدر غير موجودة: ${id}`);
    }

    // Remove DB record (cascades to source_references)
    this.sourceDocRepo.delete(id);

    // If file on disk is not referenced by any other row, safely delete
    const fullPath = path.join(this.storageDir, doc.filePath);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // Ignore physical file delete error
    }

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'DELETE_SOURCE_DOCUMENT',
      entityType: 'SOURCE_DOCUMENT',
      entityId: id,
      beforeJson: JSON.stringify(doc),
      createdAt: now,
    });
  }

  // --- Page References ---

  createReference(input: CreateSourceReferenceDto, actor: AuthActor): SourceReferenceDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = CreateSourceReferenceSchema.parse(input);

    const doc = this.sourceDocRepo.findById(validated.sourceDocumentId);
    if (!doc) {
      throw new Error(`وثيقة المصدر غير موجودة: ${validated.sourceDocumentId}`);
    }

    if (validated.startPage > doc.pageCount || validated.endPage > doc.pageCount) {
      throw new Error(
        `نطاق الصفحات المطلوب (${validated.startPage}-${validated.endPage}) يتجاوز إجمالي صفحات المصدر (${doc.pageCount})`
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const created = this.sourceRefRepo.create({
      id,
      sourceDocumentId: validated.sourceDocumentId,
      startPage: validated.startPage,
      endPage: validated.endPage,
      referenceLabel: validated.referenceLabel,
      notes: validated.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'CREATE_SOURCE_REFERENCE',
      entityType: 'SOURCE_REFERENCE',
      entityId: id,
      afterJson: JSON.stringify(created),
      createdAt: now,
    });

    return this.mapRefToDto(created);
  }

  listReferences(sourceDocumentId?: string): SourceReferenceDto[] {
    const refs = sourceDocumentId
      ? this.sourceRefRepo.listBySourceDocument(sourceDocumentId)
      : this.sourceRefRepo.findAll();
    return refs.map((r) => this.mapRefToDto(r));
  }

  updateReference(id: string, input: UpdateSourceReferenceDto, actor: AuthActor): SourceReferenceDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = UpdateSourceReferenceSchema.parse(input);

    const ref = this.sourceRefRepo.findById(id);
    if (!ref) {
      throw new Error(`مرجع الصفحة غير موجود: ${id}`);
    }

    const startPage = validated.startPage ?? ref.startPage;
    const endPage = validated.endPage ?? ref.endPage;
    if (endPage < startPage) {
      throw new Error('رقم صفحة النهاية يجب أن يكون أكبر من أو يساوي رقم صفحة البداية');
    }

    const updated = this.sourceRefRepo.update(id, {
      startPage,
      endPage,
      referenceLabel: validated.referenceLabel ?? ref.referenceLabel,
      notes: validated.notes !== undefined ? validated.notes : ref.notes,
    });

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'UPDATE_SOURCE_REFERENCE',
      entityType: 'SOURCE_REFERENCE',
      entityId: id,
      beforeJson: JSON.stringify(ref),
      afterJson: JSON.stringify(updated),
      createdAt: now,
    });

    return this.mapRefToDto(updated);
  }

  deleteReference(id: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const ref = this.sourceRefRepo.findById(id);
    if (!ref) {
      throw new Error(`مرجع الصفحة غير موجود: ${id}`);
    }

    this.sourceRefRepo.delete(id);

    const now = new Date().toISOString();
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'DELETE_SOURCE_REFERENCE',
      entityType: 'SOURCE_REFERENCE',
      entityId: id,
      beforeJson: JSON.stringify(ref),
      createdAt: now,
    });
  }

  resolveAbsolutePath(relativePath: string): string {
    return path.resolve(this.storageDir, relativePath);
  }

  private mapDocToDto(row: SourceDocumentRow): SourceDocumentDto {
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

  private mapRefToDto(row: SourceReferenceRow): SourceReferenceDto {
    return {
      id: row.id,
      sourceDocumentId: row.sourceDocumentId,
      startPage: row.startPage,
      endPage: row.endPage,
      referenceLabel: row.referenceLabel,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
