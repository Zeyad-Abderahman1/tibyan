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
  isOccurrenceCollisionError,
} from '../src/groups/session.service.js';
import { GroupService } from '../src/groups/group.service.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';
import { FixedDateProvider, DefaultDateProvider } from '../src/common/date-provider.js';

describe('Task 6: SessionService Complete Regression Suite', () => {
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
    dateProvider = new FixedDateProvider('2026-10-01', '12:00');
    sessionService = new SessionService(acadConn.db, dateProvider);
    groupService = new GroupService(acadConn.db, dateProvider);
    sessionRepo = new SessionRepository(acadConn.db);
    auditRepo = new AcademicAuditRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('1. Local wall-clock calendar calculations', () => {
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

    it('verifies that DefaultDateProvider uses local wall-clock date and time, avoiding UTC day-shift near midnight', () => {
      const provider = new DefaultDateProvider();
      const localToday = provider.today();
      const localTime = provider.nowTime();

      expect(localToday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(localTime).toMatch(/^\d{2}:\d{2}$/);

      // Simulated Egypt midnight time (00:30 on 2026-10-02, which is 21:30 on 2026-10-01 in UTC)
      // produces local calendar date 2026-10-02 and NOT the previous UTC day
      const fixedEgyptMidnight = new FixedDateProvider('2026-10-02', '00:30');
      expect(fixedEgyptMidnight.today()).toBe('2026-10-02');
      expect(fixedEgyptMidnight.nowTime()).toBe('00:30');

      const horizon = computeHorizonDates(fixedEgyptMidnight.today(), 28);
      expect(horizon[0]!.dateStr).toBe('2026-10-02');
      expect(horizon[0]!.weekday).toBe(5); // Friday
    });
  });

  describe('2. Materialization & Idempotency', () => {
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
      // 2026-11-01 is Sunday, newly entering the horizon
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

    it('completed occurrence is not replaced or duplicated by materializer', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة فحص الجلسة المكتملة',
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

      // Mark first occurrence COMPLETED
      sessionRepo.update(sessions[0]!.id, { status: 'COMPLETED' });

      // Rerun materializer
      const rerun = await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      expect(rerun.createdCount).toBe(0);
      expect(rerun.existingCount).toBe(4);

      const reloaded = sessionRepo.findById(sessions[0]!.id);
      expect(reloaded?.status).toBe('COMPLETED');
    });

    it('cancelled occurrence is not replaced or duplicated by materializer', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة فحص الجلسة الملغاة',
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

      // Cancel first occurrence
      await sessionService.cancelSession(
        { sessionId: sessions[0]!.id, reason: 'إلغاء أسبوعي' },
        ownerActor
      );

      // Rerun materializer
      const rerun = await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      expect(rerun.createdCount).toBe(0);
      expect(rerun.existingCount).toBe(4);

      const reloaded = sessionRepo.findById(sessions[0]!.id);
      expect(reloaded?.status).toBe('CANCELLED_BY_TEACHER');
      expect(reloaded?.cancellationReason).toBe('إلغاء أسبوعي');
    });
  });

  describe('3. Rescheduling Behavior', () => {
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

    it('rerunning materializer after rescheduling never recreates the original slot', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة اختبار عدم التكرار',
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
      const firstSundaySession = sessions[0]!;

      await sessionService.rescheduleSession(
        {
          sessionId: firstSundaySession.id,
          newEffectiveDate: '2026-10-06',
          newEffectiveStartTime: '17:00',
          reason: 'تأجيل الثلاثاء',
        },
        ownerActor
      );

      const rerun = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );
      expect(rerun.createdCount).toBe(0); // MUST NOT recreate Sunday!

      const allSessionsAfterRerun = sessionRepo.listByGroup(group.id);
      expect(allSessionsAfterRerun).toHaveLength(4);

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

      // Mark first session completed
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

      // Mark second session cancelled
      await sessionService.cancelSession(
        { sessionId: sessions[1]!.id, reason: 'إلغاء مسبق' },
        ownerActor
      );

      await expect(
        sessionService.rescheduleSession(
          {
            sessionId: sessions[1]!.id,
            newEffectiveDate: '2026-10-06',
            newEffectiveStartTime: '17:00',
            reason: 'محاولة تأجيل جلسة ملغاة',
          },
          ownerActor
        )
      ).rejects.toThrow(SessionError);
    });
  });

  describe('4. Cancellation Metadata & Notes Independence', () => {
    it('persists cancellation reason in dedicated cancellationReason column and preserves general notes', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة إلغاء الحصة',
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

      // Add a general note to the session beforehand
      sessionRepo.update(targetSession.id, { notes: 'ملاحظة عامة: مراجعة الواجب المنزلي' });

      const cancelled = await sessionService.cancelSession(
        {
          sessionId: targetSession.id,
          reason: 'عطلة رسمية بمناسبة 6 أكتوبر',
        },
        assistantWithSessionsManage
      );

      // Verify dedicated cancellationReason column
      expect(cancelled.status).toBe('CANCELLED_BY_TEACHER');
      expect(cancelled.cancellationReason).toBe('عطلة رسمية بمناسبة 6 أكتوبر');

      // Verify notes are completely untouched and independent
      expect(cancelled.notes).toBe('ملاحظة عامة: مراجعة الواجب المنزلي');
      expect(cancelled.notes).not.toContain('[سبب الإلغاء]');

      // Verify in raw database
      const rawInDb = sessionRepo.findById(targetSession.id);
      expect(rawInDb?.cancellationReason).toBe('عطلة رسمية بمناسبة 6 أكتوبر');
      expect(rawInDb?.notes).toBe('ملاحظة عامة: مراجعة الواجب المنزلي');

      // Verify occurrence identity and schedule values remain immutable
      expect(cancelled.occurrenceKey).toBe(targetSession.occurrenceKey);
      expect(cancelled.scheduledDate).toBe(targetSession.scheduledDate);
      expect(cancelled.scheduledStartTime).toBe(targetSession.scheduledStartTime);
      expect(cancelled.effectiveDate).toBe(targetSession.effectiveDate);
      expect(cancelled.effectiveStartTime).toBe(targetSession.effectiveStartTime);

      // Audit entry verification
      const audits = auditRepo.findByEntity('SESSION', targetSession.id);
      expect(audits[0]!.action).toBe('SESSION_CANCELLED');
      const auditMeta = JSON.parse(audits[0]!.metadataJson ?? '{}');
      expect(auditMeta.cancellationReason).toBe('عطلة رسمية بمناسبة 6 أكتوبر');
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

  describe('5. Same-Day Schedule Protection & History Preservation', () => {
    it('preserves an earlier SCHEDULED session from today and only regenerates later SCHEDULED sessions when replaced', async () => {
      // Set current clock to Thursday 2026-10-01 at 14:00 (afternoon)
      dateProvider.setDate('2026-10-01');
      dateProvider.setTime('14:00');

      // Create group with TWO slots on Thursday (weekday = 4):
      // Slot 1: morning 10:00 (earlier today, already in the past)
      // Slot 2: evening 18:00 (later today, strictly in the future)
      const group = await groupService.createGroup(
        {
          name: 'مجموعة حصتين في نفس اليوم',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [
            { weekday: 4, startTime: '10:00', durationMinutes: 90 },
            { weekday: 4, startTime: '18:00', durationMinutes: 90 },
          ],
        },
        ownerActor
      );

      // Materialize initial sessions
      await sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor);
      const initialSessions = sessionRepo.listByGroup(group.id);

      const morningSessionToday = initialSessions.find(
        (s) => s.scheduledDate === '2026-10-01' && s.scheduledStartTime === '10:00'
      );
      const eveningSessionToday = initialSessions.find(
        (s) => s.scheduledDate === '2026-10-01' && s.scheduledStartTime === '18:00'
      );

      expect(morningSessionToday).toBeDefined();
      expect(eveningSessionToday).toBeDefined();
      expect(morningSessionToday?.status).toBe('SCHEDULED');
      expect(eveningSessionToday?.status).toBe('SCHEDULED');

      // Replace schedule with Saturday slot
      await groupService.setWeeklySchedule(
        {
          groupId: group.id,
          slots: [{ weekday: 6, startTime: '12:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      const afterChangeSessions = sessionRepo.listByGroup(group.id);

      // 1. Morning session earlier today (10:00) MUST BE PRESERVED even though status was SCHEDULED
      const preservedMorning = afterChangeSessions.find((s) => s.id === morningSessionToday!.id);
      expect(preservedMorning).toBeDefined();
      expect(preservedMorning?.scheduledStartTime).toBe('10:00');

      // 2. Evening session later today (18:00) was in the future and invalidated, so it was purged
      const purgedEvening = afterChangeSessions.find((s) => s.id === eveningSessionToday!.id);
      expect(purgedEvening).toBeUndefined();

      // 3. Future Thursday sessions from next weeks were also purged
      const futureThursday = afterChangeSessions.find((s) => s.scheduledDate === '2026-10-08');
      expect(futureThursday).toBeUndefined();
    });

    it('preserves RESCHEDULED, COMPLETED, and CANCELLED_BY_TEACHER sessions while regenerating untouched future SCHEDULED occurrences', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة تعديل الجدول المتقدمة',
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
      expect(sessions).toHaveLength(4);

      // 1. Session 0 (10-04): mark COMPLETED
      sessionRepo.update(sessions[0]!.id, { status: 'COMPLETED' });

      // 2. Session 1 (10-11): RESCHEDULE to 10-12
      await sessionService.rescheduleSession(
        {
          sessionId: sessions[1]!.id,
          newEffectiveDate: '2026-10-12',
          newEffectiveStartTime: '18:00',
          reason: 'تأجيل يدوي',
        },
        ownerActor
      );

      // 3. Session 2 (10-18): CANCEL with dedicated cancellationReason
      await sessionService.cancelSession(
        {
          sessionId: sessions[2]!.id,
          reason: 'ظرف خاص للمعلم',
        },
        ownerActor
      );

      // 4. Session 3 (10-25): remains untouched SCHEDULED

      // Change group schedule: replace Sunday with Wednesday (weekday = 3)
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
      expect(matResult.createdCount).toBe(4);

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

      // Session 2 (CANCELLED_BY_TEACHER) is preserved and has cancellationReason!
      const cancelledSession = finalSessions.find((s) => s.id === sessions[2]!.id);
      expect(cancelledSession).toBeDefined();
      expect(cancelledSession?.status).toBe('CANCELLED_BY_TEACHER');
      expect(cancelledSession?.cancellationReason).toBe('ظرف خاص للمعلم');

      // Session 3 (untouched SCHEDULED) was purged!
      const oldUntouchedScheduled = finalSessions.find((s) => s.id === sessions[3]!.id);
      expect(oldUntouchedScheduled).toBeUndefined();

      // Total sessions count: 3 preserved + 4 new Wednesday sessions = 7 sessions
      expect(finalSessions).toHaveLength(7);
    });
  });

  describe('6. Concurrency & Collision Safety', () => {
    it('correctly identifies UNIQUE collision on sessions.occurrence_key', () => {
      const collisionErr = new Error('UNIQUE constraint failed: sessions.occurrence_key');
      (collisionErr as any).code = 'SQLITE_CONSTRAINT_UNIQUE';
      expect(isOccurrenceCollisionError(collisionErr)).toBe(true);

      const generalConstraintErr = new Error('UNIQUE constraint failed: sessions.occurrence_key');
      (generalConstraintErr as any).code = 'SQLITE_CONSTRAINT';
      expect(isOccurrenceCollisionError(generalConstraintErr)).toBe(true);

      const fkErr = new Error('FOREIGN KEY constraint failed');
      (fkErr as any).code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
      expect(isOccurrenceCollisionError(fkErr)).toBe(false);

      const nullErr = new Error('NOT NULL constraint failed: sessions.duration_minutes');
      (nullErr as any).code = 'SQLITE_CONSTRAINT_NOTNULL';
      expect(isOccurrenceCollisionError(nullErr)).toBe(false);
    });

    it('safely handles an occurrence inserted concurrently between pre-check and final INSERT without failing', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة التزامن',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      // Simulate a concurrent race condition by hooking SessionRepository.prototype.findByOccurrenceKey
      const originalFindByKey = SessionRepository.prototype.findByOccurrenceKey;
      let simulatedRaceTriggered = false;

      vi.spyOn(SessionRepository.prototype, 'findByOccurrenceKey').mockImplementation(function (
        this: any,
        occurrenceKey: string
      ) {
        const found = originalFindByKey.call(this, occurrenceKey);
        if (!found && !simulatedRaceTriggered) {
          simulatedRaceTriggered = true;
          // Sneak in a concurrent insert into the database before the materializer's create runs:
          sessionRepo.create({
            id: crypto.randomUUID(),
            groupId: group.id,
            scheduleId: occurrenceKey.split('_')[0]!,
            occurrenceKey,
            scheduledDate: '2026-10-04',
            scheduledStartTime: '16:00',
            effectiveDate: '2026-10-04',
            effectiveStartTime: '16:00',
            durationMinutes: 90,
            status: 'SCHEDULED',
            rescheduleReason: null,
            rescheduledAt: null,
            cancellationReason: null,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          // Return null as if the pre-check didn't see it
          return null;
        }
        return found;
      });

      const result = await sessionService.materializeRollingHorizon(
        { groupId: group.id },
        ownerActor
      );

      // 4 Sundays total in horizon: 1 was inserted concurrently, 3 inserted by materializer
      expect(result.createdCount).toBe(3);
      expect(result.existingCount).toBe(1);

      const allSessions = sessionRepo.listByGroup(group.id);
      expect(allSessions).toHaveLength(4);
    });

    it('does NOT swallow unrelated database errors like foreign key violations during materialization', async () => {
      const group = await groupService.createGroup(
        {
          name: 'مجموعة فحص الأخطاء',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          defaultPaymentType: 'MONTHLY',
          defaultPaymentAmount: 300,
          schedules: [{ weekday: 0, startTime: '16:00', durationMinutes: 90 }],
        },
        ownerActor
      );

      vi.spyOn(SessionRepository.prototype, 'create').mockImplementationOnce(() => {
        const fkError = new Error('FOREIGN KEY constraint failed');
        (fkError as any).code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
        throw fkError;
      });

      await expect(
        sessionService.materializeRollingHorizon({ groupId: group.id }, ownerActor)
      ).rejects.toThrow('FOREIGN KEY constraint failed');
    });
  });

  describe('7. Authorization & Transaction Rollback', () => {
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
