# Curriculum Library + Central AI Workspace Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual-first curriculum entry with a managed curriculum document library, redesign the Tibyan assistant into a centralized creation hub with right-sidebar task selector, add exam source-choice workflow, and implement review/notes generation.

**Architecture:** Extend the existing `sourceDocuments` table with curriculum metadata columns. Reuse `PdfSourceService` for file management. Create a new `CurriculumLibraryService` that wraps existing infrastructure. Redesign `AssistantPage` into a task-based workspace with conversation history and right sidebar. Add new IPC channels for library, task actions, and content generation.

**Tech Stack:** Electron 34, React 18, TypeScript, Vite 6, Drizzle ORM, better-sqlite3, Zod, pnpm monorepo, Arabic RTL, Cairo typography.

**Spec:** PO-provided specification in the task message (curriculum library, exam source-choice, central AI workspace, history, review/notes, platform control).

---

## Global Constraints

- Windows-first, local-first, offline-capable
- Arabic RTL first, Cairo typography, petrol/teal visual system
- No new npm/pnpm packages without PO approval
- Reuse existing PDF/source-document infrastructure
- Math Engine remains hidden; Gemini never exposed to teacher
- TEACHER_FACING_AI_NAME=تِبيان
- TEACHER_FACING_GEMINI_REFERENCES=0
- MATH_ENGINE_TEACHER_VISIBLE=false
- Context isolation, sandbox, no nodeIntegration
- Zod-validated IPC, append-only audit
- Logo SHA-256: `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`
- System DB migration numbering: current max is 0005 → new is 0006
- Academic DB migration numbering: current max is 0011 → no new academic migrations needed

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `packages/db/src/migrations/system/0016_curriculum-library-metadata.sql` | Add columns to source_documents |
| `packages/contracts/src/models/curriculum-library.dto.ts` | Library DTOs and Zod schemas |
| `packages/contracts/src/models/tibyan-workspace.dto.ts` | Workspace task/session DTOs |
| `packages/core/src/curriculum/curriculum-library.service.ts` | Library service (upload, classify, group, view) |
| `packages/core/src/assistant/ai-content.service.ts` | AI content generation (review, notes, slides) |
| `apps/desktop/electron/ipc/curriculum-library.ipc.ts` | Library IPC handlers |
| `apps/desktop/electron/ipc/tibyan-workspace.ipc.ts` | Workspace IPC handlers |
| `apps/desktop/src/features/curriculum-library/CurriculumLibraryPage.tsx` | Library UI |
| `apps/desktop/src/features/curriculum-library/CurriculumUploadZone.tsx` | Drag/drop + browse upload |
| `apps/desktop/src/features/curriculum-library/CurriculumPdfViewer.tsx` | Inline PDF viewer |
| `apps/desktop/src/features/curriculum-library/CurriculumGradeGroup.tsx` | Grade-grouped display |
| `apps/desktop/src/features/tibyan-workspace/TibyanWorkspacePage.tsx` | Central workspace redesign |
| `apps/desktop/src/features/tibyan-workspace/TaskSidebar.tsx` | Right-side task selector |
| `apps/desktop/src/features/tibyan-workspace/WorkspaceHistory.tsx` | Conversation/task history |
| `apps/desktop/src/features/tibyan-workspace/SourceChoiceModal.tsx` | Upload PDF or select curriculum |
| `apps/desktop/src/features/tibyan-workspace/ReviewGenerator.tsx` | Review generation UI |
| `apps/desktop/src/features/tibyan-workspace/NotesGenerator.tsx` | Notes generation UI |
| `apps/desktop/src/features/tibyan-workspace/ExamSourceChoice.tsx` | Exam source selection |
| `apps/desktop/src/hooks/useCurriculumLibrary.ts` | Library data hooks |
| `apps/desktop/src/hooks/useTibyanWorkspace.ts` | Workspace data hooks |

### Modified Files
| File | Changes |
|------|---------|
| `packages/db/src/schema/system.schema.ts` | Add columns to sourceDocuments |
| `packages/contracts/src/models/source-document.dto.ts` | Extend schemas |
| `packages/contracts/src/ipc/channels.ts` | Add new IPC channels |
| `packages/contracts/src/ipc/api.ts` | Add new API methods |
| `packages/db/src/repositories/source-document.ts` | Add library query methods |
| `packages/core/src/sources/pdf-source.service.ts` | Support new metadata |
| `packages/core/src/index.ts` | Export new services |
| `apps/desktop/electron/runtime.ts` | Wire new services |
| `apps/desktop/electron/ipc/index.ts` | Register new handlers |
| `apps/desktop/src/app/router.tsx` | Add/update routes |
| `apps/desktop/src/components/layout/DynamicIslandNav.tsx` | Add curriculum library nav |
| `apps/desktop/src/features/assistant/AssistantPage.tsx` | Redirect to workspace |
| `apps/desktop/src/features/exams/ExamBuilderPage.tsx` | Add source-choice first step |

---

## Task 1: Database Migration — Extend Source Documents

**Files:**
- Create: `packages/db/src/migrations/system/0016_curriculum-library-metadata.sql`
- Modify: `packages/db/src/schema/system.schema.ts` (add columns to sourceDocuments)

