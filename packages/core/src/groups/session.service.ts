import crypto from 'crypto';
import {
  type SessionDto,
  type RescheduleSessionInput,
  type CancelSessionInput,
  type ListSessionsByDateRangeInput,
  RescheduleSessionSchema,
  CancelSessionSchema,
  ListSessionsByDateRangeSchema,
  type PermissionCode,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  getAcademicDatabase,
  SessionRepository,
  GroupRepository,
  EnrollmentRepository,
  AcademicAuditRepository,
  type SessionRow,
  type GroupRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import { DateProvider, DefaultDateProvider } from '../common/date-provider.js';
import type { AuthenticatedUser } from '../students/student.service.js';

export type SessionErrorCode =
  | 'GROUP_NOT_FOUND'
  | 'GROUP_ARCHIVED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_NOT_RESCHEDULABLE'
  | 'SESSION_NOT_CANCELLABLE'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class SessionError extends Error {
  constructor(public readonly code: SessionErrorCode, message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export interface SystemActor {
  actorType: 'SYSTEM';
  fullName: string;
}

export type AnyActor = AuthenticatedUser | SystemActor;

export function isSystemActor(actor: AnyActor): actor is SystemActor {
  return (actor as SystemActor).actorType === 'SYSTEM';
}

/**
 * Computes an immutable, deterministic occurrence key for a recurring schedule slot on a calendar date.
 */
export function generateOccurrenceKey(scheduleId: string, scheduledDate: string): string {
  return `${scheduleId}_${scheduledDate}`;
}

/**
 * Determines whether a database error is specifically a UNIQUE constraint collision on sessions.occurrence_key.
 */
export function isOccurrenceCollisionError(err: any): boolean {
  if (!err) return false;
  const message = String(err.message || '');
  const code = String(err.code || '');
  return (
    (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT') &&
    message.includes('sessions.occurrence_key')
  );
}

/**
 * Computes exactly N calendar dates starting from startDateYmd (inclusive: day 0 through day N - 1).
 * For N = 28, this produces exactly today through today + 27 days.
 * Uses pure calendar arithmetic without UTC timezone shifts.
 */
export function computeHorizonDates(
  startDateYmd: string,
  count: number = 28
): Array<{ dateStr: string; weekday: number }> {
  const parts = startDateYmd.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const result: Array<{ dateStr: string; weekday: number }> = [];

  for (let offset = 0; offset < count; offset++) {
    // 12:00 UTC noon avoids daylight saving time boundary shifts
    const dt = new Date(Date.UTC(y, m - 1, d + offset, 12, 0, 0));
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    result.push({
      dateStr: `${year}-${month}-${day}`,
      weekday: dt.getUTCDay(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    });
  }

  return result;
}

export interface MaterializeHorizonResult {
  startDate: string;
  endDate: string;
  createdCount: number;
  existingCount: number;
}

export class SessionService {
  public readonly sessionRepo: SessionRepository;
  public readonly groupRepo: GroupRepository;
  public readonly enrollmentRepo: EnrollmentRepository;
  public readonly auditRepo: AcademicAuditRepository;

  constructor(
    private db?: AcademicDrizzle,
    public readonly dateProvider: DateProvider = new DefaultDateProvider()
  ) {
    this.sessionRepo = new SessionRepository(this.db);
    this.groupRepo = new GroupRepository(this.db);
    this.enrollmentRepo = new EnrollmentRepository(this.db);
    this.auditRepo = new AcademicAuditRepository(this.db);
  }

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  private parseSchema<T>(schema: { parse: (v: any) => T }, data: any): T {
    try {
      return schema.parse(data);
    } catch (err: any) {
      throw new SessionError('INVALID_INPUT', err.message || 'Validation error');
    }
  }

  private checkPermission(actor: AnyActor, permission: PermissionCode): void {
    if (isSystemActor(actor)) {
      return; // Automated background maintenance allowed
    }
    try {
      requirePermission(actor.role, actor.permissions ?? [], permission);
    } catch (err: any) {
      throw new SessionError(
        'PERMISSION_DENIED',
        err.message || `Permission denied: ${permission}`
      );
    }
  }

  private toSessionDto(row: SessionRow, group?: GroupRow | null): SessionDto {
    const resolvedGroup = group ?? this.groupRepo.findById(row.groupId);
    const studentCount = this.enrollmentRepo.listByGroup(row.groupId, true).length;

    return {
      id: row.id,
      groupId: row.groupId,
      groupName: resolvedGroup?.name ?? 'مجموعة غير معروفة',
      scheduleId: row.scheduleId,
      educationSystem: resolvedGroup?.educationSystem,
      gradeLevel: resolvedGroup?.gradeLevel,
      languageTrack: resolvedGroup?.languageTrack,
      occurrenceKey: row.occurrenceKey,
      scheduledDate: row.scheduledDate,
      scheduledStartTime: row.scheduledStartTime,
      effectiveDate: row.effectiveDate,
      effectiveStartTime: row.effectiveStartTime,
      durationMinutes: row.durationMinutes,
      status: row.status as any,
      rescheduleReason: row.rescheduleReason,
      rescheduledAt: row.rescheduledAt,
      cancellationReason: row.cancellationReason ?? null,
      notes: row.notes,
      studentCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Materializes sessions over an exact 28-calendar-day rolling horizon (today through today + 27 days).
   * Deterministic and idempotent: skips any occurrenceKey that already exists in any status.
   * Concurrency-safe: handles concurrent INSERT-time collisions gracefully without swallowing unrelated errors.
   */
  async materializeRollingHorizon(
    options: { groupId?: string; horizonDays?: number } = {},
    actor: AnyActor
  ): Promise<MaterializeHorizonResult> {
    this.checkPermission(actor, 'SESSIONS_MANAGE');

    const horizonLength = options.horizonDays ?? 28;
    const today = this.dateProvider.today();
    const horizonDates = computeHorizonDates(today, horizonLength);
    const startDate = horizonDates[0]?.dateStr ?? today;
    const endDate = horizonDates[horizonDates.length - 1]?.dateStr ?? today;

    let targetGroups: GroupRow[] = [];
    if (options.groupId) {
      const group = this.groupRepo.findById(options.groupId);
      if (!group) {
        throw new SessionError('GROUP_NOT_FOUND', `Group not found: ${options.groupId}`);
      }
      if (group.status === 'ARCHIVED') {
        return { startDate, endDate, createdCount: 0, existingCount: 0 };
      }
      targetGroups = [group];
    } else {
      targetGroups = this.groupRepo.list({ status: 'ACTIVE' });
    }

    const nowIso = new Date().toISOString();
    let createdCount = 0;
    let existingCount = 0;

    this.client.transaction((tx) => {
      const sessionRepoTx = new SessionRepository(tx as any);
      const groupRepoTx = new GroupRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      for (const group of targetGroups) {
        const schedules = groupRepoTx.getSchedules(group.id);
        if (schedules.length === 0) continue;

        for (const slot of schedules) {
          for (const { dateStr, weekday } of horizonDates) {
            if (slot.weekday === weekday) {
              const occurrenceKey = generateOccurrenceKey(slot.id, dateStr);
              const existing = sessionRepoTx.findByOccurrenceKey(occurrenceKey);

              if (existing) {
                existingCount++;
                continue;
              }

              // Materialize new session with collision-safe INSERT
              try {
                sessionRepoTx.create({
                  id: crypto.randomUUID(),
                  groupId: group.id,
                  scheduleId: slot.id,
                  occurrenceKey,
                  scheduledDate: dateStr,
                  scheduledStartTime: slot.startTime,
                  effectiveDate: dateStr,
                  effectiveStartTime: slot.startTime,
                  durationMinutes: slot.durationMinutes,
                  status: 'SCHEDULED',
                  rescheduleReason: null,
                  rescheduledAt: null,
                  cancellationReason: null,
                  notes: null,
                  createdAt: nowIso,
                  updatedAt: nowIso,
                });

                createdCount++;
              } catch (err: any) {
                // If another process inserted this occurrence concurrently, treat as already materialized
                if (isOccurrenceCollisionError(err)) {
                  existingCount++;
                  continue;
                }
                // Do not swallow any other database or invariant errors
                throw err;
              }
            }
          }
        }
      }

      if (createdCount > 0) {
        const isSystem = isSystemActor(actor);
        auditRepoTx.insert({
          id: crypto.randomUUID(),
          actorType: isSystem ? 'SYSTEM' : 'USER',
          actorUserId: isSystem ? null : (actor as AuthenticatedUser).userId,
          actorNameSnapshot: actor.fullName,
          action: 'SESSION_HORIZON_MATERIALIZED',
          entityType: 'SESSION',
          entityId: options.groupId ?? 'ALL_GROUPS',
          beforeJson: null,
          afterJson: JSON.stringify({ createdCount, existingCount, startDate, endDate }),
          metadataJson: JSON.stringify({
            startDate,
            endDate,
            createdCount,
            existingCount,
            groupsProcessed: targetGroups.length,
          }),
          createdAt: nowIso,
        });
      }
    });

    return {
      startDate,
      endDate,
      createdCount,
      existingCount,
    };
  }

  /**
   * Reschedules a single session to a new effective date and start time.
   * Keeps occurrenceKey, scheduledDate, and scheduledStartTime immutable.
   */
  async rescheduleSession(
    input: RescheduleSessionInput,
    actor: AnyActor
  ): Promise<SessionDto> {
    const validated = this.parseSchema(RescheduleSessionSchema, input);
    this.checkPermission(actor, 'SESSIONS_MANAGE');

    const existing = this.sessionRepo.findById(validated.sessionId);
    if (!existing) {
      throw new SessionError('SESSION_NOT_FOUND', `Session not found: ${validated.sessionId}`);
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED_BY_TEACHER') {
      throw new SessionError(
        'SESSION_NOT_RESCHEDULABLE',
        `Cannot reschedule a session with status ${existing.status}`
      );
    }

    const nowIso = new Date().toISOString();

    const updated = this.client.transaction((tx) => {
      const sessionRepoTx = new SessionRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const updatedRow = sessionRepoTx.update(existing.id, {
        effectiveDate: validated.newEffectiveDate,
        effectiveStartTime: validated.newEffectiveStartTime,
        status: 'RESCHEDULED',
        rescheduledAt: nowIso,
        rescheduleReason: validated.reason,
        updatedAt: nowIso,
      })!;

      const isSystem = isSystemActor(actor);
      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: isSystem ? 'SYSTEM' : 'USER',
        actorUserId: isSystem ? null : (actor as AuthenticatedUser).userId,
        actorNameSnapshot: actor.fullName,
        action: 'SESSION_RESCHEDULED',
        entityType: 'SESSION',
        entityId: existing.id,
        beforeJson: JSON.stringify(this.toSessionDto(existing)),
        afterJson: JSON.stringify(this.toSessionDto(updatedRow)),
        metadataJson: JSON.stringify({
          newEffectiveDate: validated.newEffectiveDate,
          newEffectiveStartTime: validated.newEffectiveStartTime,
          reason: validated.reason,
        }),
        createdAt: nowIso,
      });

      return updatedRow;
    });

    return this.toSessionDto(updated);
  }

  /**
   * Cancels a session (setting status = CANCELLED_BY_TEACHER).
   * Stores cancellation reason in the dedicated cancellationReason column.
   * Leaves general notes semantically untouched.
   * Preserves occurrenceKey and scheduled/effective times.
   */
  async cancelSession(input: CancelSessionInput, actor: AnyActor): Promise<SessionDto> {
    const validated = this.parseSchema(CancelSessionSchema, input);
    this.checkPermission(actor, 'SESSIONS_MANAGE');

    const existing = this.sessionRepo.findById(validated.sessionId);
    if (!existing) {
      throw new SessionError('SESSION_NOT_FOUND', `Session not found: ${validated.sessionId}`);
    }

    if (existing.status === 'COMPLETED') {
      throw new SessionError('SESSION_NOT_CANCELLABLE', 'Cannot cancel a completed session');
    }

    if (existing.status === 'CANCELLED_BY_TEACHER') {
      return this.toSessionDto(existing);
    }

    const nowIso = new Date().toISOString();

    const updated = this.client.transaction((tx) => {
      const sessionRepoTx = new SessionRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const updatedRow = sessionRepoTx.update(existing.id, {
        status: 'CANCELLED_BY_TEACHER',
        cancellationReason: validated.reason,
        // notes remain completely untouched and independent
        updatedAt: nowIso,
      })!;

      const isSystem = isSystemActor(actor);
      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: isSystem ? 'SYSTEM' : 'USER',
        actorUserId: isSystem ? null : (actor as AuthenticatedUser).userId,
        actorNameSnapshot: actor.fullName,
        action: 'SESSION_CANCELLED',
        entityType: 'SESSION',
        entityId: existing.id,
        beforeJson: JSON.stringify(this.toSessionDto(existing)),
        afterJson: JSON.stringify(this.toSessionDto(updatedRow)),
        metadataJson: JSON.stringify({
          cancellationReason: validated.reason,
        }),
        createdAt: nowIso,
      });

      return updatedRow;
    });

    return this.toSessionDto(updated);
  }

  /**
   * Retrieves a single session by its unique ID.
   */
  async getSessionById(sessionId: string, actor: AnyActor): Promise<SessionDto> {
    this.checkPermission(actor, 'GROUPS_READ');

    const session = this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new SessionError('SESSION_NOT_FOUND', `Session not found: ${sessionId}`);
    }

    return this.toSessionDto(session);
  }

  /**
   * Lists sessions within a date range (effectiveDate between startDate and endDate inclusive).
   */
  async listSessionsForDateRange(
    input: ListSessionsByDateRangeInput,
    actor: AnyActor
  ): Promise<SessionDto[]> {
    const validated = this.parseSchema(ListSessionsByDateRangeSchema, input);
    this.checkPermission(actor, 'GROUPS_READ');

    const rows = this.sessionRepo.listByDateRange(
      validated.startDate,
      validated.endDate,
      validated.groupId
    );

    return rows.map((r) => this.toSessionDto(r));
  }

  /**
   * Regenerates future sessions for a group after schedule changes:
   * Prunes strictly future untouched SCHEDULED sessions and materializes the new slots across the 28-day horizon.
   */
  async regenerateFutureSessionsAfterScheduleChange(
    groupId: string,
    actor: AnyActor
  ): Promise<{ removedCount: number; createdCount: number }> {
    this.checkPermission(actor, 'SESSIONS_MANAGE');

    const group = this.groupRepo.findById(groupId);
    if (!group) {
      throw new SessionError('GROUP_NOT_FOUND', `Group not found: ${groupId}`);
    }

    const today = this.dateProvider.today();
    const nowTime = this.dateProvider.nowTime();

    const removedCount = this.sessionRepo.deleteUntouchedFutureScheduledSessions(
      group.id,
      today,
      nowTime
    );

    const result = await this.materializeRollingHorizon({ groupId }, actor);

    return {
      removedCount,
      createdCount: result.createdCount,
    };
  }
}
