import { asc, eq, type InferInsertModel } from 'drizzle-orm';
import type { AcademicDrizzle } from '../../connection.js';
import {
  exams,
  examSections,
  examQuestions,
  examVersions,
  type ExamRow,
  type ExamSectionRow,
  type ExamQuestionRow,
  type ExamVersionRow,
} from '../../schema/academic.schema.js';

export interface CreateExamSnapshot {
  exam: InferInsertModel<typeof exams>;
  sections: InferInsertModel<typeof examSections>[];
  questions: InferInsertModel<typeof examQuestions>[];
  versions: InferInsertModel<typeof examVersions>[];
}
export interface ExamSnapshot {
  exam: ExamRow;
  sections: ExamSectionRow[];
  questions: ExamQuestionRow[];
  versions: ExamVersionRow[];
}

/** Academic-DB-only repository. Question Bank IDs remain opaque snapshots, never foreign keys. */
export class ExamRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  create(snapshot: CreateExamSnapshot): void {
    this.db.transaction((tx) => {
      tx.insert(exams).values(snapshot.exam).run();
      if (snapshot.sections.length) tx.insert(examSections).values(snapshot.sections).run();
      if (snapshot.questions.length) tx.insert(examQuestions).values(snapshot.questions).run();
      if (snapshot.versions.length) tx.insert(examVersions).values(snapshot.versions).run();
    });
  }

  findSnapshot(examId: string): ExamSnapshot | null {
    const exam = this.db.select().from(exams).where(eq(exams.id, examId)).get();
    if (!exam) return null;
    const sections = this.db.select().from(examSections).where(eq(examSections.examId, examId)).orderBy(asc(examSections.position)).all();
    const sectionIds = new Set(sections.map((section) => section.id));
    const questions = this.db.select().from(examQuestions).orderBy(asc(examQuestions.position)).all().filter((question) => sectionIds.has(question.examSectionId));
    const versions = this.db.select().from(examVersions).where(eq(examVersions.examId, examId)).orderBy(asc(examVersions.label)).all();
    return { exam, sections, questions, versions };
  }
}