**Interfaces:**
- Produces: Extended `sourceDocuments` table with `gradeLevel`, `educationSystem`, `subject`, `description`, `academicYearId`, `importSource` columns

- [ ] **Step 1: Create the migration SQL**

```sql
-- packages/db/src/migrations/system/0016_curriculum-library-metadata.sql

-- Add curriculum library metadata columns to source_documents
ALTER TABLE source_documents ADD COLUMN grade_level TEXT;
ALTER TABLE source_documents ADD COLUMN education_system TEXT;
ALTER TABLE source_documents ADD COLUMN subject TEXT;
ALTER TABLE source_documents ADD COLUMN description TEXT;
ALTER TABLE source_documents ADD COLUMN academic_year_id TEXT;
ALTER TABLE source_documents ADD COLUMN import_source TEXT DEFAULT 'MANUAL' NOT NULL;

-- Index for grade-level filtering (primary library navigation)
CREATE INDEX idx_source_document_grade ON source_documents(grade_level);
-- Index for subject filtering
CREATE INDEX idx_source_document_subject ON source_documents(subject);
```

- [ ] **Step 2: Update the Drizzle schema to match**

In `packages/db/src/schema/system.schema.ts`, add to the `sourceDocuments` table definition:

```typescript
gradeLevel: text('grade_level'),
educationSystem: text('education_system'),
subject: text('subject'),
description: text('description'),
academicYearId: text('academic_year_id'),
importSource: text('import_source').notNull().default('MANUAL'),
```

- [ ] **Step 3: Verify migration compiles**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/migrations/system/0016_curriculum-library-metadata.sql packages/db/src/schema/system.schema.ts
git commit -m "feat(db): add curriculum library metadata columns to source_documents"
```

---

## Task 2: Contracts — Curriculum Library DTOs

**Files:**
- Create: `packages/contracts/src/models/curriculum-library.dto.ts`
- Modify: `packages/contracts/src/models/source-document.dto.ts` (extend schemas)
- Modify: `packages/contracts/src/ipc/channels.ts` (add channels)
- Modify: `packages/contracts/src/ipc/api.ts` (add API methods)

**Interfaces:**
- Produces: `CurriculumLibraryItemDto`, `ImportCurriculumLibraryInput`, `CurriculumGradeGroup`, new IPC channels

- [ ] **Step 1: Create curriculum-library DTOs**

```typescript
// packages/contracts/src/models/curriculum-library.dto.ts
import { z } from 'zod';

export const CurriculumGradeGroupSchema = z.object({
  gradeLevel: z.string(),
  educationSystem: z.string().nullable().optional(),
  documents: z.array(z.any()), // SourceDocumentDto extended
  count: z.number().int().nonnegative(),
});
export type CurriculumGradeGroup = z.infer<typeof CurriculumGradeGroupSchema>;

export const ImportCurriculumLibraryInputSchema = z.object({
  sourceFilePath: z.string().min(1),
  title: z.string().min(1).max(200),
  gradeLevel: z.string().min(1).max(50),
  educationSystem: z.string().max(50).optional(),
  subject: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  author: z.string().max(100).optional(),
  publisher: z.string().max(100).optional(),
  editionYear: z.string().max(20).optional(),
  curriculumCatalogId: z.string().uuid().optional(),
});
export type ImportCurriculumLibraryInput = z.infer<typeof ImportCurriculumLibraryInputSchema>;

export const UpdateCurriculumLibraryInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  gradeLevel: z.string().min(1).max(50).optional(),
  educationSystem: z.string().max(50).nullable().optional(),
  subject: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  curriculumCatalogId: z.string().uuid().nullable().optional(),
});
export type UpdateCurriculumLibraryInput = z.infer<typeof UpdateCurriculumLibraryInputSchema>;

export const CurriculumLibraryFilterSchema = z.object({
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  educationSystem: z.string().optional(),
});
export type CurriculumLibraryFilter = z.infer<typeof CurriculumLibraryFilterSchema>;

