import { describe, it, expect } from 'vitest';
import {
  CurriculumCatalogStatusSchema,
  CurriculumNodeTierSchema,
  CurriculumProgressStatusSchema,
  CreateCurriculumCatalogSchema,
  CreateCurriculumNodeSchema,
  CurriculumTreeNodeDtoSchema,
  AssignGroupCatalogSchema,
  UpdateGroupNodeProgressSchema,
  GroupCurriculumOverviewDtoSchema,
} from '../src/index.js';

describe('Curriculum Contracts & Enums', () => {
  it('validates curriculum catalog statuses', () => {
    expect(CurriculumCatalogStatusSchema.safeParse('DRAFT').success).toBe(true);
    expect(CurriculumCatalogStatusSchema.safeParse('PUBLISHED').success).toBe(true);
    expect(CurriculumCatalogStatusSchema.safeParse('ARCHIVED').success).toBe(true);
    expect(CurriculumCatalogStatusSchema.safeParse('UNKNOWN').success).toBe(false);
  });

  it('validates curriculum node tiers', () => {
    expect(CurriculumNodeTierSchema.safeParse('UNIT').success).toBe(true);
    expect(CurriculumNodeTierSchema.safeParse('LESSON').success).toBe(true);
    expect(CurriculumNodeTierSchema.safeParse('CONCEPT').success).toBe(true);
    expect(CurriculumNodeTierSchema.safeParse('SKILL').success).toBe(true);
    expect(CurriculumNodeTierSchema.safeParse('MODULE').success).toBe(false);
  });

  it('validates curriculum progress statuses', () => {
    expect(CurriculumProgressStatusSchema.safeParse('NOT_STARTED').success).toBe(true);
    expect(CurriculumProgressStatusSchema.safeParse('IN_PROGRESS').success).toBe(true);
    expect(CurriculumProgressStatusSchema.safeParse('COMPLETED').success).toBe(true);
    expect(CurriculumProgressStatusSchema.safeParse('DONE').success).toBe(false);
  });

  it('validates CreateCurriculumCatalogSchema constraints', () => {
    const valid = {
      code: 'MATH-PREP1-2026',
      title: 'منهج الرياضيات - الصف الأول الإعدادي',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      mathBranch: 'GENERAL_MATH',
      description: 'المنهج الرسمي المعتمد',
    };
    expect(CreateCurriculumCatalogSchema.safeParse(valid).success).toBe(true);

    // Invalid code characters (spaces not allowed)
    expect(
      CreateCurriculumCatalogSchema.safeParse({
        ...valid,
        code: 'INVALID CODE WITH SPACES',
      }).success
    ).toBe(false);

    // Invalid system
    expect(
      CreateCurriculumCatalogSchema.safeParse({
        ...valid,
        educationSystem: 'CAMBRIDGE',
      }).success
    ).toBe(false);

    // Invalid track (LANGUAGES does not exist; LANG_ENGLISH is canonical)
    expect(
      CreateCurriculumCatalogSchema.safeParse({
        ...valid,
        languageTrack: 'LANGUAGES',
      }).success
    ).toBe(false);
  });

  it('validates CreateCurriculumNodeSchema constraints', () => {
    const validNode = {
      catalogId: '11111111-1111-1111-1111-111111111111',
      parentId: null,
      tier: 'UNIT',
      titleAr: 'الوحدة الأولى: الأعداد والعمليات',
      titleEn: 'Unit 1: Numbers and Operations',
      code: 'U1',
      orderIndex: 0,
    };
    expect(CreateCurriculumNodeSchema.safeParse(validNode).success).toBe(true);

    // Missing Arabic title
    expect(
      CreateCurriculumNodeSchema.safeParse({
        ...validNode,
        titleAr: '',
      }).success
    ).toBe(false);
  });

  it('validates recursive CurriculumTreeNodeDtoSchema', () => {
    const tree = {
      id: '11111111-1111-1111-1111-111111111111',
      catalogId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      parentId: null,
      tier: 'UNIT',
      titleAr: 'الوحدة الأولى',
      titleEn: 'Unit 1',
      code: 'U1',
      orderIndex: 0,
      description: null,
      metadataJson: null,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
      children: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          catalogId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          parentId: '11111111-1111-1111-1111-111111111111',
          tier: 'LESSON',
          titleAr: 'الدرس الأول: مجموعة الأعداد النسبية',
          titleEn: 'Lesson 1: Rational Numbers',
          code: 'L1',
          orderIndex: 0,
          description: null,
          metadataJson: null,
          createdAt: '2026-09-20T00:00:00.000Z',
          updatedAt: '2026-09-20T00:00:00.000Z',
          children: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              catalogId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              parentId: '22222222-2222-2222-2222-222222222222',
              tier: 'SKILL',
              titleAr: 'تمييز العدد النسبي وكتابته في أبسط صورة',
              titleEn: 'Identify and simplify rational numbers',
              code: 'S1',
              orderIndex: 0,
              description: null,
              metadataJson: null,
              createdAt: '2026-09-20T00:00:00.000Z',
              updatedAt: '2026-09-20T00:00:00.000Z',
              children: [],
            },
          ],
        },
      ],
    };

    const parseResult = CurriculumTreeNodeDtoSchema.safeParse(tree);
    expect(parseResult.success).toBe(true);
  });

  it('validates AssignGroupCatalogSchema and UpdateGroupNodeProgressSchema', () => {
    expect(
      AssignGroupCatalogSchema.safeParse({
        groupId: '11111111-1111-1111-1111-111111111111',
        catalogId: '22222222-2222-2222-2222-222222222222',
      }).success
    ).toBe(true);

    expect(
      UpdateGroupNodeProgressSchema.safeParse({
        groupId: '11111111-1111-1111-1111-111111111111',
        nodeId: '33333333-3333-3333-3333-333333333333',
        status: 'COMPLETED',
        notes: 'تم إنهاء الشرح والتدريبات',
      }).success
    ).toBe(true);
  });

  it('validates GroupCurriculumOverviewDtoSchema', () => {
    const overview = {
      assignment: {
        id: '11111111-1111-1111-1111-111111111111',
        groupId: '22222222-2222-2222-2222-222222222222',
        catalogId: '33333333-3333-3333-3333-333333333333',
        catalogVersion: 1,
        assignedAt: '2026-09-20T00:00:00.000Z',
        assignedByUserId: '44444444-4444-4444-4444-444444444444',
        assignedByNameSnapshot: 'أستاذ المادة',
        notes: null,
        createdAt: '2026-09-20T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
      },
      catalog: {
        id: '33333333-3333-3333-3333-333333333333',
        code: 'CAT-PREP1-ALG',
        title: 'جبر الصف الأول الإعدادي',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
        mathBranch: 'ALGEBRA',
        version: 1,
        status: 'PUBLISHED',
        publishedAt: '2026-09-20T00:00:00.000Z',
        description: null,
        createdAt: '2026-09-20T00:00:00.000Z',
        updatedAt: '2026-09-20T00:00:00.000Z',
      },
      totalSkills: 20,
      completedSkills: 10,
      inProgressSkills: 2,
      remainingSkills: 10,
      completionPercentage: 50.0,
      projection: {
        status: 'ON_TRACK',
        messageAr: 'التقدم يسير وفق المعدل المتوقع',
        completedSessionsCount: 4,
        skillsPerWeekRate: 2.5,
        projectedCompletionDate: '2026-11-15',
      },
    };

    expect(GroupCurriculumOverviewDtoSchema.safeParse(overview).success).toBe(true);
  });
});
