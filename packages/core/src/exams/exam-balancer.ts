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

/**
 * Deterministically selects questions matching the blueprint constraints.
 * Selects by difficulty and question type priorities, ordered stably by ID.
 */
export function selectBalancedQuestions<T extends ExamCandidateForBalance>(
  blueprint: ExamBlueprint,
  candidates: T[]
): { selected: T[]; conflicts: string[] } {
  const validation = validateExamBlueprint(blueprint, candidates);
  if (!validation.valid) {
    return { selected: [], conflicts: validation.conflicts };
  }

  // Filter candidates strictly in scope
  const pool = candidates
    .filter((candidate) =>
      candidate.curriculumTags.some((id) => blueprint.curriculumNodeIds.includes(id)) &&
      (blueprint.sourceReferenceIds.length === 0 || candidate.sourceReferenceIds.some((id) => blueprint.sourceReferenceIds.includes(id)))
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const selected: T[] = [];
  const selectedIds = new Set<string>();

  // Allocate by (difficulty, questionType) matching
  const remainingDifficulty: Record<string, number> = { ...blueprint.difficultyDistribution };
  const remainingType: Record<string, number> = { ...blueprint.questionTypeDistribution };

  // First pass: fulfill both difficulty and question type
  for (const item of pool) {
    if (selected.length >= blueprint.totalQuestions) break;
    if (selectedIds.has(item.id)) continue;
    const diffCount = remainingDifficulty[item.difficulty] ?? 0;
    const typeCount = remainingType[item.questionType] ?? 0;
    if (diffCount > 0 && typeCount > 0) {
      selected.push(item);
      selectedIds.add(item.id);
      remainingDifficulty[item.difficulty] = diffCount - 1;
      remainingType[item.questionType] = typeCount - 1;
    }
  }

  // Second pass: fulfill remaining difficulty constraints
  for (const item of pool) {
    if (selected.length >= blueprint.totalQuestions) break;
    if (selectedIds.has(item.id)) continue;
    const diffCount = remainingDifficulty[item.difficulty] ?? 0;
    if (diffCount > 0) {
      selected.push(item);
      selectedIds.add(item.id);
      remainingDifficulty[item.difficulty] = diffCount - 1;
      const tCount = remainingType[item.questionType] ?? 0;
      if (tCount > 0) remainingType[item.questionType] = tCount - 1;
    }
  }


  // Third pass: fill up to totalQuestions if needed
  for (const item of pool) {
    if (selected.length >= blueprint.totalQuestions) break;
    if (selectedIds.has(item.id)) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }

  return { selected, conflicts: [] };
}