export const CurriculumPdfViewRequestSchema = z.object({
  id: z.string().uuid(),
  page: z.number().int().positive().optional(),
});
export type CurriculumPdfViewRequest = z.infer<typeof CurriculumPdfViewRequestSchema>;
```

- [ ] **Step 2: Extend source-document DTOs**

Add to `packages/contracts/src/models/source-document.dto.ts`:

```typescript
// Extend SourceDocumentDtoSchema with new fields
export const SourceDocumentDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  author: z.string().max(100).nullable().optional(),
  publisher: z.string().max(100).nullable().optional(),
  editionYear: z.string().max(20).nullable().optional(),
  curriculumCatalogId: z.string().uuid().nullable().optional(),
  filePath: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().nonnegative(),
  sha256Hash: z.string().length(64),
  pageCount: z.number().int().positive(),
  status: SourceDocumentStatusSchema.default('INDEXED'),
  metadata: z.record(z.unknown()).optional(),
  // New curriculum library fields
  gradeLevel: z.string().nullable().optional(),
  educationSystem: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  academicYearId: z.string().nullable().optional(),
  importSource: z.string().default('MANUAL'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

Also extend `ImportSourceDocumentSchema`:

```typescript
export const ImportSourceDocumentSchema = z.object({
  sourceFilePath: z.string().min(1),
  title: z.string().min(1).max(200),
  author: z.string().max(100).optional(),
  publisher: z.string().max(100).optional(),
  editionYear: z.string().max(20).optional(),
  curriculumCatalogId: z.string().uuid().optional(),
  // New curriculum library fields
  gradeLevel: z.string().max(50).optional(),
  educationSystem: z.string().max(50).optional(),
  subject: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
});
```

- [ ] **Step 3: Add IPC channels**

Add to `packages/contracts/src/ipc/channels.ts`:

```typescript
// Curriculum Library (Phase 6 redesign)
CURRICULUM_LIBRARY_LIST: 'curriculumLibrary:list',
CURRICULUM_LIBRARY_LIST_GROUPED: 'curriculumLibrary:listGrouped',
CURRICULUM_LIBRARY_IMPORT: 'curriculumLibrary:import',
CURRICULUM_LIBRARY_UPDATE: 'curriculumLibrary:update',
CURRICULUM_LIBRARY_DELETE: 'curriculumLibrary:delete',
CURRICULUM_LIBRARY_GET: 'curriculumLibrary:get',
CURRICULUM_LIBRARY_VIEW_PDF: 'curriculumLibrary:viewPdf',
CURRICULUM_LIBRARY_OPEN_EXTERNAL: 'curriculumLibrary:openExternal',

// Tibyan Workspace (Phase 6 central AI)
TIBYAN_CREATE_TASK_SESSION: 'tibyan:createTaskSession',
TIBYAN_LIST_HISTORY: 'tibyan:listHistory',
TIBYAN_GET_HISTORY_ITEM: 'tibyan:getHistoryItem',
TIBYAN_DELETE_HISTORY_ITEM: 'tibyan:deleteHistoryItem',
TIBYAN_RENAME_HISTORY_ITEM: 'tibyan:renameHistoryItem',

// AI Content Generation
AI_GENERATE_REVIEW: 'ai:generateReview',
AI_GENERATE_NOTES: 'ai:generateNotes',
AI_GENERATE_SLIDES: 'ai:generateSlides',
AI_GENERATE_EXAM: 'ai:generateExam',
```

- [ ] **Step 4: Add API methods to TibyanApi**

In `packages/contracts/src/ipc/api.ts`, add to the `TibyanApi` interface:

```typescript
curriculumLibrary: {
  list: (filter?: CurriculumLibraryFilter) => Promise<SourceDocumentDto[]>;
  listGrouped: () => Promise<CurriculumGradeGroup[]>;
  import: (input: ImportCurriculumLibraryInput) => Promise<SourceDocumentDto>;
  update: (input: UpdateCurriculumLibraryInput) => Promise<SourceDocumentDto>;
  delete: (id: string) => Promise<void>;
  get: (id: string) => Promise<SourceDocumentDto>;
  viewPdf: (request: CurriculumPdfViewRequest) => Promise<{ filePath: string; pageCount: number }>;
  openExternal: (id: string) => Promise<void>;
};
tibyan: {
  createTaskSession: (input: { taskType: string; title?: string }) => Promise<AssistantSession>;
  listHistory: () => Promise<AssistantSession[]>;
  getHistoryItem: (sessionId: string) => Promise<ConversationHistory>;
  deleteHistoryItem: (sessionId: string) => Promise<void>;
  renameHistoryItem: (sessionId: string, title: string) => Promise<void>;
};
ai: {
  generateReview: (input: { sourceId: string; scope?: string }) => Promise<AssistantResponse>;
  generateNotes: (input: { sourceId: string; scope?: string }) => Promise<AssistantResponse>;
  generateSlides: (input: { sourceId: string; scope?: string }) => Promise<AssistantResponse>;
  generateExam: (input: { sourceId: string; config: Record<string, unknown> }) => Promise<AssistantResponse>;
};
```

- [ ] **Step 5: Verify contracts compile**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/models/curriculum-library.dto.ts packages/contracts/src/models/source-document.dto.ts packages/contracts/src/ipc/channels.ts packages/contracts/src/ipc/api.ts
git commit -m "feat(contracts): add curriculum library and workspace IPC contracts"
```

---

## Task 3: Repository — Library Query Methods

**Files:**
- Modify: `packages/db/src/repositories/source-document.ts`

**Interfaces:**
- Consumes: Extended `sourceDocuments` schema
- Produces: `listGroupedByGrade()`, `findByGradeLevel()`, `findWithFilter()`

- [ ] **Step 1: Add library query methods to SourceDocumentRepository**

Add to `packages/db/src/repositories/source-document.ts`:

```typescript
import { eq, and, desc, sql } from 'drizzle-orm';

// In SourceDocumentRepository class:

listGroupedByGrade(): Array<{
  gradeLevel: string | null;
  educationSystem: string | null;
  documents: SourceDocumentRow[];
  count: number;
}> {
  const all = this.db
    .select()
    .from(sourceDocuments)
    .orderBy(desc(sourceDocuments.createdAt))
    .all();

  const groups = new Map<string, SourceDocumentRow[]>();
  for (const doc of all) {
    const key = doc.gradeLevel || 'غير محدد';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }

  return Array.from(groups.entries()).map(([grade, docs]) => ({
    gradeLevel: grade === 'غير محدد' ? null : grade,
    educationSystem: docs[0]?.educationSystem ?? null,
    documents: docs,
    count: docs.length,
  }));
}

findByFilter(filter: { gradeLevel?: string; subject?: string; educationSystem?: string }): SourceDocumentRow[] {
  const conditions = [];
  if (filter.gradeLevel) conditions.push(eq(sourceDocuments.gradeLevel, filter.gradeLevel));
  if (filter.subject) conditions.push(eq(sourceDocuments.subject, filter.subject));
  if (filter.educationSystem) conditions.push(eq(sourceDocuments.educationSystem, filter.educationSystem));

  return this.db
    .select()
    .from(sourceDocuments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sourceDocuments.createdAt))
    .all();
}
```

- [ ] **Step 2: Verify compilation**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/repositories/source-document.ts
git commit -m "feat(db): add library query methods to SourceDocumentRepository"
```

