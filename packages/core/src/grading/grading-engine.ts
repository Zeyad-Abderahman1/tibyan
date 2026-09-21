import {
  type RubricCriterionResultDto,
} from '@tibyan/contracts';

export interface AnswerKeyEntry {
  examQuestionId: string;
  questionPosition: number;
  questionMarks: number;
  questionType: string;
  correctOptionLabel?: string; // A/B/C/D for MCQ
  correctResponse?: string; // exact text match for fill-in
  rubricCriteria?: Array<{
    key: string;
    label: string;
    maxMarks: number;
    description?: string;
  }>;
}

export interface ExtractionResult {
  examQuestionId: string;
  recognizedResponse: string | null;
  recognizedOptionLabel: string | null;
  extractionMethod: 'DETERMINISTIC' | 'AI_MULTIMODAL' | 'TEACHER_INPUT';
  confidence: number | null;
}

/**
 * Deterministic grading engine.
 * Grades MCQ and exact-answer questions from the authoritative answer key.
 * Never uses AI — purely deterministic comparison.
 */
export class GradingEngine {
  /**
   * Grade a single question deterministically.
   * Returns the awarded marks and rubric breakdown if applicable.
   */
  gradeQuestion(
    answerKey: AnswerKeyEntry,
    extraction: ExtractionResult,
  ): { awardedMarks: number; rubricResults: RubricCriterionResultDto[] } {
    const { questionType, questionMarks, correctOptionLabel, correctResponse, rubricCriteria } = answerKey;

    // MCQ grading — exact option match
    if (questionType === 'MULTIPLE_CHOICE' && correctOptionLabel) {
      const isCorrect = extraction.recognizedOptionLabel?.toUpperCase() === correctOptionLabel.toUpperCase();
      return {
        awardedMarks: isCorrect ? questionMarks : 0,
        rubricResults: [],
      };
    }

    // True/False grading
    if (questionType === 'TRUE_FALSE') {
      const isCorrect = extraction.recognizedResponse?.trim().toLowerCase() === correctResponse?.trim().toLowerCase();
      return {
        awardedMarks: isCorrect ? questionMarks : 0,
        rubricResults: [],
      };
    }

    // Fill-in / exact match grading
    if (questionType === 'FILL_IN' && correctResponse) {
      const normalized = this.normalizeArabicText(extraction.recognizedResponse ?? '');
      const expected = this.normalizeArabicText(correctResponse);
      const isCorrect = normalized === expected;
      return {
        awardedMarks: isCorrect ? questionMarks : 0,
        rubricResults: [],
      };
    }

    // Short answer / constructed response with rubric
    if (rubricCriteria && rubricCriteria.length > 0) {
      // Without AI, we can only grade if there's an exact match or simple rules
      // For constructed responses without AI, default to pending teacher review
      const rubricResults: RubricCriterionResultDto[] = rubricCriteria.map((c) => ({
        criterionKey: c.key,
        criterionLabel: c.label,
        maxMarks: c.maxMarks,
        awardedMarks: 0,
        rationale: 'يحتاج مراجعة يدوية',
        source: 'DETERMINISTIC' as const,
      }));

      return {
        awardedMarks: 0,
        rubricResults,
      };
    }

    // Default: cannot grade deterministically, needs AI or teacher
    return {
      awardedMarks: 0,
      rubricResults: [],
    };
  }

  /**
   * Grade all questions for a submission.
   */
  gradeAll(
    answerKeys: AnswerKeyEntry[],
    extractions: ExtractionResult[],
  ): Array<{
    examQuestionId: string;
    questionPosition: number;
    questionMarks: number;
    awardedMarks: number;
    gradingMethod: 'DETERMINISTIC' | 'AI_ASSISTED' | 'TEACHER_ONLY';
    rubricResults: RubricCriterionResultDto[];
  }> {
    const extractionMap = new Map(extractions.map((e) => [e.examQuestionId, e]));

    return answerKeys.map((key) => {
      const extraction = extractionMap.get(key.examQuestionId);
      if (!extraction) {
        return {
          examQuestionId: key.examQuestionId,
          questionPosition: key.questionPosition,
          questionMarks: key.questionMarks,
          awardedMarks: 0,
          gradingMethod: 'TEACHER_ONLY' as const,
          rubricResults: [],
        };
      }

      const result = this.gradeQuestion(key, extraction);
      return {
        examQuestionId: key.examQuestionId,
        questionPosition: key.questionPosition,
        questionMarks: key.questionMarks,
        awardedMarks: result.awardedMarks,
        gradingMethod: 'DETERMINISTIC' as const,
        rubricResults: result.rubricResults,
      };
    });
  }

  /**
   * Normalize Arabic text for comparison (diacritics, alef variants, etc.)
   */
  private normalizeArabicText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\u0610-\u061A]/g, '') // Remove Arabic diacritics
      .replace(/[\u064B-\u065F]/g, '') // Remove Arabic diacritics
      .replace(/[\u0670]/g, '') // Superscript alef
      .replace(/\u0622/g, '\u0627') // Alef with madda → alef
      .replace(/\u0623/g, '\u0627') // Alef with hamza above → alef
      .replace(/\u0625/g, '\u0627') // Alef with hamza below → alef
      .replace(/\u0623/g, '\u0627') // Alef with hamza above → alef
      .replace(/\u0649/g, '\u064A') // Alef maksura → ya
      .replace(/\u0629/g, '\u0647') // Taa marbuta → ha
      .replace(/\s+/g, ' ');
  }
}
