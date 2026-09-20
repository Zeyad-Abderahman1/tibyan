import crypto from 'crypto';
import {
  type PermissionCode,
  type UserRole,
  type SessionReflectionDto,
  type CreateSessionReflectionDto,
  type UpdateSessionReflectionDto,
  type LessonPlanSnapshotDto,
  CreateSessionReflectionSchema,
  UpdateSessionReflectionSchema,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  SessionRepository,
  SessionReflectionRepository,
  LessonPlanRepository,
  AcademicAuditRepository,
  type SessionReflectionRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';

export type SessionReflectionErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'LESSON_PLAN_NOT_FOUND'
  | 'REFLECTION_NOT_FOUND'
  | 'DUPLICATE_SESSION_REFLECTION'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class SessionReflectionError extends Error {
  constructor(public readonly code: SessionReflectionErrorCode, message: string) {
    super(message);
    this.name = 'SessionReflectionError';
  }
}

export interface SessionReflectionActor {
  userId?: string | null;
  nameSnapshot?: string;
  fullName?: string;
  role?: UserRole;
  permissions?: PermissionCode[];
}

export class SessionReflectionService {
  private readonly sessionRepo: SessionRepository;
  private readonly reflectionRepo: SessionReflectionRepository;
  private readonly lessonPlanRepo: LessonPlanRepository;

  constructor(private academicDb: AcademicDrizzle) {
    this.sessionRepo = new SessionRepository(academicDb);
    this.reflectionRepo = new SessionReflectionRepository(academicDb);
    this.lessonPlanRepo = new LessonPlanRepository(academicDb);
  }

  private checkPermission(actor?: SessionReflectionActor, permission: PermissionCode = 'GROUPS_READ'): void {
    if (!actor) return;
    if (actor.role) {
      try {
        requirePermission(actor.role, actor.permissions ?? [], permission);
      } catch {
        throw new SessionReflectionError('PERMISSION_DENIED', `Permission '${permission}' is required.`);
      }
    }
  }

  createReflection(input: CreateSessionReflectionDto, actor?: SessionReflectionActor): SessionReflectionDto {
    this.checkPermission(actor, 'GROUPS_WRITE');

    const validated = CreateSessionReflectionSchema.parse(input);

    // 1. Validate session exists in active academic database
    const session = this.sessionRepo.findById(validated.sessionId);
    if (!session) {
      throw new SessionReflectionError('SESSION_NOT_FOUND', `Session not found: ${validated.sessionId}`);
    }

    // 2. Prevent duplicate reflections for the same session (single-reflection invariant)
    const existing = this.reflectionRepo.findBySessionId(validated.sessionId);
    if (existing) {
      throw new SessionReflectionError(
        'DUPLICATE_SESSION_REFLECTION',
        `A reflection already exists for session: ${validated.sessionId}`
      );
    }

    // 3. If lesson plan attached, create immutable snapshot
    let snapshotJson: string | null = null;
    let snapshotDto: LessonPlanSnapshotDto | null = null;

    if (validated.lessonPlanId) {
      const plan = this.lessonPlanRepo.findById(validated.lessonPlanId);
      if (!plan) {
        throw new SessionReflectionError(
          'LESSON_PLAN_NOT_FOUND',
          `Lesson plan not found: ${validated.lessonPlanId}`
        );
      }

      snapshotDto = {
        planId: plan.id,
        curriculumNodeId: plan.curriculumNodeId,
        title: plan.title,
        targetDurationMinutes: plan.targetDurationMinutes,
        version: plan.version,
        sections: JSON.parse(plan.sectionsJson),
        snapshottedAt: new Date().toISOString(),
      };
      snapshotJson = JSON.stringify(snapshotDto);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // 4. Atomically insert reflection + audit log
    const reflectionRow = this.academicDb.transaction((tx) => {
      const reflRepoTx = new SessionReflectionRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const created = reflRepoTx.create({
        id,
        sessionId: validated.sessionId,
        lessonPlanId: validated.lessonPlanId ?? null,
        lessonPlanSnapshotJson: snapshotJson,
        completionStatus: validated.completionStatus,
        uncompletedItems: validated.uncompletedItems?.trim() || null,
        topicsNeedingReview: validated.topicsNeedingReview?.trim() || null,
        quickNotes: validated.quickNotes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: actor?.role === 'ASSISTANT' ? 'USER' : actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: actor?.nameSnapshot ?? actor?.fullName ?? 'System',
        action: 'SESSION_REFLECTION_CREATED',
        entityType: 'SESSION_REFLECTION',
        entityId: id,
        beforeJson: null,
        afterJson: JSON.stringify(created),
        metadataJson: JSON.stringify({
          sessionId: validated.sessionId,
          completionStatus: validated.completionStatus,
          lessonPlanId: validated.lessonPlanId ?? null,
        }),
        createdAt: now,
      });

      return created;
    });

    return this.mapToDto(reflectionRow, snapshotDto);
  }

  updateReflection(id: string, input: UpdateSessionReflectionDto, actor?: SessionReflectionActor): SessionReflectionDto {
    this.checkPermission(actor, 'GROUPS_WRITE');

    const validated = UpdateSessionReflectionSchema.parse(input);

    const existing = this.reflectionRepo.findById(id);
    if (!existing) {
      throw new SessionReflectionError('REFLECTION_NOT_FOUND', `Reflection not found: ${id}`);
    }

    const now = new Date().toISOString();

    const updatedRow = this.academicDb.transaction((tx) => {
      const reflRepoTx = new SessionReflectionRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const updated = reflRepoTx.update(id, {
        ...(validated.completionStatus ? { completionStatus: validated.completionStatus } : {}),
        ...(validated.uncompletedItems !== undefined
          ? { uncompletedItems: validated.uncompletedItems?.trim() || null }
          : {}),
        ...(validated.topicsNeedingReview !== undefined
          ? { topicsNeedingReview: validated.topicsNeedingReview?.trim() || null }
          : {}),
        ...(validated.quickNotes !== undefined ? { quickNotes: validated.quickNotes?.trim() || null } : {}),
        updatedAt: now,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: actor?.role === 'ASSISTANT' ? 'USER' : actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: actor?.nameSnapshot ?? actor?.fullName ?? 'System',
        action: 'SESSION_REFLECTION_UPDATED',
        entityType: 'SESSION_REFLECTION',
        entityId: id,
        beforeJson: JSON.stringify(existing),
        afterJson: JSON.stringify(updated),
        metadataJson: JSON.stringify({
          sessionId: existing.sessionId,
        }),
        createdAt: now,
      });

      return updated;
    });

    return this.mapToDto(updatedRow);
  }

  getReflectionBySessionId(sessionId: string, actor?: SessionReflectionActor): SessionReflectionDto | null {
    this.checkPermission(actor, 'GROUPS_READ');

    const row = this.reflectionRepo.findBySessionId(sessionId);
    if (!row) return null;

    return this.mapToDto(row);
  }

  getReflectionById(id: string, actor?: SessionReflectionActor): SessionReflectionDto {
    this.checkPermission(actor, 'GROUPS_READ');

    const row = this.reflectionRepo.findById(id);
    if (!row) {
      throw new SessionReflectionError('REFLECTION_NOT_FOUND', `Reflection not found: ${id}`);
    }

    return this.mapToDto(row);
  }

  private mapToDto(
    row: SessionReflectionRow,
    providedSnapshot?: LessonPlanSnapshotDto | null
  ): SessionReflectionDto {
    let snapshot: LessonPlanSnapshotDto | null = providedSnapshot ?? null;
    if (!snapshot && row.lessonPlanSnapshotJson) {
      snapshot = JSON.parse(row.lessonPlanSnapshotJson) as LessonPlanSnapshotDto;
    }

    return {
      id: row.id,
      sessionId: row.sessionId,
      lessonPlanId: row.lessonPlanId,
      lessonPlanSnapshot: snapshot,
      completionStatus: row.completionStatus,
      uncompletedItems: row.uncompletedItems,
      topicsNeedingReview: row.topicsNeedingReview,
      quickNotes: row.quickNotes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