---

## Task 4: Core Service — Curriculum Library Service

**Files:**
- Create: `packages/core/src/curriculum/curriculum-library.service.ts`
- Modify: `packages/core/src/sources/pdf-source.service.ts` (extend importSource)
- Modify: `packages/core/src/index.ts` (export)

**Interfaces:**
- Consumes: `SourceDocumentRepository`, `PdfScanner`, `SystemAuditRepository`
- Produces: `CurriculumLibraryService` with `import()`, `list()`, `listGrouped()`, `get()`, `update()`, `delete()`, `resolvePdfPath()`

- [ ] **Step 1: Create CurriculumLibraryService**

```typescript
// packages/core/src/curriculum/curriculum-library.service.ts
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import type { ImportSourceDocumentDto, SourceDocumentDto, UpdateSourceDocumentDto } from '@tibyan/contracts';
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
      gradeLevel: (validated as any).gradeLevel ?? null,
      educationSystem: (validated as any).educationSystem ?? null,
      subject: (validated as any).subject ?? null,
      description: (validated as any).description ?? null,
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
      curriculumCatalogId: validated.curriculumCatalogId !== undefined ? validated.curriculumCatalogId : doc.curriculumCatalogId,
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
    try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch { /* ignore */ }

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
```

- [ ] **Step 2: Export the new service**

Add to `packages/core/src/index.ts`:
```typescript
export { CurriculumLibraryService } from './curriculum/curriculum-library.service.js';
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/curriculum/curriculum-library.service.ts packages/core/src/index.ts
git commit -m "feat(core): add CurriculumLibraryService for managed curriculum document library"
```

---

## Task 5: IPC Handlers — Curriculum Library

**Files:**
- Create: `apps/desktop/electron/ipc/curriculum-library.ipc.ts`
- Modify: `apps/desktop/electron/ipc/index.ts` (register)
- Modify: `apps/desktop/electron/runtime.ts` (wire service)

**Interfaces:**
- Consumes: `CurriculumLibraryService`, `Runtime`
- Produces: 8 IPC handlers for curriculum library

- [ ] **Step 1: Create IPC handlers**

```typescript
// apps/desktop/electron/ipc/curriculum-library.ipc.ts
import { ipcMain, shell, type BrowserWindow } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS, CurriculumLibraryFilterSchema } from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerCurriculumLibraryIpcHandlers(
  runtime: Runtime,
  mainWindow: BrowserWindow | null
): void {
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const filter = payload ? CurriculumLibraryFilterSchema.parse(payload) : undefined;
      return runtime.curriculumLibraryService.list(filter);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_LIST_GROUPED, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      return runtime.curriculumLibraryService.listGrouped();
    });
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_IMPORT, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      return runtime.curriculumLibraryService.importCurriculum(payload, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_UPDATE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const { id, input } = z.object({
        id: z.string().uuid(),
        input: z.record(z.unknown()),
      }).parse(payload);
      return runtime.curriculumLibraryService.update(id, input as any, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_DELETE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      runtime.curriculumLibraryService.delete(id, actor);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_GET, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      return runtime.curriculumLibraryService.get(id);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_VIEW_PDF, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const { id } = z.object({
        id: z.string().uuid(),
        page: z.number().int().positive().optional(),
      }).parse(payload);
      return runtime.curriculumLibraryService.resolvePdfPath(id);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LIBRARY_OPEN_EXTERNAL, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      const id = z.string().uuid().parse(payload);
      const { filePath } = runtime.curriculumLibraryService.resolvePdfPath(id);
      await shell.openPath(filePath);
    });
  });
}

export function unregisterCurriculumLibraryIpcHandlers(): void {
  Object.values(IPC_CHANNELS).forEach((ch) => {
    if (typeof ch === 'string' && ch.startsWith('curriculumLibrary:')) {
      ipcMain.removeHandler(ch);
    }
  });
}
```

- [ ] **Step 2: Wire service in Runtime**

