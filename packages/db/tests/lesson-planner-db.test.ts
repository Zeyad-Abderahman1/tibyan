import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openAcademicDatabase,
  closeAllDatabases,
  LessonPlanRepository,
  SessionReflectionRepository,
  GroupRepository,
  SessionRepository,
} from '../src/index.js';

describe('Lesson Planner & Session Reflection Database Layer', () => {
  let lessonPlanRepo: LessonPlanRepository;
  let reflectionRepo: SessionReflectionRepository;
  let groupRepo: GroupRepository;
  let sessionRepo: SessionRepository;

  beforeEach(() => {
    closeAllDatabases();

    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });
    lessonPlanRepo = new LessonPlanRepository(acadConn.db);
    reflectionRepo = new SessionReflectionRepository(acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
    sessionRepo = new SessionRepository(acadConn.db);

    // Seed group and session for foreign keys
    groupRepo.create({
      id: 'grp_test_01',
      name: 'مجموعة النخبة - الصف الثالث الثانوي',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_3',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 400,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    sessionRepo.create({
      id: 'sess_test_01',
      groupId: 'grp_test_01',
      occurrenceKey: 'grp_test_01_2026-09-20_16:00',
      scheduledDate: '2026-09-20',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-09-20',
      effectiveStartTime: '16:00',
      durationMinutes: 90,
      status: 'SCHEDULED',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });
  });

  afterEach(() => {
    closeAllDatabases();
  });

  describe('LessonPlanRepository', () => {
    it('creates, queries, and updates a lesson plan', () => {
      const initialSections = JSON.stringify({
        objectives: ['حساب المشتقة الأولى للدوال الكسرية'],
        explanation: { version: 1, blocks: [] },
        timingBreakdown: [{ id: '1', label: 'شرح', minutes: 45 }],
      });

      const plan = lessonPlanRepo.create({
        id: 'plan_calc_01',
        curriculumNodeId: 'node_derivative_rules',
        title: 'خطة درس قواعد الاشتقاق',
        targetDurationMinutes: 60,
        status: 'DRAFT',
        version: 1,
        sectionsJson: initialSections,
        createdAt: '2026-09-20T10:00:00.000Z',
        updatedAt: '2026-09-20T10:00:00.000Z',
      });

      expect(plan.id).toBe('plan_calc_01');
      expect(plan.status).toBe('DRAFT');
      expect(plan.version).toBe(1);

      // Find by ID
      const found = lessonPlanRepo.findById('plan_calc_01');
      expect(found).not.toBeNull();
      expect(found?.title).toBe('خطة درس قواعد الاشتقاق');

      // Find by Curriculum Node ID
      const listByNode = lessonPlanRepo.findByCurriculumNodeId('node_derivative_rules');
      expect(listByNode).toHaveLength(1);
      expect(listByNode[0]?.id).toBe('plan_calc_01');

      // Update
      const updated = lessonPlanRepo.update('plan_calc_01', {
        title: 'خطة درس قواعد الاشتقاق (معتمدة)',
        status: 'READY',
        version: 2,
      });
      expect(updated.title).toBe('خطة درس قواعد الاشتقاق (معتمدة)');
      expect(updated.status).toBe('READY');
      expect(updated.version).toBe(2);
    });

    it('filters lesson plans by status and search keyword', () => {
      lessonPlanRepo.create({
        id: 'plan_1',
        curriculumNodeId: 'node_1',
        title: 'تفاضل الدوال المثلثية',
        targetDurationMinutes: 60,
        status: 'READY',
        version: 1,
        sectionsJson: '{}',
        createdAt: '2026-09-20T10:00:00.000Z',
        updatedAt: '2026-09-20T10:00:00.000Z',
      });

      lessonPlanRepo.create({
        id: 'plan_2',
        curriculumNodeId: 'node_2',
        title: 'تكامل الدوال اللوغاريتمية',
        targetDurationMinutes: 90,
        status: 'DRAFT',
        version: 1,
        sectionsJson: '{}',
        createdAt: '2026-09-20T11:00:00.000Z',
        updatedAt: '2026-09-20T11:00:00.000Z',
      });

      const readyPlans = lessonPlanRepo.list({ status: 'READY' });
      expect(readyPlans).toHaveLength(1);
      expect(readyPlans[0]?.id).toBe('plan_1');

      const searchResults = lessonPlanRepo.list({ search: 'تكامل' });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0]?.id).toBe('plan_2');
    });
  });

  describe('SessionReflectionRepository & Historical Snapshot Integrity', () => {
    it('creates reflection with immutable lesson plan snapshot', () => {
      // 1. Create a lesson plan version 1
      const planSnapshot = {
        planId: 'plan_frozen_01',
        curriculumNodeId: 'node_geo_01',
        title: 'هندسة الفضاء: معادلة المستوى',
        targetDurationMinutes: 90,
        version: 1,
        sections: { objectives: ['فهم الصورة المتجهة لمعادلة المستوى'] },
        snapshottedAt: '2026-09-20T15:00:00.000Z',
      };

      lessonPlanRepo.create({
        id: 'plan_frozen_01',
        curriculumNodeId: 'node_geo_01',
        title: 'هندسة الفضاء: معادلة المستوى',
        targetDurationMinutes: 90,
        status: 'READY',
        version: 1,
        sectionsJson: JSON.stringify(planSnapshot.sections),
        createdAt: '2026-09-20T09:00:00.000Z',
        updatedAt: '2026-09-20T09:00:00.000Z',
      });

      // 2. Record reflection with immutable snapshot
      const reflection = reflectionRepo.create({
        id: 'ref_sess_01',
        sessionId: 'sess_test_01',
        lessonPlanId: 'plan_frozen_01',
        lessonPlanSnapshotJson: JSON.stringify(planSnapshot),
        completionStatus: 'COMPLETED',
        uncompletedItems: null,
        topicsNeedingReview: 'مراجعة الضرب الاتجاهي لمتجهات الوحدة',
        quickNotes: 'تم شرح الدرس بالكامل وحل 6 مسائل نموذجية',
        createdAt: '2026-09-20T17:30:00.000Z',
        updatedAt: '2026-09-20T17:30:00.000Z',
      });

      expect(reflection.id).toBe('ref_sess_01');
      expect(reflection.completionStatus).toBe('COMPLETED');

      // 3. Later, the original lesson plan is modified and upgraded to Version 2
      lessonPlanRepo.update('plan_frozen_01', {
        title: 'هندسة الفضاء: معادلة المستوى (معدل بالكامل للمراجعة النهائية)',
        version: 2,
        sectionsJson: JSON.stringify({ objectives: ['أهداف جديدة كلياً'] }),
      });

      // 4. Verify historical reflection snapshot remains completely UNCHANGED!
      const fetchedReflection = reflectionRepo.findBySessionId('sess_test_01');
      expect(fetchedReflection).not.toBeNull();
      const storedSnapshot = JSON.parse(fetchedReflection!.lessonPlanSnapshotJson!);
      expect(storedSnapshot.version).toBe(1);
      expect(storedSnapshot.title).toBe('هندسة الفضاء: معادلة المستوى');
      expect(storedSnapshot.sections.objectives).toEqual(['فهم الصورة المتجهة لمعادلة المستوى']);
    });

    it('enforces single reflection per session (unique constraint)', () => {
      reflectionRepo.create({
        id: 'ref_1',
        sessionId: 'sess_test_01',
        completionStatus: 'COMPLETED',
        createdAt: '2026-09-20T17:00:00.000Z',
        updatedAt: '2026-09-20T17:00:00.000Z',
      });

      // Attempting to create a second reflection for the same session should fail with constraint violation
      expect(() =>
        reflectionRepo.create({
          id: 'ref_2',
          sessionId: 'sess_test_01',
          completionStatus: 'PARTIALLY_COMPLETED',
          createdAt: '2026-09-20T17:05:00.000Z',
          updatedAt: '2026-09-20T17:05:00.000Z',
        })
      ).toThrow();
    });
  });
});
