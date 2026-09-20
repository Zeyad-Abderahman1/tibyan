import crypto from 'crypto';
import {
  type PermissionCode,
  type UserRole,
  type LessonPlanDto,
  type CreateLessonPlanDto,
  type UpdateLessonPlanDto,
  type LessonPlanFilter,
  type LessonPlanSections,
  CreateLessonPlanSchema,
  UpdateLessonPlanSchema,
} from '@tibyan/contracts';
import {
  type SystemDrizzle,
  type AcademicDrizzle,
  CurriculumNodeRepository,
  LessonPlanRepository,
  AcademicAuditRepository,
  type LessonPlanRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import { MathRichContentSanitizer } from '../content/math-rich-content-sanitizer.js';

export type LessonPlannerErrorCode =
  | 'CURRICULUM_NODE_NOT_FOUND'
  | 'LESSON_PLAN_NOT_FOUND'
  | 'INVALID_TIMING'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class LessonPlannerError extends Error {
  constructor(public readonly code: LessonPlannerErrorCode, message: string) {
    super(message);
    this.name = 'LessonPlannerError';
  }
}

export interface LessonPlannerActor {
  userId?: string | null;
  nameSnapshot?: string;
  fullName?: string;
  role?: UserRole;
  permissions?: PermissionCode[];
}

export class LessonPlannerService {
  private readonly nodeRepo: CurriculumNodeRepository;
  private readonly lessonPlanRepo: LessonPlanRepository;
  private readonly sanitizer: MathRichContentSanitizer;

  constructor(
    systemDb: SystemDrizzle,
    private academicDb: AcademicDrizzle
  ) {
    this.nodeRepo = new CurriculumNodeRepository(systemDb);
    this.lessonPlanRepo = new LessonPlanRepository(academicDb);
    this.sanitizer = new MathRichContentSanitizer();
  }

  private checkPermission(actor?: LessonPlannerActor, permission: PermissionCode = 'GROUPS_READ'): void {
    if (!actor) return;
    if (actor.role) {
      try {
        requirePermission(actor.role, actor.permissions ?? [], permission);
      } catch {
        throw new LessonPlannerError('PERMISSION_DENIED', `Permission '${permission}' is required.`);
      }
    }
  }

  private sanitizeSections(sections: LessonPlanSections): LessonPlanSections {
    return {
      objectives: sections.objectives.map((obj) => this.sanitizer.sanitizeText(obj)),
      priorReview: this.sanitizer.sanitizeDocument(sections.priorReview),
      explanation: this.sanitizer.sanitizeDocument(sections.explanation),
      examples: this.sanitizer.sanitizeDocument(sections.examples),
      inClassQuestions: this.sanitizer.sanitizeDocument(sections.inClassQuestions),
      commonMistakes: this.sanitizer.sanitizeDocument(sections.commonMistakes),
      homework: this.sanitizer.sanitizeDocument(sections.homework),
      timingBreakdown: sections.timingBreakdown.map((item) => ({
        ...item,
        label: this.sanitizer.sanitizeText(item.label),
      })),
      notes: sections.notes ? this.sanitizer.sanitizeText(sections.notes) : null,
    };
  }

  createLessonPlan(input: CreateLessonPlanDto, actor?: LessonPlannerActor): LessonPlanDto {
    this.checkPermission(actor, 'GROUPS_WRITE');

    const validated = CreateLessonPlanSchema.parse(input);

    // 1. Validate curriculum node exists in system database
    const node = this.nodeRepo.findById(validated.curriculumNodeId);
    if (!node) {
      throw new LessonPlannerError(
        'CURRICULUM_NODE_NOT_FOUND',
        `Curriculum node not found: ${validated.curriculumNodeId}`
      );
    }

    // 2. Sanitize rich content sections
    const cleanSections = this.sanitizeSections(validated.sections);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // 3. Atomically write lesson plan + audit record
    const planRow = this.academicDb.transaction((tx) => {
      const planRepoTx = new LessonPlanRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const created = planRepoTx.create({
        id,
        curriculumNodeId: validated.curriculumNodeId,
        title: validated.title.trim(),
        targetDurationMinutes: validated.targetDurationMinutes,
        status: validated.status,
        version: 1,
        sectionsJson: JSON.stringify(cleanSections),
        createdAt: now,
        updatedAt: now,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: actor?.role === 'ASSISTANT' ? 'USER' : actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: actor?.nameSnapshot ?? actor?.fullName ?? 'System',
        action: 'LESSON_PLAN_CREATED',
        entityType: 'LESSON_PLAN',
        entityId: id,
        beforeJson: null,
        afterJson: JSON.stringify(created),
        metadataJson: JSON.stringify({
          curriculumNodeId: validated.curriculumNodeId,
          targetDurationMinutes: validated.targetDurationMinutes,
          nodeTitle: node.titleAr,
        }),
        createdAt: now,
      });

      return created;
    });

    return this.mapToDto(planRow, cleanSections);
  }

  updateLessonPlan(id: string, input: UpdateLessonPlanDto, actor?: LessonPlannerActor): LessonPlanDto {
    this.checkPermission(actor, 'GROUPS_WRITE');

    const validated = UpdateLessonPlanSchema.parse(input);

    const existing = this.lessonPlanRepo.findById(id);
    if (!existing) {
      throw new LessonPlannerError('LESSON_PLAN_NOT_FOUND', `Lesson plan not found: ${id}`);
    }

    let cleanSections: LessonPlanSections | undefined;
    if (validated.sections) {
      cleanSections = this.sanitizeSections(validated.sections);
    }

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    const updatedRow = this.academicDb.transaction((tx) => {
      const planRepoTx = new LessonPlanRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const updated = planRepoTx.update(id, {
        ...(validated.title ? { title: validated.title.trim() } : {}),
        ...(validated.targetDurationMinutes ? { targetDurationMinutes: validated.targetDurationMinutes } : {}),
        ...(validated.status ? { status: validated.status } : {}),
        ...(cleanSections ? { sectionsJson: JSON.stringify(cleanSections) } : {}),
        version: newVersion,
        updatedAt: now,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: actor?.role === 'ASSISTANT' ? 'USER' : actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: actor?.nameSnapshot ?? actor?.fullName ?? 'System',
        action: 'LESSON_PLAN_UPDATED',
        entityType: 'LESSON_PLAN',
        entityId: id,
        beforeJson: JSON.stringify(existing),
        afterJson: JSON.stringify(updated),
        metadataJson: JSON.stringify({
          previousVersion: existing.version,
          newVersion,
        }),
        createdAt: now,
      });

      return updated;
    });

    return this.mapToDto(updatedRow, cleanSections);
  }

  getLessonPlanById(id: string, actor?: LessonPlannerActor): LessonPlanDto {
    this.checkPermission(actor, 'GROUPS_READ');

    const row = this.lessonPlanRepo.findById(id);
    if (!row) {
      throw new LessonPlannerError('LESSON_PLAN_NOT_FOUND', `Lesson plan not found: ${id}`);
    }

    return this.mapToDto(row);
  }

  listLessonPlansByNode(curriculumNodeId: string, actor?: LessonPlannerActor): LessonPlanDto[] {
    this.checkPermission(actor, 'GROUPS_READ');

    const rows = this.lessonPlanRepo.findByCurriculumNodeId(curriculumNodeId);
    return rows.map((r) => this.mapToDto(r));
  }

  listLessonPlans(filter?: LessonPlanFilter, actor?: LessonPlannerActor): LessonPlanDto[] {
    this.checkPermission(actor, 'GROUPS_READ');

    const rows = this.lessonPlanRepo.list(filter);
    return rows.map((r) => this.mapToDto(r));
  }

  archiveLessonPlan(id: string, actor?: LessonPlannerActor): LessonPlanDto {
    this.checkPermission(actor, 'GROUPS_WRITE');

    return this.updateLessonPlan(id, { status: 'ARCHIVED' }, actor);
  }

  private mapToDto(row: LessonPlanRow, parsedSections?: LessonPlanSections): LessonPlanDto {
    const sections = parsedSections ?? (JSON.parse(row.sectionsJson) as LessonPlanSections);

    return {
      id: row.id,
      curriculumNodeId: row.curriculumNodeId,
      title: row.title,
      targetDurationMinutes: row.targetDurationMinutes,
      status: row.status,
      version: row.version,
      sections,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