In `apps/desktop/electron/runtime.ts`, add:
```typescript
import { CurriculumLibraryService } from '@tibyan/core';

// In Runtime class, add property:
public curriculumLibraryService!: CurriculumLibraryService;

// In initialize(), add:
this.curriculumLibraryService = new CurriculumLibraryService(this.systemDb.db, this.paths.mediaRootDir.replace(/media.*$/, 'sources'));
```

- [ ] **Step 3: Register handlers in index.ts**

In `apps/desktop/electron/ipc/index.ts`, add the import and registration.

- [ ] **Step 4: Verify compilation**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/electron/ipc/curriculum-library.ipc.ts apps/desktop/electron/runtime.ts apps/desktop/electron/ipc/index.ts
git commit -m "feat(electron): add curriculum library IPC handlers and wire service"
```

---

## Task 6: UI — Curriculum Library Page

**Files:**
- Create: `apps/desktop/src/features/curriculum-library/CurriculumLibraryPage.tsx`
- Create: `apps/desktop/src/features/curriculum-library/CurriculumUploadZone.tsx`
- Create: `apps/desktop/src/features/curriculum-library/CurriculumGradeGroup.tsx`
- Create: `apps/desktop/src/features/curriculum-library/CurriculumPdfViewer.tsx`
- Create: `apps/desktop/src/hooks/useCurriculumLibrary.ts`
- Modify: `apps/desktop/src/app/router.tsx` (add route)
- Modify: `apps/desktop/src/components/layout/DynamicIslandNav.tsx` (add nav item)

**Interfaces:**
- Consumes: IPC channels from Task 5
- Produces: Full curriculum library UI with upload, grade grouping, inline PDF viewer

- [ ] **Step 1: Create the data hook**

```typescript
// apps/desktop/src/hooks/useCurriculumLibrary.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useCurriculumLibrary(filter?: { gradeLevel?: string; subject?: string }) {
  return useQuery({
    queryKey: ['curriculumLibrary', filter],
    queryFn: () => window.tibyan.curriculumLibrary.list(filter),
  });
}

export function useCurriculumLibraryGrouped() {
  return useQuery({
    queryKey: ['curriculumLibrary', 'grouped'],
    queryFn: () => window.tibyan.curriculumLibrary.listGrouped(),
  });
}

export function useImportCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => window.tibyan.curriculumLibrary.import(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curriculumLibrary'] }),
  });
}

export function useDeleteCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => window.tibyan.curriculumLibrary.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curriculumLibrary'] }),
  });
}

export function useCurriculumPdf(id: string | null) {
  return useQuery({
    queryKey: ['curriculumPdf', id],
    queryFn: () => window.tibyan.curriculumLibrary.viewPdf({ id: id! }),
    enabled: !!id,
  });
}
```

- [ ] **Step 2: Create CurriculumUploadZone component**

Drag-and-drop + browse PDF upload with metadata form (title, grade, subject, education system, description). Uses native HTML5 drag/drop. On drop, reads the file via `window.tibyan.dialog.showOpenDialog` → imports via IPC.

- [ ] **Step 3: Create CurriculumGradeGroup component**

Displays documents grouped by grade level. Each group shows grade name, count, and document cards with title, subject, page count, and actions (view, open external, delete).

- [ ] **Step 4: Create CurriculumPdfViewer component**

Full-page inline PDF viewer. Loads the PDF via `tibyan-media://` or direct file path. Shows document title, grade metadata, page navigation (prev/next/page input), and back-to-library button.

- [ ] **Step 5: Create CurriculumLibraryPage**

Main page combining upload zone, grade groups, and PDF viewer (as a state-driven view). Uses Arabic RTL layout.

- [ ] **Step 6: Add route and nav item**

Add `/curriculum-library` route to `router.tsx`. Add nav item to `DynamicIslandNav.tsx` with label "المناهج" (visible by default).

- [ ] **Step 7: Verify typecheck**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/features/curriculum-library/ apps/desktop/src/hooks/useCurriculumLibrary.ts apps/desktop/src/app/router.tsx apps/desktop/src/components/layout/DynamicIslandNav.tsx
git commit -m "feat(ui): add curriculum library page with upload, grade grouping, and PDF viewer"
```

---

## Task 7: Tibyan Workspace — Core Structure

**Files:**
- Create: `apps/desktop/src/features/tibyan-workspace/TibyanWorkspacePage.tsx`
- Create: `apps/desktop/src/features/tibyan-workspace/TaskSidebar.tsx`
- Create: `apps/desktop/src/features/tibyan-workspace/WorkspaceHistory.tsx`
- Create: `apps/desktop/src/features/tibyan-workspace/SourceChoiceModal.tsx`
- Create: `apps/desktop/src/hooks/useTibyanWorkspace.ts`
- Modify: `apps/desktop/src/app/router.tsx` (update /assistant route)

**Interfaces:**
- Consumes: Existing assistant IPC channels, new workspace channels
- Produces: Central workspace with conversation area, right sidebar, history

- [ ] **Step 1: Create workspace data hook**

```typescript
// apps/desktop/src/hooks/useTibyanWorkspace.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type TaskType = 'EXAM' | 'SLIDES' | 'REVIEW' | 'NOTES' | 'PLATFORM_CONTROL';

