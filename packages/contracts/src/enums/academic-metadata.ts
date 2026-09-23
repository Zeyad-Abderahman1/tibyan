import {
  type EducationSystem,
  type GradeLevel,
  type LanguageTrack,
  type MathBranch,
} from './academic.js';

export interface GradeLevelDefinition {
  code: GradeLevel;
  nameAr: string;
  stage: 'PREPARATORY' | 'SECONDARY';
  order: number;
  educationSystems: EducationSystem[];
}

export interface EducationSystemDefinition {
  code: EducationSystem;
  nameAr: string;
  descriptionAr: string;
}

export interface LanguageTrackDefinition {
  code: LanguageTrack;
  nameAr: string;
}

export interface MathBranchDefinition {
  code: MathBranch;
  nameAr: string;
}

export const GRADE_LEVEL_DEFINITIONS: readonly GradeLevelDefinition[] = [
  {
    code: 'PREP_1',
    nameAr: 'الصف الأول الإعدادي',
    stage: 'PREPARATORY',
    order: 1,
    educationSystems: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'],
  },
  {
    code: 'PREP_2',
    nameAr: 'الصف الثاني الإعدادي',
    stage: 'PREPARATORY',
    order: 2,
    educationSystems: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'],
  },
  {
    code: 'PREP_3',
    nameAr: 'الصف الثالث الإعدادي',
    stage: 'PREPARATORY',
    order: 3,
    educationSystems: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'],
  },
  {
    code: 'SEC_1',
    nameAr: 'الصف الأول الثانوي',
    stage: 'SECONDARY',
    order: 4,
    educationSystems: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'],
  },
  {
    code: 'SEC_2',
    nameAr: 'الصف الثاني الثانوي',
    stage: 'SECONDARY',
    order: 5,
    educationSystems: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'],
  },
  {
    code: 'SEC_3',
    nameAr: 'الصف الثالث الثانوي',
    stage: 'SECONDARY',
    order: 6,
    educationSystems: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'],
  },
] as const;

export const EDUCATION_SYSTEM_DEFINITIONS: readonly EducationSystemDefinition[] = [
  {
    code: 'GENERAL',
    nameAr: 'التعليم العام',
    descriptionAr: 'نظام التعليم العام بوزارة التربية والتعليم المصرية',
  },
  {
    code: 'EGYPTIAN_BACCALAUREATE',
    nameAr: 'البكالوريا المصرية',
    descriptionAr: 'نظام البكالوريا الدولية المصرية المطورة',
  },
] as const;

export const LANGUAGE_TRACK_DEFINITIONS: readonly LanguageTrackDefinition[] = [
  {
    code: 'ARABIC',
    nameAr: 'عربي',
  },
  {
    code: 'LANG_ENGLISH',
    nameAr: 'لغات (إنجليزي)',
  },
] as const;

export const MATH_BRANCH_DEFINITIONS: readonly MathBranchDefinition[] = [
  { code: 'GENERAL_MATH', nameAr: 'رياضيات عامة' },
  { code: 'ALGEBRA', nameAr: 'جبر' },
  { code: 'GEOMETRY', nameAr: 'هندسة' },
  { code: 'TRIGONOMETRY', nameAr: 'حساب مثلثات' },
  { code: 'CALCULUS', nameAr: 'تفاضل وتكامل' },
  { code: 'STATISTICS', nameAr: 'إحصاء' },
  { code: 'APPLIED_MATH', nameAr: 'رياضيات تطبيقية' },
] as const;
