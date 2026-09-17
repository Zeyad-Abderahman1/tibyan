import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  AcademicAuditRepository,
  SessionRepository,
  type AcademicDatabaseConnection,
} from '@tibyan/db';
import {
  SessionService,
  SessionError,
  computeHorizonDates,
  generateOccurrenceKey,
} from '../src/groups/session.service.js';
import { GroupService } from '../src/groups/group.service.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';
import { FixedDateProvider } from '../src/common/date-provider.js';

describe('Task 6: SessionService', () => {
  let tempDir: string;
  let acadConn: AcademicDatabaseConnection;
  let sessionService: SessionService;
  let groupService: GroupService;
  let sessionRepo: SessionRepository;
  let auditRepo: AcademicAuditRepository;
  let dateProvider: FixedDateProvider;

  const ownerActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'أحمد المالك',
    role: 'OWNER',
    permissions: [],
  };

  const assistantWithSessionsManage: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'سارة مساعدة (جلسات)',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ', 'SESSIONS_MANAGE'],
  };

  const assistantReadOnly: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'خالد قارئ فقط',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ'],
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-session-test-'));
    const dbPath = path.join(tempDir, 'academic.db');
    acadConn = openAcademicDatabase(dbPath);
    // 2026-10-01 is a Thursday (weekday = 4)
    dateProvider = new FixedDateProvider('2026-10-01');
    sessionService = new SessionService(acadConn.db, dateProvider);
    groupService = new GroupService(acadConn.db, dateProvider);
    sessionRepo = new SessionRepository(acadConn.db);
    auditRepo = new AcademicAuditRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Rolling horizon calculations', () => {
    it('generates exactly 28 calendar dates from today through today + 27 days inclusive', () => {
      const dates = computeHorizonDates('2026-10-01', 28);
      expect(dates).toHaveLength(28);
      expect(dates[0]!.dateStr).toBe('2026-10-01');
      // October has 31 days: 2026-10-01 + 27 days = 2026-10-28
      expect(dates[27]!.dateStr).toBe('2026-10-28');
    });

    it('derives stable occurrence key from scheduleId + scheduledDate', () => {
      const key = generateOccurrenceKey('sched-123', '2026-10-04');
      expect(key).toBe('sched-123_2026-10-04');
    });
  });

  describe('materializeRollingHorizon', () => {
    it('materializes matching weekly occurrences correctly and idempotently', async () => {
      // 2026-10-01 is Thursday (4).
      // Sunday is weekday 0 (e.g. 2026-10-04, 2026-10-11, 2026-10-18, 2026-10-25 => 4 occurrences).
      // Tuesday is weekday 2 (e.g. 2026-10-06, 2026-10-13, 2026-10-20, 2026-10-27 => 4 occurrences).
      const group = await groupService.createGroup(
        {
          name: 'مجموعة الأحد والثلاثاء',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [
            { weekday: 0, startTime: '16:00', durationMinutes: 90 },
            { weekday: 2, startTime: '18:00', durationMinutes: 90 },
          ],
        },
        ownerActor
      );

      // First run: should materialize 8 sessions (4 Sundays + 4 Tuesdays)
      const firstRun = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );
      expect(firstRun.createdCount).toBe(8);
      expect(firstRun.existingCount).toBe(0);

      const allSessions = sessionRepo.listByGroup(group.id);
      expect(allSessions).toHaveLength(8);

      // Check scheduledDate vs effectiveDate equality on initial creation
      for (const s of allSessions) {
        expect(s.status).toBe('SCHEDULED');
        expect(s.effectiveDate).toBe(s.scheduledDate);
        expect(s.effectiveStartTime).toBe(s.scheduledStartTime);
        expect(s.rescheduleReason).toBeNull();
      }

      // Second run: completely idempotent, 0 new sessions created
      const secondRun = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );
      expect(secondRun.createdCount).toBe(0);
      expect(secondRun.existingCount).toBe(8);

      const allSessionsAfterSecond = sessionRepo.listByGroup(group.id);
      expect(allSessionsAfterSecond).toHaveLength(8);
    });

    it('advancing injected date by one day extends horizon correctly without duplicate occurrences', async () => {
      // Create group on Sunday slot (0)
      const group = await groupService.createGroup(
        {
          name: 'مجموعة الأحد',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '10:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      // Day 1: 2026-10-01 (horizon: 2026-10-01 to 2026-10-28)
      const run1 = await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      expect(run1.createdCount).toBe(4); // Oct 4, 11, 18, 25

      // Advance clock by 4 days to 2026-10-05 (horizon: 2026-10-05 to 2026-11-01)
      // 2026-11-01 is a Sunday! This is a new Sunday entering the horizon!
      dateProvider.setDate('2026-10-05');

      const run2 = await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      expect(run2.createdCount).toBe(1); // 2026-11-01 newly materialized
      expect(run2.existingCount).toBe(3); // 11, 18, 25 skipped as existing

      const sessionsNow = sessionRepo.listByGroup(group.id);
      expect(sessionsNow).toHaveLength(5);
    });

    it('archived group does not generate new future recurring sessions', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة ستؤرشف',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '10:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await groupService.archiveGroup(group.id, ownerActor);

      const result = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );
      expect(result.createdCount).toBe(0);

      const sessions = sessionRepo.listByGroup(group.id);
      expect(sessions).toHaveLength(0);
    });
  });

  describe('rescheduleSession', () => {
    it('keeps occurrenceKey and scheduled slot unchanged, updates only effective slot and metadata', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة التأجيل',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);
      const originalSession = sessions[0]!; // 2026-10-04, 16:00

      const rescheduled = await sessionService.rescheduleSession(
        {
          sessionId: originalSession.id,
          newEffectiveDate: '2026-10-06',
          newEffectiveStartTime: '17:30',
          reason: 'ظرف طارئ للمعلم',
        },
        assistantWithSessionsManage
      );

      // Immutable original slot and identity preserved
      expect(rescheduled.occurrenceKey).toBe(originalSession.occurrenceKey);
      expect(rescheduled.scheduledDate).toBe(originalSession.scheduledDate);
      expect(rescheduled.scheduledStartTime).toBe(originalSession.scheduledStartTime);

      // Mutable effective slot changed
      expect(rescheduled.effectiveDate).toBe('2026-10-06');
      expect(rescheduled.effectiveStartTime).toBe('17:30');
      expect(rescheduled.status).toBe('RESCHEDULED');
      expect(rescheduled.rescheduleReason).toBe('ظرف طارئ للمعلم');
      expect(rescheduled.rescheduledAt).not.toBeNull();

      // Audit check
      const audits = auditRepo.findByEntity('SESSION', originalSession.id);
      expect(audits[0]!.action).toBe('SESSION_RESCHEDULED');
    });

    it('rerunning materializer does NOT recreate the original rescheduled occurrence', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة عدم إعادة التوليد',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);
      const firstSundaySession = sessions[0]!; // 2026-10-04

      // Reschedule 2026-10-04 to Tuesday 2026-10-06
      await sessionService.rescheduleSession(
        {
          sessionId: firstSundaySession.id,
          newEffectiveDate: '2026-10-06',
          newEffectiveStartTime: '17:00',
          reason: 'تأجيل إلى الثلاثاء',
        },
        ownerActor
      );

      // Rerun materializer
      const rerun = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );
      expect(rerun.createdCount).toBe(0); // MUST NOT recreate Sunday!

      const allSessionsAfterRerun = sessionRepo.listByGroup(group.id);
      expect(allSessionsAfterRerun).toHaveLength(4);

      // Verify that no session has effectiveDate = '2026-10-04'
      const sundayOccurrence = allSessionsAfterRerun.find((s) => s.effectiveDate === '2026-10-04');
      expect(sundayOccurrence).toBeUndefined();
    });

    it('rejects rescheduling for completed or cancelled session', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة الجلسات المنتهية',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);

      // Mark first session completed in DB
      sessionRepo.update(sessions[0]!.id, { status: 'COMPLETED' });

      await expect(
        sessionService.rescheduleSession(
          {
            sessionId: sessions[0]!.id,
            newEffectiveDate: '2026-10-06',
            newEffectiveStartTime: '17:00',
            reason: 'محاولة تأجيل جلسة مكتملة',
          },
          ownerActor
        )
      ).rejects.toThrow(SessionError);
    });
  });

  describe('cancelSession', () => {
    it('cancels session, sets status = CANCELLED_BY_TEACHER, stores reason in notes, and preserves times', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة الإلغاء',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);
      const targetSession = sessions[0]!;

      const cancelled = await sessionService.cancelSession(
        {
          sessionId: targetSession.id,
          reason: 'عطلة رسمية',
        },
        assistantWithSessionsManage
      );

      expect(cancelled.status).toBe('CANCELLED_BY_TEACHER');
      expect(cancelled.notes).toContain('[سبب الإلغاء]: عطلة رسمية');
      expect(cancelled.occurrenceKey).toBe(targetSession.occurrenceKey);
      expect(cancelled.effectiveDate).toBe(targetSession.effectiveDate);
      expect(cancelled.effectiveStartTime).toBe(targetSession.effectiveStartTime);

      // Materializer will NOT replace or recreate cancelled session
      const rerun = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );
      expect(rerun.createdCount).toBe(0);

      // Audit check
      const audits = auditRepo.findByEntity('SESSION', targetSession.id);
      expect(audits[0]!.action).toBe('SESSION_CANCELLED');
    });

    it('rejects cancellation of completed session', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة محاولة إلغاء مكتملة',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);

      sessionRepo.update(sessions[0]!.id, { status: 'COMPLETED' });

      await expect(
        sessionService.cancelSession(
          {
            sessionId: sessions[0]!.id,
            reason: 'محاولة إلغاء جلسة مكتملة',
          },
          ownerActor
        )
      ).rejects.toThrow('Cannot cancel a completed session');
    });
  });

  describe('Schedule replacement and safe session preservation', () => {
    it('preserves RESCHEDULED, COMPLETED, and CANCELLED_BY_TEACHER sessions while regenerating untouched SCHEDULED occurrences', async () => {
      // Group with Sunday slots (weekday = 0)
      const group = await groupService.createGroup(
        {
          name: 'مجموعة تعديل الجدول',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      // Materialize initial 4 Sundays: 2026-10-04, 2026-10-11, 2026-10-18, 2026-10-25
      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);
      expect(sessions).toHaveLength(4);

      // 1. Session 0 (10-04): mark COMPLETED
      sessionRepo.update(sessions[0]!.id, { status: 'COMPLETED' });

      // 2. Session 1 (10-11): RESCHEDULE to 10-12
      await sessionService.rescheduleSession(
        {
          sessionId: sessions[1]!.id,
          newEffectiveDate: '2026-10-12',
          newEffectiveStartTime: '18:00',
          reason: 'تأجيل يدوي خاص',
        },
        ownerActor
      );

      // 3. Session 2 (10-18): CANCEL
      await sessionService.cancelSession(
        {
          sessionId: sessions[2]!.id,
          reason: 'إلغاء خاص',
        },
        ownerActor
      );

      // 4. Session 3 (10-25): remains untouched SCHEDULED

      // Now change group schedule: replace Sunday with Wednesday (weekday = 3, e.g. 10-07, 10-14, 10-21, 10-28 => 4 occurrences)
      await groupService.setWeeklySchedule(
        {
          groupId: group.id,
          slots: [{ weekday: 3, startTime: '17:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      // Materialize the new schedule over the horizon
      const matResult = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );
      expect(matResult.createdCount).toBe(4); // 4 Wednesdays generated

      const finalSessions = sessionRepo.listByGroup(group.id);

      // Session 0 (COMPLETED) is preserved!
      const completedSession = finalSessions.find((s) => s.id === sessions[0]!.id);
      expect(completedSession).toBeDefined();
      expect(completedSession?.status).toBe('COMPLETED');

      // Session 1 (RESCHEDULED) is preserved!
      const rescheduledSession = finalSessions.find((s) => s.id === sessions[1]!.id);
      expect(rescheduledSession).toBeDefined();
      expect(rescheduledSession?.status).toBe('RESCHEDULED');
      expect(rescheduledSession?.effectiveDate).toBe('2026-10-12');

      // Session 2 (CANCELLED_BY_TEACHER) is preserved!
      const cancelledSession = finalSessions.find((s) => s.id === sessions[2]!.id);
      expect(cancelledSession).toBeDefined();
      expect(cancelledSession?.status).toBe('CANCELLED_BY_TEACHER');

      // Session 3 (untouched SCHEDULED) was purged and replaced!
      const oldUntouchedScheduled = finalSessions.find((s) => s.id === sessions[3]!.id);
      expect(oldUntouchedScheduled).toBeUndefined();

      // Total sessions count: 3 preserved + 4 new Wednesday sessions = 7 sessions
      expect(finalSessions).toHaveLength(7);
    });
  });

  describe('Authorization and Audit Rollback', () => {
    it('denies ASSISTANT without SESSIONS_MANAGE from rescheduling or cancelling sessions', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة الصلاحيات',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);

      await expect(
        sessionService.rescheduleSession(
          {
            sessionId: sessions[0]!.id,
            newEffectiveDate: '2026-10-06',
            newEffectiveStartTime: '17:00',
            reason: 'محاولة بلا صلاحية',
          },
          assistantReadOnly
        )
      ).rejects.toThrow(/Permission denied|PERMISSION_DENIED/);

      await expect(
        sessionService.cancelSession(
          {
            sessionId: sessions[0]!.id,
            reason: 'محاولة إلغاء بلا صلاحية',
          },
          assistantReadOnly
        )
      ).rejects.toThrow(/Permission denied|PERMISSION_DENIED/);
    });

    it('rolls back rescheduling transaction if audit insertion fails', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة تراجع التأجيل',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const sessions = sessionRepo.listByGroup(group.id);

      vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
        throw new Error('Forced session audit failure');
      });

      await expect(
        sessionService.rescheduleSession(
          {
            sessionId: sessions[0]!.id,
            newEffectiveDate: '2026-10-06',
            newEffectiveStartTime: '17:00',
            reason: 'تراجع',
          },
          ownerActor
        )
      ).rejects.toThrow('Forced session audit failure');

      // Verify status in DB was rolled back
      const reloaded = sessionRepo.findById(sessions[0]!.id);
      expect(reloaded?.status).toBe('SCHEDULED');
      expect(reloaded?.effectiveDate).toBe(sessions[0]!.scheduledDate);
    });
  });
});