export const TASK_DEFINITIONS: Record<TaskType, { labelAr: string; descriptionAr: string; icon: string }> = {
  EXAM: { labelAr: 'إنشاء اختبار', descriptionAr: 'إنشاء اختبار من ملف PDF أو منهج محفوظ', icon: 'FileText' },
  SLIDES: { labelAr: 'إنشاء شرائح', descriptionAr: 'إنشاء عرض تعليمي من ملف PDF أو منهج محفوظ', icon: 'Presentation' },
  REVIEW: { labelAr: 'إنشاء مراجعة', descriptionAr: 'إنشاء مواد مراجعة منهجية', icon: 'BookOpen' },
  NOTES: { labelAr: 'إنشاء مذكرة', descriptionAr: 'إنشاء مذكرة دراسية أو توصيلية', icon: 'StickyNote' },
  PLATFORM_CONTROL: { labelAr: 'التحكم في المنصة', descriptionAr: 'إدارة العمليات الآمنة في تبيان', icon: 'Settings' },
};

export function useTibyanHistory() {
  return useQuery({
    queryKey: ['tibyanHistory'],
    queryFn: () => window.tibyan.tibyan.listHistory(),
  });
}

export function useCreateTaskSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskType: string; title?: string }) =>
      window.tibyan.tibyan.createTaskSession(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tibyanHistory'] }),
  });
}

export function useDeleteHistoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => window.tibyan.tibyan.deleteHistoryItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tibyanHistory'] }),
  });
}
```

- [ ] **Step 2: Create TaskSidebar component**

Right-side panel showing 5 task actions as clickable cards. Each card has Arabic label, description, and icon. Selecting a task changes the workspace mode.

- [ ] **Step 3: Create WorkspaceHistory component**

Left sidebar showing conversation/task history. Items show title, task type badge, timestamp. Supports rename and delete (with confirmation that doesn't delete artifacts).

- [ ] **Step 4: Create SourceChoiceModal**

Modal with two options: "رفع ملف PDF" (upload) and "اختيار من المناهج المحفوظة" (select from library). Upload opens file dialog; select shows library documents filtered by grade.

- [ ] **Step 5: Create TibyanWorkspacePage**

Three-panel layout: history (left), conversation/work area (center), task sidebar (right). Arabic RTL. The conversation area reuses the existing chat UI pattern from AssistantPage but adds task context.

- [ ] **Step 6: Update route**

Change `/assistant` route to render `TibyanWorkspacePage` instead of `AssistantPage`. Keep `AssistantPage` as legacy fallback.

- [ ] **Step 7: Verify typecheck**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/features/tibyan-workspace/ apps/desktop/src/hooks/useTibyanWorkspace.ts apps/desktop/src/app/router.tsx
git commit -m "feat(ui): add central Tibyan workspace with task sidebar and history"
```

---

## Task 8: Exam Source-Choice Redesign

**Files:**
- Modify: `apps/desktop/src/features/exams/ExamBuilderPage.tsx`
- Create: `apps/desktop/src/features/tibyan-workspace/ExamSourceChoice.tsx`

**Interfaces:**
- Consumes: Curriculum library data, exam builder infrastructure
- Produces: Exam creation starts with source selection (upload PDF or select curriculum)

- [ ] **Step 1: Create ExamSourceChoice component**

Two-card selection: "رفع ملف PDF" and "اختيار من المناهج المحفوظة". Upload imports via curriculum library; select shows library documents. Selected source is passed to the exam builder.

- [ ] **Step 2: Modify ExamBuilderPage**

Add a first step before the blueprint form: source selection. If a source is selected (via props or state), show it as a badge and proceed to blueprint. If no source selected, show the source choice.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/exams/ExamBuilderPage.tsx apps/desktop/src/features/tibyan-workspace/ExamSourceChoice.tsx
git commit -m "feat(exams): add source-choice first step to exam creation workflow"
```

---

## Task 9: AI Content Generation Service

**Files:**
- Create: `packages/core/src/assistant/ai-content.service.ts`
- Modify: `packages/core/src/index.ts` (export)

**Interfaces:**
- Consumes: `GeminiProvider`, `CurriculumLibraryService`, `SlideService`
- Produces: `AiContentService` with `generateReview()`, `generateNotes()`, `generateSlides()`, `generateExamFromSource()`

- [ ] **Step 1: Create AiContentService**

```typescript
// packages/core/src/assistant/ai-content.service.ts

export interface ContentGenerationRequest {
  sourceDocumentId: string;
  scope?: string; // e.g., specific chapters or topics
  options?: Record<string, unknown>;
}

export interface GeneratedContent {
  type: 'review' | 'notes' | 'slides' | 'exam';
  title: string;
  content: string; // JSON structured content
  sourceDocumentId: string;
  generatedAt: string;
}

export class AiContentService {
  constructor(
    private readonly geminiProvider: { generate(prompt: string): Promise<string> },
    private readonly libraryService: { get(id: string): any },
  ) {}

