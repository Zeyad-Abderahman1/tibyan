import crypto from 'crypto';
import {
  type GroupDto,
  type WeeklyScheduleSlotDto,
  type CreateGroupInput,
  type UpdateGroupInput,
  type SetGroupScheduleInput,
  type WeeklyScheduleSlotInput,
  CreateGroupSchema,
  UpdateGroupSchema,
  SetGroupScheduleSchema,
  type PermissionCode,
  type GradeLevel,
  type EducationSystem,
  type LanguageTrack,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  getAcademicDatabase,
  GroupRepository,
  EnrollmentRepository,
  SessionRepository,
  AcademicAuditRepository,
  type GroupRow,
  type GroupScheduleRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import { DateProvider, DefaultDateProvider } from '../common/date-provider.js';
import type { AuthenticatedUser } from '../students/student.service.js';

export type GroupErrorCode =
  | 'GROUP_NOT_FOUND'
  | 'GROUP_ARCHIVED'
  | 'INVALID_SCHEDULE'
  | 'DUPLICATE_SCHEDULE_SLOT'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class GroupError extends Error {
  constructor(public readonly code: GroupErrorCode, message: string) {
    super(message);
    this.name = 'GroupError';
  }
}

export interface GroupFilterInput {
  status?: 'ACTIVE' | 'ARCHIVED';
  gradeLevel?: GradeLevel;
  educationSystem?: EducationSystem;
  languageTrack?: LanguageTrack;
}

export class GroupService {
  public readonly groupRepo: GroupRepository;
  public readonly enrollmentRepo: EnrollmentRepository;
  public readonly sessionRepo: SessionRepository;
  public readonly auditRepo: AcademicAuditRepository;

  constructor(
    private db?: AcademicDrizzle,
    public readonly dateProvider: DateProvider = new DefaultDateProvider(),
    private onScheduleChanged?: (groupId: string, actor: AuthenticatedUser) => Promise<void>
  ) {
    this.groupRepo = new GroupRepository(this.db);
    this.enrollmentRepo = new EnrollmentRepository(this.db);
    this.sessionRepo = new SessionRepository(this.db);
    this.auditRepo = new AcademicAuditRepository(this.db);
  }

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  private parseSchema<T>(schema: { parse: (v: any) => T }, data: any): T {
    try {
      return schema.parse(data);
    } catch (err: any) {
      throw new GroupError('INVALID_INPUT', err.message || 'Validation error');
    }
  }

  private checkPermission(actor: AuthenticatedUser, permission: PermissionCode): void {
    try {
      requirePermission(actor.role, actor.permissions ?? [], permission);
    } catch (err: any) {
      throw new GroupError('PERMISSION_DENIED', err.message || `Permission denied: ${permission}`);
    }
  }

  private validateSlots(slots: WeeklyScheduleSlotInput[]): void {
    const seen = new Set<string>();
    for (const slot of slots) {
      const duration = slot.durationMinutes ?? 120;
      if (duration <= 0) {
        throw new GroupError('INVALID_SCHEDULE', 'Duration must be greater than 0 minutes');
      }
      const key = `${slot.weekday}_${slot.startTime}`;
      if (seen.has(key)) {
        throw new GroupError(
          'DUPLICATE_SCHEDULE_SLOT',
          `Duplicate schedule slot for weekday ${slot.weekday} at ${slot.startTime}`
        );
      }
      seen.add(key);
    }
  }

  private toScheduleSlotDto(row: GroupScheduleRow): WeeklyScheduleSlotDto {
    return {
      id: row.id,
      groupId: row.groupId,
      weekday: row.weekday,
      startTime: row.startTime,
      durationMinutes: row.durationMinutes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toGroupDto(
    group: GroupRow,
    schedules?: GroupScheduleRow[],
    enrolledCount?: number
  ): GroupDto {
    const groupSchedules = schedules ?? this.groupRepo.getSchedules(group.id);
    const count =
      enrolledCount !== undefined
        ? enrolledCount
        : this.enrollmentRepo.listByGroup(group.id, true).length;

    return {
      id: group.id,
      name: group.name,
      educationSystem: group.educationSystem,
      gradeLevel: group.gradeLevel,
      languageTrack: group.languageTrack,
      focusMathBranch: group.focusMathBranch,
      defaultPaymentType: group.defaultPaymentType,
      defaultPaymentAmount: group.defaultPaymentAmount,
      status: group.status as 'ACTIVE' | 'ARCHIVED',
      schedules: groupSchedules.map((s) => this.toScheduleSlotDto(s)),
      enrolledCount: count,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  /**
   * Creates a new Group with optional recurring weekly schedules.
   */
  async createGroup(input: CreateGroupInput, actor: AuthenticatedUser): Promise<GroupDto> {
    const validated = this.parseSchema(CreateGroupSchema, input);
    this.checkPermission(actor, 'GROUPS_WRITE');

    if (validated.schedules && validated.schedules.length > 0) {
      this.validateSlots(validated.schedules);
    }

    const groupId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const created = this.client.transaction((tx) => {
      const groupRepoTx = new GroupRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const groupRow = groupRepoTx.create({
        id: groupId,
        name: validated.name.trim(),
        educationSystem: validated.educationSystem,
        gradeLevel: validated.gradeLevel,
        languageTrack: validated.languageTrack,
        focusMathBranch: validated.focusMathBranch,
        defaultPaymentType: validated.defaultPaymentType,
        defaultPaymentAmount: validated.defaultPaymentAmount,
        status: 'ACTIVE',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const insertedSchedules: GroupScheduleRow[] = [];
      if (validated.schedules && validated.schedules.length > 0) {
        for (const slot of validated.schedules) {
          const scheduleRow = groupRepoTx.addSchedule({
            id: crypto.randomUUID(),
            groupId,
            weekday: slot.weekday,
            startTime: slot.startTime.trim(),
            durationMinutes: slot.durationMinutes,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
          insertedSchedules.push(scheduleRow);
        }
      }

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action: 'GROUP_CREATED',
        entityType: 'GROUP',
        entityId: groupId,
        beforeJson: null,
        afterJson: JSON.stringify(this.toGroupDto(groupRow, insertedSchedules, 0)),
        metadataJson: JSON.stringify({
          name: groupRow.name,
          educationSystem: groupRow.educationSystem,
          gradeLevel: groupRow.gradeLevel,
          defaultPaymentType: groupRow.defaultPaymentType,
          defaultPaymentAmount: groupRow.defaultPaymentAmount,
          scheduleCount: insertedSchedules.length,
        }),
        createdAt: nowIso,
      });

      return { groupRow, insertedSchedules };
    });

    // Notify schedule change if listener registered (e.g. materializer)
    if (this.onScheduleChanged && created.insertedSchedules.length > 0) {
      await this.onScheduleChanged(groupId, actor);
    }

    return this.toGroupDto(created.groupRow, created.insertedSchedules, 0);
  }

  /**
   * Updates an existing group's metadata or default payment terms.
   */
  async updateGroup(input: UpdateGroupInput, actor: AuthenticatedUser): Promise<GroupDto> {
    const validated = this.parseSchema(UpdateGroupSchema, input);
    this.checkPermission(actor, 'GROUPS_WRITE');

    const existing = this.groupRepo.findById(validated.groupId);
    if (!existing) {
      throw new GroupError('GROUP_NOT_FOUND', `Group not found: ${validated.groupId}`);
    }

    const nowIso = new Date().toISOString();

    const updated = this.client.transaction((tx) => {
      const groupRepoTx = new GroupRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const updates: Partial<Omit<GroupRow, 'id' | 'createdAt'>> = {
        updatedAt: nowIso,
      };

      if (validated.name !== undefined) updates.name = validated.name.trim();
      if (validated.educationSystem !== undefined) updates.educationSystem = validated.educationSystem;
      if (validated.gradeLevel !== undefined) updates.gradeLevel = validated.gradeLevel;
      if (validated.languageTrack !== undefined) updates.languageTrack = validated.languageTrack;
      if (validated.focusMathBranch !== undefined) updates.focusMathBranch = validated.focusMathBranch;
      if (validated.defaultPaymentType !== undefined) updates.defaultPaymentType = validated.defaultPaymentType;
      if (validated.defaultPaymentAmount !== undefined) updates.defaultPaymentAmount = validated.defaultPaymentAmount;
      if (validated.status !== undefined) updates.status = validated.status;

      const groupRow = groupRepoTx.update(existing.id, updates)!;

      const updatedFields = Object.keys(updates).filter((k) => k !== 'updatedAt');
      const isArchiveOnly = updatedFields.length === 1 && updates.status === 'ARCHIVED';
      const action = isArchiveOnly ? 'GROUP_ARCHIVED' : 'GROUP_UPDATED';

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action,
        entityType: 'GROUP',
        entityId: existing.id,
        beforeJson: JSON.stringify(this.toGroupDto(existing)),
        afterJson: JSON.stringify(this.toGroupDto(groupRow)),
        metadataJson: JSON.stringify({ updatedFields }),
        createdAt: nowIso,
      });

      return groupRow;
    });

    return this.toGroupDto(updated);
  }

  /**
   * Soft-archives a group. Does not physically delete rows or historical sessions.
   */
  async archiveGroup(groupId: string, actor: AuthenticatedUser): Promise<GroupDto> {
    return this.updateGroup({ groupId, status: 'ARCHIVED' }, actor);
  }

  /**
   * Retrieves a group by ID.
   */
  async getGroupById(groupId: string, actor: AuthenticatedUser): Promise<GroupDto> {
    this.checkPermission(actor, 'GROUPS_READ');

    const group = this.groupRepo.findById(groupId);
    if (!group) {
      throw new GroupError('GROUP_NOT_FOUND', `Group not found: ${groupId}`);
    }

    return this.toGroupDto(group);
  }

  /**
   * Lists and filters groups.
   */
  async listGroups(filter: GroupFilterInput, actor: AuthenticatedUser): Promise<GroupDto[]> {
    this.checkPermission(actor, 'GROUPS_READ');

    const rows = this.groupRepo.list({
      status: filter.status,
      gradeLevel: filter.gradeLevel,
      educationSystem: filter.educationSystem,
      languageTrack: filter.languageTrack,
    });

    return rows.map((r) => this.toGroupDto(r));
  }

  /**
   * Replaces a group's recurring weekly schedules.
   * Prunes only future untouched SCHEDULED sessions and materializes the new slots.
   */
  async setWeeklySchedule(
    input: SetGroupScheduleInput,
    actor: AuthenticatedUser
  ): Promise<WeeklyScheduleSlotDto[]> {
    const validated = this.parseSchema(SetGroupScheduleSchema, input);
    this.checkPermission(actor, 'GROUPS_WRITE');

    const group = this.groupRepo.findById(validated.groupId);
    if (!group) {
      throw new GroupError('GROUP_NOT_FOUND', `Group not found: ${validated.groupId}`);
    }

    if (group.status === 'ARCHIVED') {
      throw new GroupError('GROUP_ARCHIVED', 'Cannot modify weekly schedule for an archived group');
    }

    this.validateSlots(validated.slots);

    const nowIso = new Date().toISOString();
    const today = this.dateProvider.today();

    const result = this.client.transaction((tx) => {
      const groupRepoTx = new GroupRepository(tx as any);
      const sessionRepoTx = new SessionRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      // 1. Prune future untouched SCHEDULED sessions associated with previous schedules
      const removedSessionsCount = sessionRepoTx.deleteUntouchedFutureScheduledSessions(
        group.id,
        today
      );

      // 2. Remove obsolete schedule template rows
      groupRepoTx.deleteSchedulesByGroup(group.id);

      // 3. Insert new schedule templates
      const newSlots: GroupScheduleRow[] = [];
      for (const slot of validated.slots) {
        const row = groupRepoTx.addSchedule({
          id: slot.id ?? crypto.randomUUID(),
          groupId: group.id,
          weekday: slot.weekday,
          startTime: slot.startTime.trim(),
          durationMinutes: slot.durationMinutes,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        newSlots.push(row);
      }

      // 4. Audit schedule change
      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action: 'GROUP_SCHEDULE_CHANGED',
        entityType: 'GROUP',
        entityId: group.id,
        beforeJson: null,
        afterJson: JSON.stringify(newSlots.map((s) => this.toScheduleSlotDto(s))),
        metadataJson: JSON.stringify({
          slotCount: newSlots.length,
          purgedUntouchedFutureSessions: removedSessionsCount,
        }),
        createdAt: nowIso,
      });

      return newSlots;
    });

    // Notify listener to re-materialize sessions over rolling horizon
    if (this.onScheduleChanged) {
      await this.onScheduleChanged(group.id, actor);
    }

    return result.map((s) => this.toScheduleSlotDto(s));
  }

  /**
   * Lists weekly schedule slots for a group.
   */
  async listWeeklySchedule(
    groupId: string,
    actor: AuthenticatedUser
  ): Promise<WeeklyScheduleSlotDto[]> {
    this.checkPermission(actor, 'GROUPS_READ');

    const group = this.groupRepo.findById(groupId);
    if (!group) {
      throw new GroupError('GROUP_NOT_FOUND', `Group not found: ${groupId}`);
    }

    const slots = this.groupRepo.getSchedules(groupId);
    return slots.map((s) => this.toScheduleSlotDto(s));
  }
}
