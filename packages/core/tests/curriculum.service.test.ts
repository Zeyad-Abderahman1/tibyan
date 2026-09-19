import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openSystemDatabase,
  openAcademicDatabase,
  closeAllDatabases,
  GroupRepository,
  SessionRepository,
  SystemAuditRepository,
  AcademicAuditRepository,
} from '@tibyan/db';
import { CurriculumService, CurriculumError } from '../src/curriculum/curriculum.service.js';

describe('CurriculumService (Core Domain & Invariants)', () => {
  let curriculumService: CurriculumService;
  let groupRepo: GroupRepository;
  let sessionRepo: SessionRepository;
  let systemAuditRepo: SystemAuditRepository;
  let academicAuditRepo: AcademicAuditRepository;

  beforeEach(() => {
    closeAllDatabases();

    const sysConn = openSystemDatabase({ filePath: ':memory:', autoMigrate: true });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });

    curriculumService = new CurriculumService(sysConn.db, acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
    sessionRepo = new SessionRepository(acadConn.db);
    systemAuditRepo = new SystemAuditRepository(sysConn.db);
    academicAuditRepo = new AcademicAuditRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
  });

  it('1. creates, updates, and publishes a curriculum catalog in DRAFT state', () => {
    const actor = { userId: 'usr-owner-1', nameSnapshot: 'الأستاذ أحمد' };

    const catalog = curriculumService.createCatalog(
      {
        code: 'CAT-PREP1-ALG-2026',
        title: 'منهج الجبر للصف الأول الإعدادي',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
        mathBranch: 'ALGEBRA',
        description: 'المنهج الأساسي',
      },
      actor
    );

    expect(catalog.version).toBe(1);
    expect(catalog.status).toBe('DRAFT');
    expect(catalog.publishedAt).toBeNull();

    // Update title while in DRAFT
    const updated = curriculumService.updateCatalog(
      catalog.id,
      { title: 'منهج الجبر والإحصاء - الصف الأول الإعدادي' },
      actor
    );
    expect(updated.title).toBe('منهج الجبر والإحصاء - الصف الأول الإعدادي');

    // Attempting to publish without nodes must fail
    expect(() => curriculumService.publishCatalog(catalog.id, actor)).toThrowError(
      CurriculumError
    );

    // Add a Unit and a Lesson
    const unit = curriculumService.createNode(
      {
        catalogId: catalog.id,
        tier: 'UNIT',
        titleAr: 'الوحدة الأولى: الأعداد النسبية',
        code: 'U1',
      },
      actor
    );

    curriculumService.createNode(
      {
        catalogId: catalog.id,
        parentId: unit.id,
        tier: 'LESSON',
        titleAr: 'الدرس الأول: مجموعة الأعداد النسبية',
        code: 'L1',
      },
      actor
    );

    // Now publishing succeeds
    const published = curriculumService.publishCatalog(catalog.id, actor);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeDefined();

    // Published catalog is immutable
    expect(() =>
      curriculumService.updateCatalog(catalog.id, { title: 'تعديل مرفوض' }, actor)
    ).toThrowError(CurriculumError);

    // Audit logs recorded
    const auditLogs = systemAuditRepo.findByEntity('CURRICULUM_CATALOG', catalog.id);
    expect(auditLogs.some((l) => l.action === 'CURRICULUM_CATALOG_CREATED')).toBe(true);
    expect(auditLogs.some((l) => l.action === 'CURRICULUM_CATALOG_PUBLISHED')).toBe(true);
  });

  it('2. enforces hierarchy rules: UNIT (root) -> LESSON -> CONCEPT -> SKILL', () => {
    const actor = { userId: 'usr-owner-1', nameSnapshot: 'الأستاذ أحمد' };

    const catalog = curriculumService.createCatalog(
      {
        code: 'CAT-HIERARCHY-TEST',
        title: 'اختبار الهيكل',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
      },
      actor
    );

    // Rule: UNIT cannot have a parent
    expect(() =>
      curriculumService.createNode(
        {
          catalogId: catalog.id,
          parentId: '99999999-9999-9999-9999-999999999999',
          tier: 'UNIT',
          titleAr: 'وحدة غير شرعية',
          code: 'U-ERR',
        },
        actor
      )
    ).toThrowError(/UNIT tier nodes cannot have a parent/);

    const unit = curriculumService.createNode(
      {
        catalogId: catalog.id,
        tier: 'UNIT',
        titleAr: 'الوحدة الأولى',
        code: 'U1',
      },
      actor
    );

    // Rule: LESSON must have a parent
    expect(() =>
      curriculumService.createNode(
        {
          catalogId: catalog.id,
          tier: 'LESSON',
          titleAr: 'درس يتيم',
          code: 'L-ERR',
        },
        actor
      )
    ).toThrowError(/must specify a parent node/);

    // Rule: LESSON parent must be a UNIT
    const lesson = curriculumService.createNode(
      {
        catalogId: catalog.id,
        parentId: unit.id,
        tier: 'LESSON',
        titleAr: 'الدرس الأول',
        code: 'L1',
      },
      actor
    );

    // Rule: CONCEPT parent must be a LESSON
    expect(() =>
      curriculumService.createNode(
        {
          catalogId: catalog.id,
          parentId: unit.id, // invalid: parent is UNIT
          tier: 'CONCEPT',
          titleAr: 'مفهوم خاطئ الأب',
          code: 'C-ERR',
        },
        actor
      )
    ).toThrowError(/CONCEPT parent must be a LESSON/);

    const concept = curriculumService.createNode(
      {
        catalogId: catalog.id,
        parentId: lesson.id,
        tier: 'CONCEPT',
        titleAr: 'مفهوم العدد النسبي',
        code: 'C1',
      },
      actor
    );

    // Rule: SKILL parent must be a CONCEPT or LESSON
    const skill = curriculumService.createNode(
      {
        catalogId: catalog.id,
        parentId: concept.id,
        tier: 'SKILL',
        titleAr: 'كتابة العدد النسبي في صورة عشرية',
        code: 'S1',
      },
      actor
    );
    expect(skill.tier).toBe('SKILL');

    // Retrieve tree
    const tree = curriculumService.getTree(catalog.id, actor);
    expect(tree.length).toBe(1);
    expect(tree[0]!.tier).toBe('UNIT');
    expect(tree[0]!.children.length).toBe(1);
    expect(tree[0]!.children[0]!.tier).toBe('LESSON');
    expect(tree[0]!.children[0]!.children[0]!.tier).toBe('CONCEPT');
    expect(tree[0]!.children[0]!.children[0]!.children[0]!.tier).toBe('SKILL');
  });

  it('3. revises a published catalog into a new version N+1 preserving deep node tree', () => {
    const actor = { userId: 'usr-owner-1', nameSnapshot: 'الأستاذ أحمد' };

    const catalogV1 = curriculumService.createCatalog(
      {
        code: 'CAT-REVISE-TEST',
        title: 'المنهج القابل للتطوير',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        mathBranch: 'GEOMETRY',
      },
      actor
    );

    const unit = curriculumService.createNode(
      {
        catalogId: catalogV1.id,
        tier: 'UNIT',
        titleAr: 'الوحدة 1',
        code: 'U1',
      },
      actor
    );

    const lesson = curriculumService.createNode(
      {
        catalogId: catalogV1.id,
        parentId: unit.id,
        tier: 'LESSON',
        titleAr: 'الدرس 1',
        code: 'L1',
      },
      actor
    );

    curriculumService.createNode(
      {
        catalogId: catalogV1.id,
        parentId: lesson.id,
        tier: 'SKILL',
        titleAr: 'المهارة 1',
        code: 'S1',
      },
      actor
    );

    curriculumService.publishCatalog(catalogV1.id, actor);

    // Revise to create V2
    const catalogV2 = curriculumService.reviseCatalog(catalogV1.id, actor);
    expect(catalogV2.version).toBe(2);
    expect(catalogV2.status).toBe('DRAFT');
    expect(catalogV2.id).not.toBe(catalogV1.id);

    // Deep tree cloned
    const treeV2 = curriculumService.getTree(catalogV2.id, actor);
    expect(treeV2.length).toBe(1);
    expect(treeV2[0]!.titleAr).toBe('الوحدة 1');
    expect(treeV2[0]!.id).not.toBe(unit.id); // fresh UUIDs
    expect(treeV2[0]!.children[0]!.titleAr).toBe('الدرس 1');
    expect(treeV2[0]!.children[0]!.children[0]!.titleAr).toBe('المهارة 1');

    // V1 remains immutable and intact
    const treeV1 = curriculumService.getTree(catalogV1.id, actor);
    expect(treeV1[0]!.id).toBe(unit.id);
  });

  it('4. assigns catalog to group with strict cross-database scope validation', () => {
    const actor = { userId: 'usr-owner-1', nameSnapshot: 'الأستاذ أحمد' };

    // Group in Academic DB: PREP_1, GENERAL, ARABIC, ALGEBRA
    const group = groupRepo.create({
      id: '12345678-1234-1234-1234-123456789012',
      name: 'مجموعة أولى إعدادي جبر',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      focusMathBranch: 'ALGEBRA',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 250,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Catalog in System DB: PREP_2 (Mismatched Grade)
    const catalogWrongGrade = curriculumService.createCatalog(
      {
        code: 'CAT-PREP2',
        title: 'جبر ثانية إعدادي',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_2', // mismatch!
        languageTrack: 'ARABIC',
        mathBranch: 'ALGEBRA',
      },
      actor
    );
    curriculumService.createNode(
      { catalogId: catalogWrongGrade.id, tier: 'UNIT', titleAr: 'وحدة', code: 'U1' },
      actor
    );
    curriculumService.publishCatalog(catalogWrongGrade.id, actor);

    // Assigning wrong grade catalog must throw SCOPE_MISMATCH
    expect(() =>
      curriculumService.assignGroupCatalog(
        {
          groupId: group.id,
          catalogId: catalogWrongGrade.id,
        },
        actor
      )
    ).toThrowError(/does not match catalog scope/);

    // Matching catalog in DRAFT status must be rejected
    const catalogMatching = curriculumService.createCatalog(
      {
        code: 'CAT-PREP1-MATCH',
        title: 'جبر أولى إعدادي مطابق',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
        mathBranch: 'ALGEBRA',
      },
      actor
    );
    const u1 = curriculumService.createNode(
      { catalogId: catalogMatching.id, tier: 'UNIT', titleAr: 'وحدة الجبر', code: 'U1' },
      actor
    );
    const l1 = curriculumService.createNode(
      { catalogId: catalogMatching.id, parentId: u1.id, tier: 'LESSON', titleAr: 'درس 1', code: 'L1' },
      actor
    );
    curriculumService.createNode(
      { catalogId: catalogMatching.id, parentId: l1.id, tier: 'SKILL', titleAr: 'مهارة 1', code: 'S1' },
      actor
    );

    // Still DRAFT:
    expect(() =>
      curriculumService.assignGroupCatalog(
        {
          groupId: group.id,
          catalogId: catalogMatching.id,
        },
        actor
      )
    ).toThrowError(/Cannot assign an unready draft catalog/);

    // Publish matching catalog
    curriculumService.publishCatalog(catalogMatching.id, actor);

    // Now assignment succeeds
    const assignment = curriculumService.assignGroupCatalog(
      {
        groupId: group.id,
        catalogId: catalogMatching.id,
        notes: 'تم اعتماد منهج الجبر للمجموعة',
      },
      actor
    );

    expect(assignment.groupId).toBe(group.id);
    expect(assignment.catalogId).toBe(catalogMatching.id);

    // Academic audit logged
    const academicAudits = academicAuditRepo.findByEntity('GROUP_CURRICULUM_ASSIGNMENT', assignment.id);
    expect(academicAudits.length).toBe(1);
    expect(academicAudits[0]!.action).toBe('GROUP_CURRICULUM_ASSIGNED');
  });

  it('5. tracks group progress, computes skill denominator, and derives pacing projection', () => {
    const actor = { userId: 'usr-owner-1', nameSnapshot: 'الأستاذ أحمد' };

    const group = groupRepo.create({
      id: '23456789-2345-2345-2345-234567890123',
      name: 'مجموعة المتابعة الأكاديمية',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 300,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    const catalog = curriculumService.createCatalog(
      {
        code: 'CAT-PROGRESS-TEST',
        title: 'منهج الصف الأول الثانوي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
      },
      actor
    );

    const unit = curriculumService.createNode(
      { catalogId: catalog.id, tier: 'UNIT', titleAr: 'الوحدة 1', code: 'U1' },
      actor
    );
    const lesson = curriculumService.createNode(
      { catalogId: catalog.id, parentId: unit.id, tier: 'LESSON', titleAr: 'الدرس 1', code: 'L1' },
      actor
    );

    // 4 Skills
    const skill1 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: lesson.id, tier: 'SKILL', titleAr: 'مهارة 1', code: 'S1' },
      actor
    );
    const skill2 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: lesson.id, tier: 'SKILL', titleAr: 'مهارة 2', code: 'S2' },
      actor
    );
    const skill3 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: lesson.id, tier: 'SKILL', titleAr: 'مهارة 3', code: 'S3' },
      actor
    );
    const skill4 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: lesson.id, tier: 'SKILL', titleAr: 'مهارة 4', code: 'S4' },
      actor
    );

    curriculumService.publishCatalog(catalog.id, actor);
    curriculumService.assignGroupCatalog({ groupId: group.id, catalogId: catalog.id }, actor);

    // Initial Overview (0 progress)
    const initialOverview = curriculumService.getGroupOverview(group.id, actor);
    expect(initialOverview.totalSkills).toBe(4);
    expect(initialOverview.completedSkills).toBe(0);
    expect(initialOverview.remainingSkills).toBe(4);
    expect(initialOverview.completionPercentage).toBe(0);
    expect(initialOverview.projection.status).toBe('INSUFFICIENT_DATA');

    // Mark Skill 1 IN_PROGRESS, Skill 2 COMPLETED
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill1.id, status: 'IN_PROGRESS' },
      actor
    );
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill2.id, status: 'COMPLETED' },
      actor
    );

    const midOverview = curriculumService.getGroupOverview(group.id, actor);
    expect(midOverview.completedSkills).toBe(1);
    expect(midOverview.inProgressSkills).toBe(1);
    expect(midOverview.remainingSkills).toBe(3);
    expect(midOverview.completionPercentage).toBe(25);

    // Progress map
    const map = curriculumService.getGroupProgressMap(group.id, actor);
    expect(map[skill1.id]).toBe('IN_PROGRESS');
    expect(map[skill2.id]).toBe('COMPLETED');
    expect(map[skill3.id]).toBeUndefined();

    // Now seed 2 completed sessions for group in Academic DB to enable projection
    sessionRepo.create({
      id: 'sess-001',
      groupId: group.id,
      occurrenceKey: 'occ-1',
      scheduledDate: '2026-09-01',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-09-01',
      effectiveStartTime: '16:00',
      durationMinutes: 90,
      status: 'COMPLETED',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T18:00:00.000Z',
    });

    sessionRepo.create({
      id: 'sess-002',
      groupId: group.id,
      occurrenceKey: 'occ-2',
      scheduledDate: '2026-09-15',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-09-15',
      effectiveStartTime: '16:00',
      durationMinutes: 90,
      status: 'COMPLETED',
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-09-15T18:00:00.000Z',
    });

    const projectedOverview = curriculumService.getGroupOverview(group.id, actor);
    expect(projectedOverview.projection.status).toBe('ON_TRACK');
    expect(projectedOverview.projection.completedSessionsCount).toBe(2);
    expect(projectedOverview.projection.skillsPerWeekRate).toBeGreaterThan(0);
    expect(projectedOverview.projection.projectedCompletionDate).toBeDefined();

    // Complete all remaining skills
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill1.id, status: 'COMPLETED' },
      actor
    );
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill3.id, status: 'COMPLETED' },
      actor
    );
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill4.id, status: 'COMPLETED' },
      actor
    );

    const finalOverview = curriculumService.getGroupOverview(group.id, actor);
    expect(finalOverview.completedSkills).toBe(4);
    expect(finalOverview.remainingSkills).toBe(0);
    expect(finalOverview.completionPercentage).toBe(100);
    expect(finalOverview.projection.status).toBe('ON_TRACK');
    expect(finalOverview.projection.messageAr).toBe('تم إكمال جميع مهارات المنهج بنجاح');
  });

  it('6. rejects unauthorized assistant actors from mutating curriculum or group progress', () => {
    const assistantUnauthorized = {
      userId: 'usr-asst-1',
      nameSnapshot: 'مساعد غير مصرح',
      role: 'ASSISTANT' as const,
      permissions: ['STUDENTS_READ' as const], // missing GROUPS_WRITE and GROUPS_READ
    };

    expect(() =>
      curriculumService.createCatalog(
        {
          code: 'CAT-UNAUTH',
          title: 'منهج غير مصرح',
          educationSystem: 'GENERAL',
          gradeLevel: 'PREP_1',
          languageTrack: 'ARABIC',
        },
        assistantUnauthorized
      )
    ).toThrowError(/PERMISSION_DENIED/);

    expect(() => curriculumService.listCatalogs(undefined, assistantUnauthorized)).toThrowError(
      /PERMISSION_DENIED/
    );
  });
});