  async generateReview(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const source = this.libraryService.get(request.sourceDocumentId);
    const prompt = this.buildReviewPrompt(source, request.scope);
    const result = await this.geminiProvider.generate(prompt);
    return {
      type: 'review',
      title: `مراجعة - ${source.title}`,
      content: result,
      sourceDocumentId: request.sourceDocumentId,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateNotes(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const source = this.libraryService.get(request.sourceDocumentId);
    const prompt = this.buildNotesPrompt(source, request.scope);
    const result = await this.geminiProvider.generate(prompt);
    return {
      type: 'notes',
      title: `مذكرة - ${source.title}`,
      content: result,
      sourceDocumentId: request.sourceDocumentId,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateSlides(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const source = this.libraryService.get(request.sourceDocumentId);
    const prompt = this.buildSlidesPrompt(source, request.scope);
    const result = await this.geminiProvider.generate(prompt);
    return {
      type: 'slides',
      title: `شرائح - ${source.title}`,
      content: result,
      sourceDocumentId: request.sourceDocumentId,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildReviewPrompt(source: any, scope?: string): string {
    return `أنشئ مواد مراجعة منهجية للمنهج التالي:
العنوان: ${source.title}
المرحلة: ${source.gradeLevel}
المادة: ${source.subject}
${scope ? `النطاق: ${scope}` : ''}

قدم مراجعة تحتوي على:
1. المفاهيم الرئيسية
2. ملخصات موجزة
3. معادلات مهمة (إن وجدت)
4. أسئلة تدريبية

الرجاء الرد بصيغة JSON.`;
  }

  private buildNotesPrompt(source: any, scope?: string): string {
    return `أنشئ مذكرة دراسية للمنهج التالي:
العنوان: ${source.title}
المرحلة: ${source.gradeLevel}
المادة: ${source.subject}
${scope ? `النطاق: ${scope}` : ''}

المذكرة يجب أن تحتوي على:
1. عناوين وأقسام
2. محتوى تعليمي
3. رياضيات وrlen geometrie (إن وجدت)
4. أمثلة توضيحية

الرجاء الرد بصيغة JSON.`;
  }

  private buildSlidesPrompt(source: any, scope?: string): string {
    return `أنشئ عرض تقديمي تعليمي للمنهج التالي:
العنوان: ${source.title}
المرحلة: ${source.gradeLevel}
المادة: ${source.subject}
${scope ? `النطاق: ${scope}` : ''}

كل شريحة يجب أن تحتوي على:
1. عنوان
2. محتوى نصي
3. نقاط رئيسية

الرجاء الرد بصيغة JSON.`;
  }
}
```

- [ ] **Step 2: Export**

Add to `packages/core/src/index.ts`.

- [ ] **Step 3: Verify compilation**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/assistant/ai-content.service.ts packages/core/src/index.ts
git commit -m "feat(core): add AiContentService for review, notes, and slides generation"
```

---

## Task 10: Workspace IPC Handlers

**Files:**
- Create: `apps/desktop/electron/ipc/tibyan-workspace.ipc.ts`
- Modify: `apps/desktop/electron/ipc/index.ts`

**Interfaces:**
- Consumes: `Runtime`, assistant orchestrator
- Produces: 5 workspace IPC handlers + 4 AI generation handlers

- [ ] **Step 1: Create workspace IPC handlers**

Register handlers for: `tibyan:createTaskSession`, `tibyan:listHistory`, `tibyan:getHistoryItem`, `tibyan:deleteHistoryItem`, `tibyan:renameHistoryItem`, and `ai:generateReview`, `ai:generateNotes`, `ai:generateSlides`, `ai:generateExam`.

- [ ] **Step 2: Register in index.ts**

- [ ] **Step 3: Verify compilation**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/electron/ipc/tibyan-workspace.ipc.ts apps/desktop/electron/ipc/index.ts
git commit -m "feat(electron): add workspace and AI content generation IPC handlers"
```

---

## Task 11: Review and Notes Generation UI

**Files:**
- Create: `apps/desktop/src/features/tibyan-workspace/ReviewGenerator.tsx`
- Create: `apps/desktop/src/features/tibyan-workspace/NotesGenerator.tsx`

**Interfaces:**
- Consumes: Source choice, AI generation IPC
- Produces: Review/notes generation UI with source selection, generation, preview, save

- [ ] **Step 1: Create ReviewGenerator**

Source selection → generation request → preview of generated review → save to slides or export.

- [ ] **Step 2: Create NotesGenerator**

Source selection → generation request → preview of generated notes → save or export.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/tibyan-workspace/ReviewGenerator.tsx apps/desktop/src/features/tibyan-workspace/NotesGenerator.tsx
git commit -m "feat(ui): add review and notes generation UI in Tibyan workspace"
```

---

## Task 12: Navigation and Route Cleanup

**Files:**
- Modify: `apps/desktop/src/components/layout/DynamicIslandNav.tsx`
- Modify: `apps/desktop/src/app/router.tsx`
- Modify: `apps/desktop/src/features/dashboard/TodayPage.tsx` (update exam description)

**Interfaces:**
- Ensures: All new pages are navigable, Math Engine hidden, proper Arabic labels

- [ ] **Step 1: Update navigation**

Ensure default nav items include:
1. `/` — اليوم
2. `/students` — الطلاب
3. `/groups` — المجموعات
4. `/curriculum-library` — المناهج
5. `/exams` — الاختبارات
6. `/slides` — الشرائح
7. `/finance` — المالية
8. `/assistant` — تبيان
9. `/settings` — الإعدادات

Remove any Math Engine nav entries. Ensure "المناهج" points to curriculum library.

- [ ] **Step 2: Update routes**

- [ ] **Step 3: Verify typecheck**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/layout/DynamicIslandNav.tsx apps/desktop/src/app/router.tsx apps/desktop/src/features/dashboard/TodayPage.tsx
git commit -m "feat(nav): update navigation with curriculum library and workspace routes"
```

---

## Task 13: Tests — Curriculum Library & Workspace

**Files:**
- Create: `packages/core/tests/curriculum-library.service.test.ts`
- Create: `apps/desktop/tests/curriculum-library.test.tsx`
- Create: `apps/desktop/tests/tibyan-workspace.test.tsx`
- Create: `apps/desktop/tests/exam-source-choice.test.tsx`

**Interfaces:**
- Tests: Import with dedup, grade grouping, filter, delete safety, workspace task switching, history, source choice

- [ ] **Step 1: Write CurriculumLibraryService unit tests**

Test: importCurriculum, duplicate detection, listGrouped, filter by grade, delete, resolvePdfPath.

- [ ] **Step 2: Write CurriculumLibraryPage component tests**

Test: render, upload zone present, grade groups displayed, PDF viewer opens.

- [ ] **Step 3: Write TibyanWorkspacePage component tests**

Test: render, task sidebar shows 5 actions, history list, source choice modal.

- [ ] **Step 4: Write ExamSourceChoice tests**

Test: render two source options, upload triggers file dialog, select shows library.

- [ ] **Step 5: Verify tests pass**

Run: `pnpm -r test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/tests/curriculum-library.service.test.ts apps/desktop/tests/curriculum-library.test.tsx apps/desktop/tests/tibyan-workspace.test.tsx apps/desktop/tests/exam-source-choice.test.tsx
git commit -m "test: add curriculum library and workspace tests"
```

---

## Task 14: Migration Verification & Fresh DB Test

**Files:**
- Verify: All migrations run correctly
- Verify: Zero schema drift

- [ ] **Step 1: Run typecheck**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 2: Run all tests**

Run: `pnpm -r test`
Expected: All tests PASS (existing + new)

- [ ] **Step 3: Verify migration journal**

Check system migration journal includes 0016 and academic journal is unchanged.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: verify migration integrity and test baseline"
```

---

## Task 15: Build, Package & E2E Verification

**Files:**
- Build: `pnpm run build:electron`
- Package: `npx electron-builder --win --dir`
- E2E: Run packaged app and verify key flows

- [ ] **Step 1: Build**

Run: `pnpm run build:electron`
Expected: Vite build succeeds

- [ ] **Step 2: Package**

Run: `npx electron-builder --win --dir`
Expected: Creates unpacked build

- [ ] **Step 3: Launch and verify**

1. Launch the app
2. Open curriculum library (المناهج)
3. Upload a test PDF with grade metadata
4. Verify grade grouping
5. Open the uploaded PDF inside the app
6. Return to dashboard
7. Open تبيان workspace
8. Verify right-side actions: اختبار, شرائح, مراجعة, مذكرة, التحكم في المنصة
9. Choose إنشاء اختبار → verify source choice
10. Verify no Gemini branding
11. Verify no Math Engine UI

- [ ] **Step 4: Final typecheck**

Run: `pnpm -r typecheck`
Expected: PASS

- [ ] **Step 5: Final test run**

Run: `pnpm -r test`
Expected: All tests PASS

- [ ] **Step 6: Push and update PR**

```bash
git add -A
git commit -m "feat: curriculum library, central workspace, exam source-choice redesign"
git push origin opencode/phase6-ai-assistant-tool-layer
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Curriculum PDF drag/drop import | Task 6 |
| Curriculum browse import | Task 6 |
| Duplicate curriculum detection (SHA-256) | Task 4 |
| Curriculum grade classification | Task 1, 2, 4 |
| Open stored curriculum inside app | Task 6 |
| Exam source option UPLOAD_PDF | Task 8 |
| Exam source option EXISTING_CURRICULUM | Task 8 |
| Exam source provenance | Task 8 |
| Save exam draft | (existing ExamService) |
| Reopen saved exam | (existing ExamBuilderPage) |
| Tibyan right-sidebar task switching | Task 7 |
| Tibyan history creation | Task 7 |
| Tibyan history reopening | Task 7 |
| Tibyan history deletion | Task 7 |
| History deletion does not delete saved artifact | Task 7 |
| Slides generated from curriculum | Task 9 |
| Review generation workflow | Task 9, 11 |
| Notes generation workflow | Task 9, 11 |
| Platform-control safety | (existing Phase 6 tool layer) |
| Zero teacher-facing Gemini references | Global constraint |
| Zero teacher-facing Math Engine surfaces | Global constraint |
