import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openSystemDatabase,
  openAcademicDatabase,
  closeAllDatabases,
  GroupRepository,
  SessionRepository,
  SystemAuditRepository,
  AcademicAuditRepository,
  CurriculumCatalogRepository,
  CurriculumNodeRepository,
  GroupCurriculumRepository,
} from '@tibyan/db';
import { CurriculumService, CurriculumError } from '../src/curriculum/curriculum.service.js';

describe('CurriculumService (Core Domain & Invariants)', () => {
  let curriculumService: CurriculumService;
  let groupRepo: GroupRepository;
  let sessionRepo: SessionRepository;
  let systemAuditRepo: SystemAuditRepository;
  let academicAuditRepo: AcademicAuditRepository;
  let catalogRepo: CurriculumCatalogRepository;
  let nodeRepo: CurriculumNodeRepository;
  let groupCurriculumRepo: GroupCurriculumRepository;
  let sysConn: ReturnType<typeof openSystemDatabase>;
  let acadConn: ReturnType<typeof openAcademicDatabase>;

  const ownerActor = {
    userId: 'usr-owner-1',
    fullName: 'الأستاذ أحمد',
    role: 'OWNER' as const,
    permissions: [],
  };

  beforeEach(() => {
    closeAllDatabases();

    sysConn = openSystemDatabase({ filePath: ':memory:', autoMigrate: true });
    acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });

    curriculumService = new CurriculumService(sysConn.db, acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
    sessionRepo = new SessionRepository(acadConn.db);
    systemAuditRepo = new SystemAuditRepository(sysConn.db);
    academicAuditRepo = new AcademicAuditRepository(acadConn.db);
    catalogRepo = new CurriculumCatalogRepository(sysConn.db);
    nodeRepo = new CurriculumNodeRepository(sysConn.db);
    groupCurriculumRepo = new GroupCurriculumRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
  });

  // Helper to build a complete minimal valid tree (UNIT -> LESSON -> CONCEPT -> SKILL)
  function createMinimalValidTree(catalogId: string, actor = ownerActor) {
    const unit = curriculumService.createNode(
      { catalogId, tier: 'UNIT', titleAr: 'الوحدة الأولى: الأعداد النسبية', code: 'U1' },
      actor
    );
    const lesson = curriculumService.createNode(
      { catalogId, parentId: unit.id, tier: 'LESSON', titleAr: 'الدرس الأول: مجموعة الأعداد', code: 'L1' },
      actor
    );
    const concept = curriculumService.createNode(
      { catalogId, parentId: lesson.id, tier: 'CONCEPT', titleAr: 'مفهوم الأعداد النسبية', code: 'C1' },
      actor
    );
    const skill = curriculumService.createNode(
      { catalogId, parentId: concept.id, tier: 'SKILL', titleAr: 'تحويل الكسر إلى نسبة مئوية', code: 'S1' },
      actor
    );
    return { unit, lesson, concept, skill };
  }

  it('1. creates, updates, and publishes a curriculum catalog in DRAFT state', () => {
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
      ownerActor
    );

    expect(catalog.version).toBe(1);
    expect(catalog.status).toBe('DRAFT');
    expect(catalog.publishedAt).toBeNull();

    // Update title while in DRAFT
    const updated = curriculumService.updateCatalog(
      catalog.id,
      { title: 'منهج الجبر والإحصاء - الصف الأول الإعدادي' },
      ownerActor
    );
    expect(updated.title).toBe('منهج الجبر والإحصاء - الصف الأول الإعدادي');

    // Attempting to publish without nodes must fail
    expect(() => curriculumService.publishCatalog(catalog.id, ownerActor)).toThrowError(
      CurriculumError
    );

    // Add complete valid tree (UNIT -> LESSON -> CONCEPT -> SKILL)
    createMinimalValidTree(catalog.id, ownerActor);

    // Now publishing succeeds
    const published = curriculumService.publishCatalog(catalog.id, ownerActor);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeDefined();

    // Published catalog is immutable
    expect(() =>
      curriculumService.updateCatalog(catalog.id, { title: 'تعديل مرفوض' }, ownerActor)
    ).toThrowError(CurriculumError);

    // Audit logs recorded with authoritative fullName
    const auditLogs = systemAuditRepo.findByEntity('CURRICULUM_CATALOG', catalog.id);
    expect(auditLogs.some((l) => l.action === 'CURRICULUM_CATALOG_CREATED')).toBe(true);
    expect(auditLogs.some((l) => l.action === 'CURRICULUM_CATALOG_PUBLISHED')).toBe(true);
    expect(auditLogs.every((l) => l.actorNameSnapshot === 'الأستاذ أحمد')).toBe(true);
  });

  it('2. enforces hierarchy rules: UNIT (root) -> LESSON -> CONCEPT -> SKILL', () => {
    const catalog = curriculumService.createCatalog(
      {
        code: 'CAT-HIERARCHY-TEST',
        title: 'اختبار الهيكل',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
      },
      ownerActor
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
        ownerActor
      )
    ).toThrowError(/UNIT tier nodes cannot have a parent/);

    const unit = curriculumService.createNode(
      {
        catalogId: catalog.id,
        tier: 'UNIT',
        titleAr: 'الوحدة الأولى',
        code: 'U1',
      },
      ownerActor
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
        ownerActor
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
      ownerActor
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
        ownerActor
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
      ownerActor
    );

    // Rule: SKILL parent must be a CONCEPT
    const skill = curriculumService.createNode(
      {
        catalogId: catalog.id,
        parentId: concept.id,
        tier: 'SKILL',
        titleAr: 'كتابة العدد النسبي في صورة عشرية',
        code: 'S1',
      },
      ownerActor
    );
    expect(skill.tier).toBe('SKILL');

    // Retrieve tree
    const tree = curriculumService.getTree(catalog.id, ownerActor);
    expect(tree.length).toBe(1);
    expect(tree[0]!.tier).toBe('UNIT');
    expect(tree[0]!.children.length).toBe(1);
    expect(tree[0]!.children[0]!.tier).toBe('LESSON');
    expect(tree[0]!.children[0]!.children[0]!.tier).toBe('CONCEPT');
    expect(tree[0]!.children[0]!.children[0]!.children[0]!.tier).toBe('SKILL');
  });

  it('3. revises a published catalog into a new version N+1 preserving deep node tree', () => {
    const catalogV1 = curriculumService.createCatalog(
      {
        code: 'CAT-REVISE-TEST',
        title: 'المنهج القابل للتطوير',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        mathBranch: 'GEOMETRY',
      },
      ownerActor
    );

    const { unit, lesson, concept, skill } = createMinimalValidTree(catalogV1.id, ownerActor);

    curriculumService.publishCatalog(catalogV1.id, ownerActor);

    // Revise to create V2
    const catalogV2 = curriculumService.reviseCatalog(catalogV1.id, ownerActor);
    expect(catalogV2.version).toBe(2);
    expect(catalogV2.status).toBe('DRAFT');
    expect(catalogV2.id).not.toBe(catalogV1.id);

    // Deep tree cloned
    const treeV2 = curriculumService.getTree(catalogV2.id, ownerActor);
    expect(treeV2.length).toBe(1);
    expect(treeV2[0]!.titleAr).toBe(unit.titleAr);
    expect(treeV2[0]!.id).not.toBe(unit.id); // fresh UUIDs
    expect(treeV2[0]!.children[0]!.titleAr).toBe(lesson.titleAr);
    expect(treeV2[0]!.children[0]!.children[0]!.titleAr).toBe(concept.titleAr);
    expect(treeV2[0]!.children[0]!.children[0]!.children[0]!.titleAr).toBe(skill.titleAr);

    // V1 remains immutable and intact
    const treeV1 = curriculumService.getTree(catalogV1.id, ownerActor);
    expect(treeV1[0]!.id).toBe(unit.id);
  });

  it('4. assigns catalog to group with strict cross-database scope validation', () => {
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
      ownerActor
    );
    createMinimalValidTree(catalogWrongGrade.id, ownerActor);
    curriculumService.publishCatalog(catalogWrongGrade.id, ownerActor);

    // Assigning wrong grade catalog must throw SCOPE_MISMATCH
    expect(() =>
      curriculumService.assignGroupCatalog(
        {
          groupId: group.id,
          catalogId: catalogWrongGrade.id,
        },
        ownerActor
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
      ownerActor
    );
    createMinimalValidTree(catalogMatching.id, ownerActor);

    // Still DRAFT:
    expect(() =>
      curriculumService.assignGroupCatalog(
        {
          groupId: group.id,
          catalogId: catalogMatching.id,
        },
        ownerActor
      )
    ).toThrowError(/Cannot assign an unready draft catalog/);

    // Publish matching catalog
    curriculumService.publishCatalog(catalogMatching.id, ownerActor);

    // Now assignment succeeds
    const assignment = curriculumService.assignGroupCatalog(
      {
        groupId: group.id,
        catalogId: catalogMatching.id,
        notes: 'تم اعتماد منهج الجبر للمجموعة',
      },
      ownerActor
    );

    expect(assignment.groupId).toBe(group.id);
    expect(assignment.catalogId).toBe(catalogMatching.id);

    // Academic audit logged with authoritative fullName
    const academicAudits = academicAuditRepo.findByEntity('GROUP_CURRICULUM_ASSIGNMENT', assignment.id);
    expect(academicAudits.length).toBe(1);
    expect(academicAudits[0]!.action).toBe('GROUP_CURRICULUM_ASSIGNED');
    expect(academicAudits[0]!.actorNameSnapshot).toBe('الأستاذ أحمد');
  });

  it('5. tracks group progress, computes skill denominator, and derives pacing projection', () => {
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
      ownerActor
    );

    const unit = curriculumService.createNode(
      { catalogId: catalog.id, tier: 'UNIT', titleAr: 'الوحدة 1', code: 'U1' },
      ownerActor
    );
    const lesson = curriculumService.createNode(
      { catalogId: catalog.id, parentId: unit.id, tier: 'LESSON', titleAr: 'الدرس 1', code: 'L1' },
      ownerActor
    );
    const concept = curriculumService.createNode(
      { catalogId: catalog.id, parentId: lesson.id, tier: 'CONCEPT', titleAr: 'المفهوم 1', code: 'C1' },
      ownerActor
    );

    // 4 Skills
    const skill1 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: concept.id, tier: 'SKILL', titleAr: 'مهارة 1', code: 'S1' },
      ownerActor
    );
    const skill2 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: concept.id, tier: 'SKILL', titleAr: 'مهارة 2', code: 'S2' },
      ownerActor
    );
    const skill3 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: concept.id, tier: 'SKILL', titleAr: 'مهارة 3', code: 'S3' },
      ownerActor
    );
    const skill4 = curriculumService.createNode(
      { catalogId: catalog.id, parentId: concept.id, tier: 'SKILL', titleAr: 'مهارة 4', code: 'S4' },
      ownerActor
    );

    curriculumService.publishCatalog(catalog.id, ownerActor);
    curriculumService.assignGroupCatalog({ groupId: group.id, catalogId: catalog.id }, ownerActor);

    // Initial Overview (0 progress)
    const initialOverview = curriculumService.getGroupOverview(group.id, ownerActor);
    expect(initialOverview.totalSkills).toBe(4);
    expect(initialOverview.completedSkills).toBe(0);
    expect(initialOverview.remainingSkills).toBe(4);
    expect(initialOverview.completionPercentage).toBe(0);
    expect(initialOverview.projection.status).toBe('INSUFFICIENT_DATA');

    // Mark Skill 1 IN_PROGRESS, Skill 2 COMPLETED
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill1.id, status: 'IN_PROGRESS' },
      ownerActor
    );
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill2.id, status: 'COMPLETED' },
      ownerActor
    );

    const midOverview = curriculumService.getGroupOverview(group.id, ownerActor);
    expect(midOverview.completedSkills).toBe(1);
    expect(midOverview.inProgressSkills).toBe(1);
    expect(midOverview.remainingSkills).toBe(3);
    expect(midOverview.completionPercentage).toBe(25);

    // Progress map
    const map = curriculumService.getGroupProgressMap(group.id, ownerActor);
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

    const projectedOverview = curriculumService.getGroupOverview(group.id, ownerActor);
    // Neutral Informational Pacing per Product Owner decision
    expect(projectedOverview.projection.status).toBe('INSUFFICIENT_DATA');
    expect(projectedOverview.projection.completedSessionsCount).toBe(2);
    expect(projectedOverview.projection.skillsPerWeekRate).toBeGreaterThan(0);
    expect(projectedOverview.projection.projectedCompletionDate).toBeDefined();
    expect(projectedOverview.projection.messageAr).toContain('موعد الانتهاء التقديري');

    // Complete all remaining skills
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill1.id, status: 'COMPLETED' },
      ownerActor
    );
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill3.id, status: 'COMPLETED' },
      ownerActor
    );
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: skill4.id, status: 'COMPLETED' },
      ownerActor
    );

    const finalOverview = curriculumService.getGroupOverview(group.id, ownerActor);
    expect(finalOverview.completedSkills).toBe(4);
    expect(finalOverview.remainingSkills).toBe(0);
    expect(finalOverview.completionPercentage).toBe(100);
    expect(finalOverview.projection.status).toBe('COMPLETED');
    expect(finalOverview.projection.messageAr).toBe('تم إكمال جميع مهارات المنهج بنجاح');
  });

  it('6. rejects unauthorized assistant actors from mutating curriculum or group progress', () => {
    const assistantUnauthorized = {
      userId: 'usr-asst-1',
      fullName: 'مساعد غير مصرح',
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

  // =========================================================================
  // FOCUSED REGRESSION SUITE COVERING SUPERVISOR FINDINGS (1 - 8)
  // =========================================================================

  it('7. Finding 1: prevents data loss by rejecting catalog reassignment when progress exists without resetProgress: true', () => {
    // Setup group and Catalog 1
    const group = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة اختبار فقدان البيانات',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    const cat1 = curriculumService.createCatalog(
      { code: 'CAT-1', title: 'منهج 1', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    const tree1 = createMinimalValidTree(cat1.id, ownerActor);
    curriculumService.publishCatalog(cat1.id, ownerActor);
    curriculumService.assignGroupCatalog({ groupId: group.id, catalogId: cat1.id }, ownerActor);

    // Record progress on tree1.skill
    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: tree1.skill.id, status: 'COMPLETED' },
      ownerActor
    );
    expect(groupCurriculumRepo.countByGroup(group.id)).toBe(1);

    // Setup Catalog 2
    const cat2 = curriculumService.createCatalog(
      { code: 'CAT-2', title: 'منهج 2', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    createMinimalValidTree(cat2.id, ownerActor);
    curriculumService.publishCatalog(cat2.id, ownerActor);

    // Attempt reassignment WITHOUT resetProgress -> MUST THROW and PRESERVE progress
    expect(() =>
      curriculumService.assignGroupCatalog(
        { groupId: group.id, catalogId: cat2.id, resetProgress: false },
        ownerActor
      )
    ).toThrowError(/REASSIGNMENT_REQUIRES_RESET_CONFIRMATION/);

    // Verify assignment and progress were completely preserved
    const currentAssignment = groupCurriculumRepo.getAssignment(group.id);
    expect(currentAssignment?.catalogId).toBe(cat1.id);
    const preservedProgress = groupCurriculumRepo.getProgressByGroup(group.id);
    expect(preservedProgress.length).toBe(1);
    expect(preservedProgress[0]!.nodeId).toBe(tree1.skill.id);
    expect(preservedProgress[0]!.status).toBe('COMPLETED');
  });

  it('8. Finding 1b: safely reassigns catalog when resetProgress: true is explicitly provided', () => {
    const group = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة إعادة التعيين الصريحة',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    const cat1 = curriculumService.createCatalog(
      { code: 'CAT-1B-A', title: 'منهج قديم', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    const tree1 = createMinimalValidTree(cat1.id, ownerActor);
    curriculumService.publishCatalog(cat1.id, ownerActor);
    curriculumService.assignGroupCatalog({ groupId: group.id, catalogId: cat1.id }, ownerActor);

    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: tree1.skill.id, status: 'COMPLETED' },
      ownerActor
    );
    expect(groupCurriculumRepo.countByGroup(group.id)).toBe(1);

    const cat2 = curriculumService.createCatalog(
      { code: 'CAT-1B-B', title: 'منهج جديد', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    createMinimalValidTree(cat2.id, ownerActor);
    curriculumService.publishCatalog(cat2.id, ownerActor);

    // Reassign WITH resetProgress: true -> SUCCESS
    const newAssignment = curriculumService.assignGroupCatalog(
      { groupId: group.id, catalogId: cat2.id, resetProgress: true },
      ownerActor
    );
    expect(newAssignment.catalogId).toBe(cat2.id);
    // Old progress purged cleanly
    expect(groupCurriculumRepo.countByGroup(group.id)).toBe(0);

    // Audit logs document both the reset and assignment
    const audits = academicAuditRepo.findByEntity('GROUP_CURRICULUM_ASSIGNMENT', newAssignment.id);
    expect(audits.some((a) => a.action === 'GROUP_CURRICULUM_REASSIGNED_WITH_RESET')).toBe(true);
  });

  it('9. Finding 2: mutation and audit atomicity — domain mutation rolls back if audit insert fails', () => {
    const originalInsert = SystemAuditRepository.prototype.insert;
    try {
      SystemAuditRepository.prototype.insert = () => {
        throw new Error('SIMULATED_AUDIT_FAILURE');
      };

      // Attempt to create catalog -> audit fails -> catalog row must NOT be committed
      expect(() =>
        curriculumService.createCatalog(
          {
            code: 'CAT-ROLLBACK-TEST',
            title: 'منهج التراجع الذري',
            educationSystem: 'GENERAL',
            gradeLevel: 'PREP_1',
            languageTrack: 'ARABIC',
          },
          ownerActor
        )
      ).toThrowError(/SIMULATED_AUDIT_FAILURE/);

      // Check database directly: catalog must NOT exist
      const directQuery = catalogRepo.findByCode('CAT-ROLLBACK-TEST');
      expect(directQuery).toBeNull();
    } finally {
      SystemAuditRepository.prototype.insert = originalInsert;
    }
  });

  it('10. Finding 2b: academic reassignment atomicity — rolls back progress deletion if assignment fails', () => {
    const group = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة اختبار التراجع الأكاديمي',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    const cat1 = curriculumService.createCatalog(
      { code: 'CAT-ATOMIC-1', title: 'منهج 1', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    const tree1 = createMinimalValidTree(cat1.id, ownerActor);
    curriculumService.publishCatalog(cat1.id, ownerActor);
    curriculumService.assignGroupCatalog({ groupId: group.id, catalogId: cat1.id }, ownerActor);

    curriculumService.updateGroupNodeProgress(
      { groupId: group.id, nodeId: tree1.skill.id, status: 'COMPLETED' },
      ownerActor
    );
    expect(groupCurriculumRepo.countByGroup(group.id)).toBe(1);

    const cat2 = curriculumService.createCatalog(
      { code: 'CAT-ATOMIC-2', title: 'منهج 2', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    createMinimalValidTree(cat2.id, ownerActor);
    curriculumService.publishCatalog(cat2.id, ownerActor);

    const originalAcademicInsert = AcademicAuditRepository.prototype.insert;
    try {
      // Break AcademicAuditRepository to throw during reassignment audit insert
      AcademicAuditRepository.prototype.insert = () => {
        throw new Error('SIMULATED_ACADEMIC_AUDIT_CRASH');
      };

      expect(() =>
        curriculumService.assignGroupCatalog(
          { groupId: group.id, catalogId: cat2.id, resetProgress: true },
          ownerActor
        )
      ).toThrowError(/SIMULATED_ACADEMIC_AUDIT_CRASH/);

      // Progress MUST still be present because entire transaction was rolled back!
      expect(groupCurriculumRepo.countByGroup(group.id)).toBe(1);
      expect(groupCurriculumRepo.getAssignment(group.id)?.catalogId).toBe(cat1.id);
    } finally {
      AcademicAuditRepository.prototype.insert = originalAcademicInsert;
    }
  });

  it('11. Finding 3: uses authoritative actor fullName for audit snapshot and rejects missing role', () => {
    const actorWithFullName = {
      userId: 'usr-full-name-1',
      fullName: 'د. طه حسين',
      role: 'OWNER' as const,
      permissions: [],
    };

    const cat = curriculumService.createCatalog(
      {
        code: 'CAT-FULLNAME-TEST',
        title: 'منهج المؤلف الكامل',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'ARABIC',
      },
      actorWithFullName
    );

    const audits = systemAuditRepo.findByEntity('CURRICULUM_CATALOG', cat.id);
    expect(audits[0]!.actorNameSnapshot).toBe('د. طه حسين');

    // Missing role entirely throws PERMISSION_DENIED
    expect(() =>
      curriculumService.createCatalog(
        {
          code: 'CAT-NO-ROLE',
          title: 'منهج بلا دور',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_2',
          languageTrack: 'ARABIC',
        },
        { userId: 'usr-x', fullName: 'شخص مجهول' } as any
      )
    ).toThrowError(/PERMISSION_DENIED/);
  });

  it('12. Finding 4: enforces exact math branch scope matching (null only matches null)', () => {
    // Group with specific branch: ALGEBRA
    const groupAlgebra = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة الجبر فقط',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_3',
      languageTrack: 'ARABIC',
      focusMathBranch: 'ALGEBRA',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Unbranched catalog (mathBranch: null)
    const catUnbranched = curriculumService.createCatalog(
      {
        code: 'CAT-NOBRANCH',
        title: 'رياضيات عامة بدون فرع',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_3',
        languageTrack: 'ARABIC',
        mathBranch: null,
      },
      ownerActor
    );
    createMinimalValidTree(catUnbranched.id, ownerActor);
    curriculumService.publishCatalog(catUnbranched.id, ownerActor);

    // ALGEBRA group cannot be assigned unbranched catalog!
    expect(() =>
      curriculumService.assignGroupCatalog(
        { groupId: groupAlgebra.id, catalogId: catUnbranched.id },
        ownerActor
      )
    ).toThrowError(/math branch mismatch/);

    // Branched catalog: GEOMETRY
    const catGeometry = curriculumService.createCatalog(
      {
        code: 'CAT-GEOM',
        title: 'هندسة',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_3',
        languageTrack: 'ARABIC',
        mathBranch: 'GEOMETRY',
      },
      ownerActor
    );
    createMinimalValidTree(catGeometry.id, ownerActor);
    curriculumService.publishCatalog(catGeometry.id, ownerActor);

    // ALGEBRA group cannot be assigned GEOMETRY catalog!
    expect(() =>
      curriculumService.assignGroupCatalog(
        { groupId: groupAlgebra.id, catalogId: catGeometry.id },
        ownerActor
      )
    ).toThrowError(/math branch mismatch/);

    // Group with NULL branch cannot be assigned ALGEBRA catalog!
    const groupUnbranched = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة بدون فرع',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_3',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    expect(() =>
      curriculumService.assignGroupCatalog(
        { groupId: groupUnbranched.id, catalogId: catGeometry.id },
        ownerActor
      )
    ).toThrowError(/math branch mismatch/);

    // But unbranched group CAN be assigned unbranched catalog!
    const assignSuccess = curriculumService.assignGroupCatalog(
      { groupId: groupUnbranched.id, catalogId: catUnbranched.id },
      ownerActor
    );
    expect(assignSuccess.catalogId).toBe(catUnbranched.id);
  });

  it('13. Finding 5: unbranched catalog scope uniqueness and revision versioning', () => {
    // Create unbranched catalog V1
    const catV1 = curriculumService.createCatalog(
      {
        code: 'CAT-UNBRANCH-V1',
        title: 'منهج بلا فرع V1',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
        mathBranch: null,
      },
      ownerActor
    );
    expect(catV1.version).toBe(1);

    // Attempting to create duplicate unbranched catalog in same scope with same version directly must violate unique index
    expect(() =>
      catalogRepo.create({
        id: 'cat-unbranch-dup',
        code: 'CAT-UNBRANCH-DUP',
        title: 'تكرار غير مسموح',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
        mathBranch: null,
        version: 1, // Same unbranched scope and same version!
        status: 'DRAFT',
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ).toThrowError(/UNIQUE constraint failed/);

    // Complete tree and revise V1 to produce V2
    createMinimalValidTree(catV1.id, ownerActor);
    curriculumService.publishCatalog(catV1.id, ownerActor);

    const catV2 = curriculumService.reviseCatalog(catV1.id, ownerActor);
    expect(catV2.version).toBe(2);
    expect(catV2.mathBranch).toBeNull();
  });

  it('14. Finding 6a: strictly rejects SKILL directly under LESSON', () => {
    const cat = curriculumService.createCatalog(
      { code: 'CAT-STRICT-TIER', title: 'منهج اختبار التدرج', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );

    const unit = curriculumService.createNode(
      { catalogId: cat.id, tier: 'UNIT', titleAr: 'وحدة', code: 'U' },
      ownerActor
    );
    const lesson = curriculumService.createNode(
      { catalogId: cat.id, parentId: unit.id, tier: 'LESSON', titleAr: 'درس', code: 'L' },
      ownerActor
    );

    // SKILL directly under LESSON must fail with INVALID_PARENT_TIER
    expect(() =>
      curriculumService.createNode(
        { catalogId: cat.id, parentId: lesson.id, tier: 'SKILL', titleAr: 'مهارة مباشرة', code: 'S-DIRECT' },
        ownerActor
      )
    ).toThrowError(/SKILL parent must be a CONCEPT/);
  });

  it('15. Finding 6b: strictly rejects progress updates for non-SKILL nodes', () => {
    const group = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة اختبار تقدم الفئات',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    const cat = curriculumService.createCatalog(
      { code: 'CAT-NONSKILL', title: 'منهج غير مهاري', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    const { unit, lesson, concept } = createMinimalValidTree(cat.id, ownerActor);
    curriculumService.publishCatalog(cat.id, ownerActor);
    curriculumService.assignGroupCatalog({ groupId: group.id, catalogId: cat.id }, ownerActor);

    // Attempting progress update on UNIT -> INVALID_NODE_TIER
    expect(() =>
      curriculumService.updateGroupNodeProgress(
        { groupId: group.id, nodeId: unit.id, status: 'COMPLETED' },
        ownerActor
      )
    ).toThrowError(/Progress tracking is only supported for SKILL tier nodes/);

    // Attempting progress update on LESSON -> INVALID_NODE_TIER
    expect(() =>
      curriculumService.updateGroupNodeProgress(
        { groupId: group.id, nodeId: lesson.id, status: 'COMPLETED' },
        ownerActor
      )
    ).toThrowError(/Progress tracking is only supported for SKILL tier nodes/);

    // Attempting progress update on CONCEPT -> INVALID_NODE_TIER
    expect(() =>
      curriculumService.updateGroupNodeProgress(
        { groupId: group.id, nodeId: concept.id, status: 'COMPLETED' },
        ownerActor
      )
    ).toThrowError(/Progress tracking is only supported for SKILL tier nodes/);
  });

  it('16. Finding 6c: deleteNode cascades to all descendant nodes and leaves zero orphans', () => {
    const cat = curriculumService.createCatalog(
      { code: 'CAT-CASCADE', title: 'منهج اختبار الحذف المتسلسل', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );
    const { unit, lesson, concept, skill } = createMinimalValidTree(cat.id, ownerActor);

    // Deleting the UNIT must cascade and delete LESSON, CONCEPT, and SKILL
    const deletedCount = curriculumService.deleteNode(unit.id, ownerActor);
    expect(deletedCount).toBe(4);

    // Verify all 4 nodes are gone from DB
    expect(nodeRepo.findById(unit.id)).toBeNull();
    expect(nodeRepo.findById(lesson.id)).toBeNull();
    expect(nodeRepo.findById(concept.id)).toBeNull();
    expect(nodeRepo.findById(skill.id)).toBeNull();
  });

  it('17. Finding 6d: publishCatalog validates complete, acyclic tree (not merely nodeCount > 0)', () => {
    const cat = curriculumService.createCatalog(
      { code: 'CAT-INCOMPLETE', title: 'منهج غير مكتمل', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );

    // Empty catalog
    expect(() => curriculumService.publishCatalog(cat.id, ownerActor)).toThrowError(
      /Cannot publish an empty catalog/
    );

    // Catalog with only UNIT
    const unit = curriculumService.createNode(
      { catalogId: cat.id, tier: 'UNIT', titleAr: 'وحدة فقط', code: 'U' },
      ownerActor
    );
    expect(() => curriculumService.publishCatalog(cat.id, ownerActor)).toThrowError(
      /has no LESSON modules/
    );

    // UNIT with LESSON but no CONCEPT
    const lesson = curriculumService.createNode(
      { catalogId: cat.id, parentId: unit.id, tier: 'LESSON', titleAr: 'درس بلا مفهوم', code: 'L' },
      ownerActor
    );
    expect(() => curriculumService.publishCatalog(cat.id, ownerActor)).toThrowError(
      /has no CONCEPT items/
    );

    // LESSON with CONCEPT but no SKILL
    const concept = curriculumService.createNode(
      { catalogId: cat.id, parentId: lesson.id, tier: 'CONCEPT', titleAr: 'مفهوم بلا مهارة', code: 'C' },
      ownerActor
    );
    expect(() => curriculumService.publishCatalog(cat.id, ownerActor)).toThrowError(
      /has no measurable SKILL items/
    );

    // Once SKILL is added, publishing succeeds
    curriculumService.createNode(
      { catalogId: cat.id, parentId: concept.id, tier: 'SKILL', titleAr: 'مهارة تكتمل بها الشجرة', code: 'S' },
      ownerActor
    );
    const pub = curriculumService.publishCatalog(cat.id, ownerActor);
    expect(pub.status).toBe('PUBLISHED');
  });

  it('18. Finding 6e: reorderNodes enforces transaction, rejects cross-parent batches and duplicate orders', () => {
    const cat = curriculumService.createCatalog(
      { code: 'CAT-REORDER', title: 'منهج الترتيب', educationSystem: 'GENERAL', gradeLevel: 'PREP_1', languageTrack: 'ARABIC' },
      ownerActor
    );

    const u1 = curriculumService.createNode(
      { catalogId: cat.id, tier: 'UNIT', titleAr: 'وحدة 1', code: 'U1' },
      ownerActor
    );
    const u2 = curriculumService.createNode(
      { catalogId: cat.id, tier: 'UNIT', titleAr: 'وحدة 2', code: 'U2' },
      ownerActor
    );
    const l1 = curriculumService.createNode(
      { catalogId: cat.id, parentId: u1.id, tier: 'LESSON', titleAr: 'درس 1 في وحدة 1', code: 'L1' },
      ownerActor
    );

    // Duplicate order indices must be rejected
    expect(() =>
      curriculumService.reorderNodes(
        cat.id,
        [
          { id: u1.id, orderIndex: 1 },
          { id: u2.id, orderIndex: 1 },
        ],
        ownerActor
      )
    ).toThrowError(/Duplicate orderIndex/);

    // Cross-parent nodes in same reorder batch must be rejected (u1 parent is null, l1 parent is u1)
    expect(() =>
      curriculumService.reorderNodes(
        cat.id,
        [
          { id: u1.id, orderIndex: 0 },
          { id: l1.id, orderIndex: 1 },
        ],
        ownerActor
      )
    ).toThrowError(/same parent node/);

    // Unknown node ID rejected
    expect(() =>
      curriculumService.reorderNodes(
        cat.id,
        [
          { id: u1.id, orderIndex: 0 },
          { id: '00000000-0000-0000-0000-000000000000', orderIndex: 1 },
        ],
        ownerActor
      )
    ).toThrowError(/do not belong to catalog/);

    // Valid reorder succeeds
    curriculumService.reorderNodes(
      cat.id,
      [
        { id: u1.id, orderIndex: 1 },
        { id: u2.id, orderIndex: 0 },
      ],
      ownerActor
    );
    const tree = curriculumService.getTree(cat.id, ownerActor);
    expect(tree[0]!.id).toBe(u2.id);
    expect(tree[1]!.id).toBe(u1.id);
  });

  it('19. Finding 7: getGroupOverview throws CATALOG_INTEGRITY_ERROR when assigned catalog is missing or unpublished', () => {
    const group = groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة سلامة المنهج',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      focusMathBranch: null,
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 200,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Manually insert an assignment referencing a non-existent catalog ID
    groupCurriculumRepo.assignCatalog({
      id: 'asgn-broken',
      groupId: group.id,
      catalogId: '99999999-9999-9999-9999-999999999999',
      catalogVersion: 1,
      assignedByUserId: 'usr-admin',
      assignedByNameSnapshot: 'مدير النظام',
      assignedAt: '2026-09-20T00:00:00.000Z',
      notes: null,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    expect(() => curriculumService.getGroupOverview(group.id, ownerActor)).toThrowError(
      /CATALOG_INTEGRITY_ERROR/
    );
  });

  it('20. Requires complete authenticated actor (userId, fullName, role) for protected methods', () => {
    // Incomplete actor: missing userId
    const incompleteActor1 = { fullName: 'أحمد', role: 'OWNER' as const, permissions: [] };
    expect(() =>
      curriculumService.listCatalogs(undefined, incompleteActor1 as any)
    ).toThrowError(/PERMISSION_DENIED.*Complete authenticated actor/);

    // Incomplete actor: missing fullName
    const incompleteActor2 = { userId: 'usr-1', role: 'OWNER' as const, permissions: [] };
    expect(() =>
      curriculumService.listCatalogs(undefined, incompleteActor2 as any)
    ).toThrowError(/PERMISSION_DENIED.*Complete authenticated actor/);

    // Incomplete actor: missing role
    const incompleteActor3 = { userId: 'usr-1', fullName: 'أحمد', permissions: [] };
    expect(() =>
      curriculumService.listCatalogs(undefined, incompleteActor3 as any)
    ).toThrowError(/PERMISSION_DENIED.*Complete authenticated actor/);
  });

  it('21. Preserves titleEn and metadataJson when cloning nodes in reviseCatalog', () => {
    const cat = curriculumService.createCatalog(
      {
        code: 'CAT-CLONE-TEST',
        title: 'منهج استنساخ الحقول',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'LANG_ENGLISH',
        mathBranch: null,
      },
      ownerActor
    );

    const unit = curriculumService.createNode(
      {
        catalogId: cat.id,
        tier: 'UNIT',
        code: 'U1',
        titleAr: 'الوحدة الأولى',
        titleEn: 'Unit One: Foundations',
        metadataJson: JSON.stringify({ hours: 12 }),
      },
      ownerActor
    );

    const lesson = curriculumService.createNode(
      {
        catalogId: cat.id,
        parentId: unit.id,
        tier: 'LESSON',
        code: 'L1',
        titleAr: 'الدرس الأول',
        titleEn: 'Lesson 1: Intro',
        metadataJson: JSON.stringify({ difficulty: 'easy' }),
      },
      ownerActor
    );

    const concept = curriculumService.createNode(
      {
        catalogId: cat.id,
        parentId: lesson.id,
        tier: 'CONCEPT',
        code: 'C1',
        titleAr: 'المفهوم الأول',
        titleEn: 'Concept 1',
        metadataJson: null,
      },
      ownerActor
    );

    curriculumService.createNode(
      {
        catalogId: cat.id,
        parentId: concept.id,
        tier: 'SKILL',
        code: 'S1',
        titleAr: 'المهارة الأولى',
        titleEn: 'Skill 1: Precision',
        metadataJson: JSON.stringify({ points: 10 }),
      },
      ownerActor
    );

    // Publish then revise
    curriculumService.publishCatalog(cat.id, ownerActor);
    const revised = curriculumService.reviseCatalog(cat.id, ownerActor);
    expect(revised.version).toBe(2);

    const revisedTree = curriculumService.getTree(revised.id, ownerActor);
    expect(revisedTree).toHaveLength(1);
    const clonedUnit = revisedTree[0]!;
    expect(clonedUnit.titleEn).toBe('Unit One: Foundations');
    expect(clonedUnit.metadataJson).toBe(JSON.stringify({ hours: 12 }));

    const clonedLesson = clonedUnit.children[0]!;
    expect(clonedLesson.titleEn).toBe('Lesson 1: Intro');
    expect(clonedLesson.metadataJson).toBe(JSON.stringify({ difficulty: 'easy' }));

    const clonedConcept = clonedLesson.children[0]!;
    expect(clonedConcept.titleEn).toBe('Concept 1');

    const clonedSkill = clonedConcept.children[0]!;
    expect(clonedSkill.titleEn).toBe('Skill 1: Precision');
    expect(clonedSkill.metadataJson).toBe(JSON.stringify({ points: 10 }));
  });

  it('22. Publication validates complete reachability and rejects disconnected nodes or non-UNIT roots', () => {
    const cat = curriculumService.createCatalog(
      {
        code: 'CAT-DISCONNECTED',
        title: 'منهج غير مكتمل الشجرة',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_2',
        languageTrack: 'ARABIC',
      },
      ownerActor
    );

    // Case A: Root node is NOT a unit
    nodeRepo.create({
      id: crypto.randomUUID(),
      catalogId: cat.id,
      parentId: null,
      tier: 'LESSON',
      titleAr: 'درس بدون وحدة جذرية',
      code: 'ORPHAN-L',
      orderIndex: 0,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    expect(() => curriculumService.publishCatalog(cat.id, ownerActor)).toThrowError(
      /All root nodes must be UNIT tier/
    );

    // Clean up and test Case B: Valid tree exists + disconnected node
    nodeRepo.deleteBatch(nodeRepo.findByCatalogId(cat.id).map((n) => n.id));

    const u = curriculumService.createNode({ catalogId: cat.id, tier: 'UNIT', code: 'U1', titleAr: 'و1' }, ownerActor);
    const l = curriculumService.createNode({ catalogId: cat.id, parentId: u.id, tier: 'LESSON', code: 'L1', titleAr: 'د1' }, ownerActor);
    const c = curriculumService.createNode({ catalogId: cat.id, parentId: l.id, tier: 'CONCEPT', code: 'C1', titleAr: 'م1' }, ownerActor);
    curriculumService.createNode({ catalogId: cat.id, parentId: c.id, tier: 'SKILL', code: 'S1', titleAr: 'مها1' }, ownerActor);

    // Injected disconnected node with fake parentId
    nodeRepo.create({
      id: crypto.randomUUID(),
      catalogId: cat.id,
      parentId: 'fake-parent-id',
      tier: 'SKILL',
      titleAr: 'مهارة يتيمة',
      code: 'ORPHAN-S',
      orderIndex: 99,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    expect(() => curriculumService.publishCatalog(cat.id, ownerActor)).toThrowError(
      /references a non-existent parent/
    );
  });

  it('23. Reordering rejects order collisions with omitted unchanged siblings', () => {
    const cat = curriculumService.createCatalog(
      {
        code: 'CAT-REORDER-SIBLING',
        title: 'منهج اختبار تصادم الترتيب',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_3',
        languageTrack: 'ARABIC',
      },
      ownerActor
    );

    const u1 = curriculumService.createNode({ catalogId: cat.id, tier: 'UNIT', code: 'U1', titleAr: 'و1', orderIndex: 0 }, ownerActor);
    curriculumService.createNode({ catalogId: cat.id, tier: 'UNIT', code: 'U2', titleAr: 'و2', orderIndex: 1 }, ownerActor);
    curriculumService.createNode({ catalogId: cat.id, tier: 'UNIT', code: 'U3', titleAr: 'و3', orderIndex: 2 }, ownerActor);

    // Try to reorder only u1 to position 1 without moving u2. Position 1 is already occupied by u2!
    expect(() =>
      curriculumService.reorderNodes(
        {
          catalogId: cat.id,
          items: [{ id: u1.id, orderIndex: 1 }],
        },
        ownerActor
      )
    ).toThrowError(/Reorder collision: position '1' would be occupied by multiple sibling nodes/);
  });

  it('26. rejects createNode with orderIndex occupied by an existing sibling', () => {
    const cat = curriculumService.createCatalog(
      {
        code: 'CAT-COLL-CREATE',
        title: 'Collision Create Test',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
      },
      ownerActor
    );

    curriculumService.createNode(
      { catalogId: cat.id, tier: 'UNIT', code: 'U1', titleAr: 'وحدة 1', orderIndex: 0 },
      ownerActor
    );

    expect(() =>
      curriculumService.createNode(
        { catalogId: cat.id, tier: 'UNIT', code: 'U2', titleAr: 'وحدة 2', orderIndex: 0 },
        ownerActor
      )
    ).toThrowError(/Reorder collision: position '0' would be occupied by multiple sibling nodes/);
  });

  it('27. rejects updateNode with orderIndex occupied by another sibling', () => {
    const cat = curriculumService.createCatalog(
      {
        code: 'CAT-COLL-UPDATE',
        title: 'Collision Update Test',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
      },
      ownerActor
    );

    const u1 = curriculumService.createNode(
      { catalogId: cat.id, tier: 'UNIT', code: 'U1', titleAr: 'وحدة 1', orderIndex: 0 },
      ownerActor
    );
    curriculumService.createNode(
      { catalogId: cat.id, tier: 'UNIT', code: 'U2', titleAr: 'وحدة 2', orderIndex: 1 },
      ownerActor
    );

    // Updating u1 to orderIndex 1 should collide with u2
    expect(() =>
      curriculumService.updateNode(
        u1.id,
        { orderIndex: 1 },
        ownerActor
      )
    ).toThrowError(/Reorder collision: position '1' would be occupied by multiple sibling nodes/);

    // Updating u1 to its current orderIndex 0 should succeed without error
    const unchanged = curriculumService.updateNode(
      u1.id,
      { orderIndex: 0, titleAr: 'وحدة 1 المحدثة' },
      ownerActor
    );
    expect(unchanged.titleAr).toBe('وحدة 1 المحدثة');
  });
});
