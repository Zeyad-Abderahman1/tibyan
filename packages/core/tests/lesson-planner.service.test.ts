import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openSystemDatabase,
  openAcademicDatabase,
  closeAllDatabases,
  CurriculumCatalogRepository,
  CurriculumNodeRepository,
  GroupRepository,
  SessionRepository,
  AcademicAuditRepository,
  type SystemDrizzle,
  type AcademicDrizzle,
} from '@tibyan/db';
import {
  createEmptyLessonPlanSections,
  createTextBlock,
  createMathBlock,
} from '@tibyan/contracts';
import {
  LessonPlannerService,
  LessonPlannerError,
  SessionReflectionService,
} from '../src/index.js';

describe('LessonPlannerService & SessionReflectionService (Core Domain)', () => {
  let sysDb: SystemDrizzle;
  let acadDb: AcademicDrizzle;
  let lessonService: LessonPlannerService;
  let reflectionService: SessionReflectionService;
  let catalogRepo: CurriculumCatalogRepository;
  let nodeRepo: CurriculumNodeRepository;
  let groupRepo: GroupRepository;
  let sessionRepo: SessionRepository;
  let auditRepo: AcademicAuditRepository;

  const ownerActor = {
    userId: 'user_owner_01',
    nameSnapshot: 'الأستاذ أحمد',
    fullName: 'الأستاذ أحمد الشريف',
    role: 'OWNER' as const,
    permissions: [],
  };

  const unauthorizedAssistant = {
    userId: 'user_asst_01',
    nameSnapshot: 'مساعد',
    fullName: 'مساعد تجريبي',
    role: 'ASSISTANT' as const,
    permissions: ['STUDENTS_READ' as const], // lacks GROUPS_WRITE
  };

  beforeEach(() => {
    closeAllDatabases();

    const sysConn = openSystemDatabase({ filePath: ':memory:', autoMigrate: true });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });
    sysDb = sysConn.db;
    acadDb = acadConn.db;

    catalogRepo = new CurriculumCatalogRepository(sysDb);
    nodeRepo = new CurriculumNodeRepository(sysDb);
    groupRepo = new GroupRepository(acadDb);
    sessionRepo = new SessionRepository(acadDb);
    auditRepo = new AcademicAuditRepository(acadDb);

    lessonService = new LessonPlannerService(sysDb, acadDb);
    reflectionService = new SessionReflectionService(acadDb);

    // 1. Seed System DB Catalog & Node
    catalogRepo.create({
      id: 'cat_sys_01',
      code: 'CAT-SEC3-CALC-V1',
      title: 'منهج التفاضل والتكامل - الصف الثالث الثانوي',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_3',
      languageTrack: 'ARABIC',
      mathBranch: 'CALCULUS',
      version: 1,
      status: 'PUBLISHED',
      publishedAt: '2026-09-20T00:00:00.000Z',
      description: null,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    nodeRepo.create({
      id: 'node_chain_rule',
      catalogId: 'cat_sys_01',
      tier: 'LESSON',
      titleAr: 'قاعدة السلسلة وتفاضل الدوال الدائرية',
      code: 'SEC3-CALC-L01',
      parentId: null,
      orderIndex: 1,
      description: 'شرح وتدريبات على قاعدة السلسلة',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // 2. Seed Academic DB Group & Session
    groupRepo.create({
      id: 'grp_sec3_alpha',
      name: 'مجموعة أ - ثانوية عامة',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_3',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'PER_SESSION',
      defaultPaymentAmount: 500,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    sessionRepo.create({
      id: 'sess_sec3_001',
      groupId: 'grp_sec3_alpha',
      occurrenceKey: 'grp_sec3_alpha_2026-09-20_16:00',
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

  describe('LessonPlannerService', () => {
    it('creates lesson plan with sanitization and writes audit log', () => {
      const sections = createEmptyLessonPlanSections();
      sections.objectives = ['فهم قاعدة السلسلة <script>alert("xss")</script>'];
      sections.explanation = {
        version: 1,
        blocks: [
          createTextBlock('نص توضيحي للقاعدة <script>alert("hack")</script>'),
          createMathBlock('\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}'),
        ],
      };

      const plan = lessonService.createLessonPlan(
        {
          curriculumNodeId: 'node_chain_rule',
          title: 'خطة درس قاعدة السلسلة',
          targetDurationMinutes: 90,
          status: 'READY',
          sections,
        },
        ownerActor
      );

      expect(plan.id).toBeDefined();
      expect(plan.curriculumNodeId).toBe('node_chain_rule');
      expect(plan.version).toBe(1);

      // Verify sanitization stripped <script> tags
      expect(plan.sections.objectives[0]).toBe('فهم قاعدة السلسلة ');
      expect((plan.sections.explanation.blocks[0] as any).content).toBe('نص توضيحي للقاعدة ');

      // Verify audit log
      const auditEntries = auditRepo.findByEntity('LESSON_PLAN', plan.id);
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]?.action).toBe('LESSON_PLAN_CREATED');
      expect(auditEntries[0]?.actorUserId).toBe(ownerActor.userId);
    });

    it('rejects creating lesson plan if curriculum node does not exist in system DB', () => {
      expect(() =>
        lessonService.createLessonPlan(
          {
            curriculumNodeId: 'non_existent_node_uuid',
            title: 'خطة بلا منهج',
            targetDurationMinutes: 60,
            sections: createEmptyLessonPlanSections(),
          },
          ownerActor
        )
      ).toThrowError(LessonPlannerError);
    });

    it('rejects assistant without GROUPS_WRITE permission', () => {
      expect(() =>
        lessonService.createLessonPlan(
          {
            curriculumNodeId: 'node_chain_rule',
            title: 'خطة بواسطة مساعد غير مصرح',
            targetDurationMinutes: 60,
            sections: createEmptyLessonPlanSections(),
          },
          unauthorizedAssistant
        )
      ).toThrowError(/Permission 'GROUPS_WRITE' is required/);
    });

    it('updates lesson plan, increments version number, and records audit trail', () => {
      const plan = lessonService.createLessonPlan(
        {
          curriculumNodeId: 'node_chain_rule',
          title: 'خطة أولية',
          targetDurationMinutes: 60,
          sections: createEmptyLessonPlanSections(),
        },
        ownerActor
      );
      expect(plan.version).toBe(1);

      const updated = lessonService.updateLessonPlan(
        plan.id,
        {
          title: 'خطة معدلة ومحدثة',
          targetDurationMinutes: 75,
          status: 'READY',
        },
        ownerActor
      );

      expect(updated.title).toBe('خطة معدلة ومحدثة');
      expect(updated.targetDurationMinutes).toBe(75);
      expect(updated.version).toBe(2);

      // Verify audit entries (created + updated)
      const auditEntries = auditRepo.findByEntity('LESSON_PLAN', plan.id);
      expect(auditEntries).toHaveLength(2);
      expect(auditEntries[0]?.action).toBe('LESSON_PLAN_UPDATED');
    });

    it('retrieves plan by ID and lists by node', () => {
      const plan = lessonService.createLessonPlan(
        {
          curriculumNodeId: 'node_chain_rule',
          title: 'خطة للاستعلام',
          targetDurationMinutes: 60,
          sections: createEmptyLessonPlanSections(),
        },
        ownerActor
      );

      const fetched = lessonService.getLessonPlanById(plan.id, ownerActor);
      expect(fetched.title).toBe('خطة للاستعلام');

      const byNode = lessonService.listLessonPlansByNode('node_chain_rule', ownerActor);
      expect(byNode.length).toBeGreaterThanOrEqual(1);
      expect(byNode[0]?.id).toBe(plan.id);
    });
  });

  describe('SessionReflectionService & Immutable Snapshot Preservation', () => {
    it('creates reflection with immutable snapshot and verifies historical stability after plan edits', () => {
      // 1. Create original lesson plan version 1
      const sections = createEmptyLessonPlanSections();
      sections.objectives = ['تطبيق قاعدة السلسلة على الدوال الأسية'];
      const plan = lessonService.createLessonPlan(
        {
          curriculumNodeId: 'node_chain_rule',
          title: 'خطة الدرس الأول (الإصدار 1)',
          targetDurationMinutes: 90,
          status: 'READY',
          sections,
        },
        ownerActor
      );
      expect(plan.version).toBe(1);

      // 2. Conduct session and record reflection capturing snapshot
      const reflection = reflectionService.createReflection(
        {
          sessionId: 'sess_sec3_001',
          lessonPlanId: plan.id,
          completionStatus: 'PARTIALLY_COMPLETED',
          uncompletedItems: 'تبقى الجزء الخاص بالدوال اللوغاريتمية',
          topicsNeedingReview: 'مراجعة مشتقة الدوال المثلثية المعكوسة',
          quickNotes: 'تم شرح 80% من الحصة وتفاعل الطلاب كان جيداً',
        },
        ownerActor
      );

      expect(reflection.id).toBeDefined();
      expect(reflection.completionStatus).toBe('PARTIALLY_COMPLETED');
      expect(reflection.lessonPlanSnapshot).not.toBeNull();
      expect(reflection.lessonPlanSnapshot?.version).toBe(1);
      expect(reflection.lessonPlanSnapshot?.title).toBe('خطة الدرس الأول (الإصدار 1)');
      expect(reflection.lessonPlanSnapshot?.sections.objectives).toEqual([
        'تطبيق قاعدة السلسلة على الدوال الأسية',
      ]);

      // Verify audit log
      const auditEntries = auditRepo.findByEntity('SESSION_REFLECTION', reflection.id);
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]?.action).toBe('SESSION_REFLECTION_CREATED');

      // 3. Later, the teacher modifies the lesson plan, changing its title, duration, objectives, and version to 2
      const updatedSections = createEmptyLessonPlanSections();
      updatedSections.objectives = ['أهداف جديدة مختلفة كلياً للإصدار الثاني'];
      lessonService.updateLessonPlan(
        plan.id,
        {
          title: 'خطة الدرس الأول (تم تحديثها بالكامل للأعوام القادمة)',
          targetDurationMinutes: 120,
          sections: updatedSections,
        },
        ownerActor
      );

      // 4. Crucial Invariant Check: The recorded reflection MUST retain the exact version 1 snapshot as taught!
      const fetchedReflection = reflectionService.getReflectionBySessionId('sess_sec3_001', ownerActor);
      expect(fetchedReflection).not.toBeNull();
      expect(fetchedReflection!.lessonPlanSnapshot?.version).toBe(1);
      expect(fetchedReflection!.lessonPlanSnapshot?.title).toBe('خطة الدرس الأول (الإصدار 1)');
      expect(fetchedReflection!.lessonPlanSnapshot?.targetDurationMinutes).toBe(90);
      expect(fetchedReflection!.lessonPlanSnapshot?.sections.objectives).toEqual([
        'تطبيق قاعدة السلسلة على الدوال الأسية',
      ]);
    });

    it('enforces single reflection per session (prevents duplicates)', () => {
      reflectionService.createReflection(
        {
          sessionId: 'sess_sec3_001',
          completionStatus: 'COMPLETED',
          quickNotes: 'ملاحظة أولى',
        },
        ownerActor
      );

      expect(() =>
        reflectionService.createReflection(
          {
            sessionId: 'sess_sec3_001',
            completionStatus: 'POSTPONED',
            quickNotes: 'محاولة تسجيل تأمل ثانٍ لنفس الحصة',
          },
          ownerActor
        )
      ).toThrowError(/A reflection already exists for session/);
    });

    it('rejects reflection creation for non-existent session', () => {
      expect(() =>
        reflectionService.createReflection(
          {
            sessionId: 'non_existent_session_id',
            completionStatus: 'COMPLETED',
          },
          ownerActor
        )
      ).toThrowError(/Session not found/);
    });

    it('updates reflection and records audit log', () => {
      const reflection = reflectionService.createReflection(
        {
          sessionId: 'sess_sec3_001',
          completionStatus: 'PARTIALLY_COMPLETED',
          uncompletedItems: 'فقرة التمارين',
        },
        ownerActor
      );

      const updated = reflectionService.updateReflection(
        reflection.id,
        {
          completionStatus: 'COMPLETED',
          uncompletedItems: null,
          quickNotes: 'تم إكمال فقرة التمارين في بداية الحصة التالية',
        },
        ownerActor
      );

      expect(updated.completionStatus).toBe('COMPLETED');
      expect(updated.uncompletedItems).toBeNull();
      expect(updated.quickNotes).toBe('تم إكمال فقرة التمارين في بداية الحصة التالية');

      const auditEntries = auditRepo.findByEntity('SESSION_REFLECTION', reflection.id);
      expect(auditEntries).toHaveLength(2);
      expect(auditEntries[0]?.action).toBe('SESSION_REFLECTION_UPDATED');
    });
  });
});
