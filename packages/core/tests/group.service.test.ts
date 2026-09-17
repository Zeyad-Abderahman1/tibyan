import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  AcademicAuditRepository,
  GroupRepository,
  type AcademicDatabaseConnection,
} from '@tibyan/db';
import {
  GroupService,
  GroupError,
} from '../src/groups/group.service.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';
import { FixedDateProvider } from '../src/common/date-provider.js';

describe('Task 6: GroupService', () => {
  let tempDir: string;
  let acadConn: AcademicDatabaseConnection;
  let groupService: GroupService;
  let auditRepo: AcademicAuditRepository;
  let groupRepo: GroupRepository;
  let dateProvider: FixedDateProvider;

  const ownerActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'أحمد المالك',
    role: 'OWNER',
    permissions: [],
  };

  const assistantWithWrite: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'سارة مساعدة (كامل)',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ', 'GROUPS_WRITE'],
  };

  const assistantReadOnly: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'خالد قارئ فقط',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ'],
  };

  const assistantNoPerms: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'علي بلا صلاحيات',
    role: 'ASSISTANT',
    permissions: [],
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-group-test-'));
    const dbPath = path.join(tempDir, 'academic.db');
    acadConn = openAcademicDatabase(dbPath);
    dateProvider = new FixedDateProvider('2026-10-01');
    groupService = new GroupService(acadConn.db, dateProvider);
    auditRepo = new AcademicAuditRepository(acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createGroup', () => {
    it('creates a valid group without weekly schedules', async () => {
      const result = await groupService.createGroup(
        {
          name: 'مجموعة النخبة - لغات',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'LANG_ENGLISH',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 450,
        },
        ownerActor
      );

      expect(result.id).toBeDefined();
      expect(result.name).toBe('مجموعة النخبة - لغات');
      expect(result.status).toBe('ACTIVE');
      expect(result.defaultPaymentAmount).toBe(450);
      expect(result.defaultPaymentType).toBe('MONTHLY');
      expect(result.schedules).toHaveLength(0);
      expect(result.enrolledCount).toBe(0);

      // Verify audit entry
      const audits = auditRepo.findByEntity('GROUP', result.id);
      expect(audits).toHaveLength(1);
      expect(audits[0]!.action).toBe('GROUP_CREATED');
      expect(audits[0]!.actorUserId).toBe(ownerActor.userId);
    });

    it('creates a valid group with multiple unique weekly schedule slots', async () => {
      const result = await groupService.createGroup(
        {
          name: 'مجموعة الرياضيات التطبيقية',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_3',
          languageTrack: 'ARABIC',
          focusMathBranch: 'APPLIED_MATH',
          defaultPaymentType: 'PER_SESSION',
          defaultPaymentAmount: 60,
          schedules: [
            { weekday: 0, startTime: '16:00', durationMinutes: 90 }, // Sunday
            { weekday: 2, startTime: '16:00', durationMinutes: 90 }, // Tuesday
          ],
        },
        assistantWithWrite
      );

      expect(result.schedules).toHaveLength(2);
      expect(result.focusMathBranch).toBe('APPLIED_MATH');

      const slots = await groupService.listWeeklySchedule(result.id, ownerActor);
      expect(slots).toHaveLength(2);
      expect(slots.map((s) => s.weekday)).toEqual([0, 2]);
    });

    it('rejects duplicate schedule slot for the same weekday and start time', async () => {
      await expect(
        groupService.createGroup(
          {
            name: 'مجموعة مكررة',
            educationSystem: 'GENERAL',
            gradeLevel: 'SEC_1',
            languageTrack: 'ARABIC',
            defaultPaymentType: 'PER_SESSION',
            defaultPaymentAmount: 50,
            schedules: [
              { weekday: 1, startTime: '10:00', durationMinutes: 60 },
              { weekday: 1, startTime: '10:00', durationMinutes: 90 },
            ],
          },
          ownerActor
        )
      ).rejects.toThrow(GroupError);
    });

    it('rejects negative default payment amount', async () => {
      await expect(
        groupService.createGroup(
          {
            name: 'مجموعة سعر سالب',
            educationSystem: 'GENERAL',
            gradeLevel: 'SEC_1',
            languageTrack: 'ARABIC',
            defaultPaymentType: 'MONTHLY',
            defaultPaymentAmount: -100,
          },
          ownerActor
        )
      ).rejects.toThrow(GroupError);
    });

    it('rejects non-positive slot duration', async () => {
      await expect(
        groupService.createGroup(
          {
            name: 'مجموعة مدة صفر',
            educationSystem: 'GENERAL',
            gradeLevel: 'SEC_1',
            languageTrack: 'ARABIC',
            defaultPaymentType: 'PER_SESSION',
            defaultPaymentAmount: 50,
            schedules: [{ weekday: 1, startTime: '10:00', durationMinutes: 0 }],
          },
          ownerActor
        )
      ).rejects.toThrow();
    });
  });

  describe('updateGroup and archiveGroup', () => {
    it('updates group properties successfully', async () => {
      const group = await groupService.createGroup(
        {
          name: 'المجموعة الأصلية',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
        },
        ownerActor
      );

      const updated = await groupService.updateGroup(
        {
          groupId: group.id,
          name: 'المجموعة المحدثة',
          defaultPaymentAmount: 350,
        },
        ownerActor
      );

      expect(updated.name).toBe('المجموعة المحدثة');
      expect(updated.defaultPaymentAmount).toBe(350);

      const audits = auditRepo.findByEntity('GROUP', group.id);
      expect(audits).toHaveLength(2);
      expect(audits[0]!.action).toBe('GROUP_UPDATED');
      expect(audits[1]!.action).toBe('GROUP_CREATED');
    });

    it('archives group without physically deleting rows or history', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة للأرشفة',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
        },
        ownerActor
      );

      const archived = await groupService.archiveGroup(group.id, ownerActor);
      expect(archived.status).toBe('ARCHIVED');

      // Still retrievable via getGroupById and in database
      const fetched = await groupService.getGroupById(group.id, ownerActor);
      expect(fetched.id).toBe(group.id);
      expect(fetched.status).toBe('ARCHIVED');

      const raw = groupRepo.findById(group.id);
      expect(raw).not.toBeNull();
      expect(raw?.status).toBe('ARCHIVED');

      const audits = auditRepo.findByEntity('GROUP', group.id);
      expect(audits[0]!.action).toBe('GROUP_ARCHIVED');
    });

    it('rejects modifying weekly schedule for an archived group', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة مؤرشفة',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
        },
        ownerActor
      );

      await groupService.archiveGroup(group.id, ownerActor);

      await expect(
        groupService.setWeeklySchedule(
          {
            groupId: group.id,
            slots: [{ weekday: 3, startTime: '15:00', durationMinutes: 90 }],
          },
          ownerActor
        )
      ).rejects.toThrow('Cannot modify weekly schedule for an archived group');
    });
  });

  describe('setWeeklySchedule', () => {
    it('sets and replaces weekly schedule slots', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة الجدول الأسبوعي',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_2',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'PER_SESSION',
          defaultPaymentAmount: 70,
          schedules: [{ weekday: 1, startTime: '14:00', durationMinutes: 60 }],
        },
        ownerActor
      );

      expect(group.schedules).toHaveLength(1);

      const newSlots = await groupService.setWeeklySchedule(
        {
          groupId: group.id,
          slots: [
            { weekday: 3, startTime: '16:00', durationMinutes: 90 },
            { weekday: 5, startTime: '10:00', durationMinutes: 90 },
          ],
        },
        ownerActor
      );

      expect(newSlots).toHaveLength(2);
      expect(newSlots.map((s) => s.weekday)).toEqual([3, 5]);

      const storedSlots = await groupService.listWeeklySchedule(group.id, ownerActor);
      expect(storedSlots).toHaveLength(2);

      const audits = auditRepo.findByEntity('GROUP', group.id);
      const scheduleAudit = audits.find((a) => a.action === 'GROUP_SCHEDULE_CHANGED');
      expect(scheduleAudit).toBeDefined();
    });

    it('rejects duplicate slots when setting weekly schedule', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة اختبار التكرار',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 200,
        },
        ownerActor
      );

      await expect(
        groupService.setWeeklySchedule(
          {
            groupId: group.id,
            slots: [
              { weekday: 0, startTime: '12:00', durationMinutes: 60 },
              { weekday: 0, startTime: '12:00', durationMinutes: 60 },
            ],
          },
          ownerActor
        )
      ).rejects.toThrow(GroupError);
    });
  });

  describe('Authorization and Audit Rollback', () => {
    it('allows OWNER to perform all operations without explicit permission list', async () => {
      const created = await groupService.createGroup(
        {
          name: 'مجموعة المالك',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
        },
        ownerActor
      );

      const fetched = await groupService.getGroupById(created.id, ownerActor);
      expect(fetched.id).toBe(created.id);
    });

    it('allows ASSISTANT with GROUPS_READ to read but denies write', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة القراءة',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
        },
        ownerActor
      );

      const fetched = await groupService.getGroupById(group.id, assistantReadOnly);
      expect(fetched.id).toBe(group.id);

      await expect(
        groupService.createGroup(
          {
            name: 'محاولة غير مصرحة',
            educationSystem: 'GENERAL',
            gradeLevel: 'SEC_1',
            languageTrack: 'ARABIC',
            defaultPaymentType: 'MONTHLY',
            defaultPaymentAmount: 300,
          },
          assistantReadOnly
        )
      ).rejects.toThrow(/Permission denied|PERMISSION_DENIED/);

      await expect(
        groupService.archiveGroup(group.id, assistantReadOnly)
      ).rejects.toThrow(/Permission denied|PERMISSION_DENIED/);
    });

    it('denies ASSISTANT without permissions for read and write', async () => {
      await expect(
        groupService.listGroups({}, assistantNoPerms)
      ).rejects.toThrow(/Permission denied|PERMISSION_DENIED/);
    });

    it('rolls back database mutations if audit log insertion fails', async () => {
      // Spy on auditRepo insert to throw an error inside transaction
      vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
        throw new Error('Forced audit database failure');
      });

      await expect(
        groupService.createGroup(
          {
            name: 'مجموعة ستتراجع',
            educationSystem: 'GENERAL',
            gradeLevel: 'SEC_1',
            languageTrack: 'ARABIC',
            defaultPaymentType: 'MONTHLY',
            defaultPaymentAmount: 300,
          },
          ownerActor
        )
      ).rejects.toThrow('Forced audit database failure');

      const allGroups = groupRepo.list();
      expect(allGroups.find((g) => g.name === 'مجموعة ستتراجع')).toBeUndefined();
    });
  });
});
