import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openSystemDatabase,
  openAcademicDatabase,
  closeAllDatabases,
  CurriculumCatalogRepository,
  CurriculumNodeRepository,
  GroupCurriculumRepository,
  GroupRepository,
} from '../src/index.js';

describe('Curriculum Repositories (Database Layer)', () => {
  let catalogRepo: CurriculumCatalogRepository;
  let nodeRepo: CurriculumNodeRepository;
  let groupCurriculumRepo: GroupCurriculumRepository;
  let groupRepo: GroupRepository;

  beforeEach(() => {
    closeAllDatabases();

    const sysConn = openSystemDatabase({ filePath: ':memory:', autoMigrate: true });
    const acadConn = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });

    catalogRepo = new CurriculumCatalogRepository(sysConn.db);
    nodeRepo = new CurriculumNodeRepository(sysConn.db);
    groupCurriculumRepo = new GroupCurriculumRepository(acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
  });

  it('1. inserts, queries, updates and filters curriculum catalogs in system DB', () => {
    const catalog1 = catalogRepo.create({
      id: '11111111-1111-1111-1111-111111111111',
      code: 'CAT-GEN-PREP1-ALG-V1',
      title: 'منهج الجبر - الصف الأول الإعدادي',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      mathBranch: 'ALGEBRA',
      version: 1,
      status: 'DRAFT',
      publishedAt: null,
      description: 'المسودة الأولى للمنهج',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    expect(catalog1.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(catalog1.status).toBe('DRAFT');

    // Find by ID
    const foundById = catalogRepo.findById(catalog1.id);
    expect(foundById?.code).toBe('CAT-GEN-PREP1-ALG-V1');

    // Find by Code
    const foundByCode = catalogRepo.findByCode('CAT-GEN-PREP1-ALG-V1', 1);
    expect(foundByCode?.id).toBe(catalog1.id);

    // Find by Scope
    const foundByScope = catalogRepo.findByScope('GENERAL', 'PREP_1', 'ARABIC', 'ALGEBRA', 1);
    expect(foundByScope?.id).toBe(catalog1.id);

    // Update title & status
    const updated = catalogRepo.update(catalog1.id, {
      status: 'PUBLISHED',
      publishedAt: '2026-09-20T01:00:00.000Z',
    });
    expect(updated.status).toBe('PUBLISHED');
    expect(updated.publishedAt).toBe('2026-09-20T01:00:00.000Z');

    // List with filter
    const listPublished = catalogRepo.list({ status: 'PUBLISHED' });
    expect(listPublished.length).toBe(1);

    const listDraft = catalogRepo.list({ status: 'DRAFT' });
    expect(listDraft.length).toBe(0);
  });

  it('2. enforces unique constraint on (educationSystem, gradeLevel, languageTrack, mathBranch, version)', () => {
    catalogRepo.create({
      id: '11111111-1111-1111-1111-111111111111',
      code: 'CAT-1',
      title: 'منهج 1',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      mathBranch: 'ALGEBRA',
      version: 1,
      status: 'DRAFT',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Attempt to insert duplicate scope & version
    expect(() => {
      catalogRepo.create({
        id: '22222222-2222-2222-2222-222222222222',
        code: 'CAT-2',
        title: 'منهج 2 مكرر',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
        mathBranch: 'ALGEBRA',
        version: 1,
        status: 'DRAFT',
        createdAt: '2026-09-20T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
      });
    }).toThrow();
  });

  it('3. creates, queries, counts, reorders and cascades curriculum nodes in system DB', () => {
    const catalog = catalogRepo.create({
      id: 'cat-001',
      code: 'CAT-TREE-TEST',
      title: 'منهج الاختبار',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'LANG_ENGLISH',
      mathBranch: null,
      version: 1,
      status: 'DRAFT',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Create Unit (parent = null)
    const unit1 = nodeRepo.create({
      id: 'node-u1',
      catalogId: catalog.id,
      parentId: null,
      tier: 'UNIT',
      titleAr: 'الوحدة 1',
      titleEn: 'Unit 1',
      code: 'U1',
      orderIndex: 0,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Create Lesson under Unit
    const lesson1 = nodeRepo.create({
      id: 'node-l1',
      catalogId: catalog.id,
      parentId: unit1.id,
      tier: 'LESSON',
      titleAr: 'الدرس 1',
      titleEn: 'Lesson 1',
      code: 'L1',
      orderIndex: 0,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Create 2 Skills under Lesson
    const skill1 = nodeRepo.create({
      id: 'node-s1',
      catalogId: catalog.id,
      parentId: lesson1.id,
      tier: 'SKILL',
      titleAr: 'المهارة 1',
      titleEn: 'Skill 1',
      code: 'S1',
      orderIndex: 0,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    const skill2 = nodeRepo.create({
      id: 'node-s2',
      catalogId: catalog.id,
      parentId: lesson1.id,
      tier: 'SKILL',
      titleAr: 'المهارة 2',
      titleEn: 'Skill 2',
      code: 'S2',
      orderIndex: 1,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    expect(nodeRepo.countByCatalogId(catalog.id)).toBe(4);
    expect(nodeRepo.countSkillsByCatalogId(catalog.id)).toBe(2);

    // Query children of unit1
    const unitChildren = nodeRepo.findByParentId(catalog.id, unit1.id);
    expect(unitChildren.length).toBe(1);
    expect(unitChildren[0]!.id).toBe(lesson1.id);

    // Reorder skills
    nodeRepo.reorder(catalog.id, [
      { id: skill1.id, orderIndex: 1 },
      { id: skill2.id, orderIndex: 0 },
    ]);

    const lessonChildren = nodeRepo.findByParentId(catalog.id, lesson1.id);
    expect(lessonChildren[0]!.id).toBe(skill2.id);
    expect(lessonChildren[1]!.id).toBe(skill1.id);
  });

  it('4. manages group curriculum assignment and progress tracking in academic DB', () => {
    const group = groupRepo.create({
      id: 'grp-001',
      name: 'مجموعة الأحد والثلاثاء',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      focusMathBranch: 'ALGEBRA',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 300,
      status: 'ACTIVE',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    // Assign catalog to group
    const assignment = groupCurriculumRepo.assignCatalog({
      id: 'assign-001',
      groupId: group.id,
      catalogId: 'cat-sys-001',
      catalogVersion: 1,
      assignedAt: '2026-09-20T00:00:00.000Z',
      assignedByUserId: 'user-001',
      assignedByNameSnapshot: 'أستاذ أحمد',
      notes: 'المنهج الافتراضي للعام',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    expect(assignment.groupId).toBe(group.id);
    expect(assignment.catalogId).toBe('cat-sys-001');

    // Retrieve assignment
    const retrieved = groupCurriculumRepo.getAssignment(group.id);
    expect(retrieved?.id).toBe(assignment.id);

    // Upsert node progress: IN_PROGRESS
    const prog1 = groupCurriculumRepo.upsertProgress({
      id: 'prog-001',
      groupId: group.id,
      catalogId: 'cat-sys-001',
      nodeId: 'node-s1',
      status: 'IN_PROGRESS',
      completedAt: null,
      updatedByUserId: 'user-001',
      updatedByNameSnapshot: 'أستاذ أحمد',
      notes: 'بدأ شرح المهارة',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });
    expect(prog1.status).toBe('IN_PROGRESS');
    expect(prog1.completedAt).toBeNull();

    // Mark COMPLETED
    const prog1Completed = groupCurriculumRepo.upsertProgress({
      id: 'prog-001',
      groupId: group.id,
      catalogId: 'cat-sys-001',
      nodeId: 'node-s1',
      status: 'COMPLETED',
      completedAt: '2026-09-20T02:00:00.000Z',
      updatedByUserId: 'user-001',
      updatedByNameSnapshot: 'أستاذ أحمد',
      notes: 'تم استيعاب المهارة بالكامل',
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T02:00:00.000Z',
    });
    expect(prog1Completed.status).toBe('COMPLETED');
    expect(prog1Completed.completedAt).toBe('2026-09-20T02:00:00.000Z');

    // Add another node IN_PROGRESS
    groupCurriculumRepo.upsertProgress({
      id: 'prog-002',
      groupId: group.id,
      catalogId: 'cat-sys-001',
      nodeId: 'node-s2',
      status: 'IN_PROGRESS',
      completedAt: null,
      updatedByUserId: 'user-001',
      updatedByNameSnapshot: 'أستاذ أحمد',
      notes: null,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    });

    const counts = groupCurriculumRepo.countProgressByStatus(group.id);
    expect(counts.completed).toBe(1);
    expect(counts.inProgress).toBe(1);
  });
});
