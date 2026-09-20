import type { ExamBlueprint, QuestionDifficulty, QuestionType } from '@tibyan/contracts';

export interface ExamCandidateForBalance {
  id: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  defaultMarks: number;
  curriculumTags: string[];
  sourceReferenceIds: string[];
}

export interface BlueprintValidationResult {
  valid: boolean;
  conflicts: string[];
}

/** Deterministic preflight; it deliberately does not call an AI provider. */
export function validateExamBlueprint(
  blueprint: ExamBlueprint,
  candidates: ExamCandidateForBalance[]
): BlueprintValidationResult {
  const conflicts: string[] = [];
  const scoped = candidates.filter((candidate) =>
    candidate.curriculumTags.some((id) => blueprint.curriculumNodeIds.includes(id)) &&
    (blueprint.sourceReferenceIds.length === 0 || candidate.sourceReferenceIds.some((id) => blueprint.sourceReferenceIds.includes(id)))
  );
  if (scoped.length < blueprint.totalQuestions) {
    conflicts.push('لا يوجد عدد كافٍ من الأسئلة المطابقة لنطاق المنهج والمصادر المحدد');
  }
  if (scoped.reduce((sum, candidate) => sum + candidate.defaultMarks, 0) < blueprint.totalMarks) {
    conflicts.push('إجمالي درجات الأسئلة المتاحة لا يحقق الدرجة الكلية المطلوبة');
  }
  for (const [difficulty, count] of Object.entries(blueprint.difficultyDistribution)) {
    if (scoped.filter((candidate) => candidate.difficulty === difficulty).length < count) {
      conflicts.push(`لا يوجد عدد كافٍ من أسئلة الصعوبة ${difficulty}`);
    }
  }
  for (const [type, count] of Object.entries(blueprint.questionTypeDistribution)) {
    if (scoped.filter((candidate) => candidate.questionType === type).length < count) {
      conflicts.push(`لا يوجد عدد كافٍ من أسئلة النوع ${type}`);
    }
  }
  return { valid: conflicts.length === 0, conflicts };
}
