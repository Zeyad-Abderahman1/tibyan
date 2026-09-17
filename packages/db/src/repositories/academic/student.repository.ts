import { eq, and, desc, like, or } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  students,
  studentNotes,
  type StudentRow,
  type NewStudentRow,
  type StudentNoteRow,
  type NewStudentNoteRow,
} from '../../schema/academic.schema.js';
import type {
  StudentStatus,
  GradeLevel,
  EducationSystem,
  LanguageTrack,
} from '@tibyan/contracts';

export interface StudentFilter {
  searchQuery?: string;
  status?: StudentStatus;
  gradeLevel?: GradeLevel;
  educationSystem?: EducationSystem;
  languageTrack?: LanguageTrack;
}

export class StudentRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  findById(id: string): StudentRow | null {
    const row = this.client.select().from(students).where(eq(students.id, id)).get();
    return row ?? null;
  }

  findByCode(code: string): StudentRow | null {
    const row = this.client.select().from(students).where(eq(students.studentCode, code)).get();
    return row ?? null;
  }

  findByQrToken(qrToken: string): StudentRow | null {
    const row = this.client.select().from(students).where(eq(students.qrToken, qrToken)).get();
    return row ?? null;
  }

  findByBarcode(barcodeValue: string): StudentRow | null {
    const row = this.client.select().from(students).where(eq(students.barcodeValue, barcodeValue)).get();
    return row ?? null;
  }

  create(newStudent: NewStudentRow): StudentRow {
    this.client.insert(students).values(newStudent).run();
    const created = this.findById(newStudent.id);
    if (!created) {
      throw new Error(`Failed to create student with id: ${newStudent.id}`);
    }
    return created;
  }

  update(id: string, updates: Partial<Omit<StudentRow, 'id' | 'createdAt'>>): StudentRow | null {
    const now = new Date().toISOString();
    this.client
      .update(students)
      .set({ ...updates, updatedAt: updates.updatedAt ?? now })
      .where(eq(students.id, id))
      .run();
    return this.findById(id);
  }

  list(filter?: StudentFilter): StudentRow[] {
    const conditions = [];

    if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
      const term = `%${filter.searchQuery.trim()}%`;
      conditions.push(
        or(
          like(students.fullName, term),
          like(students.studentCode, term),
          like(students.guardianPhone, term)
        )
      );
    }
    if (filter?.status) {
      conditions.push(eq(students.status, filter.status));
    }
    if (filter?.gradeLevel) {
      conditions.push(eq(students.gradeLevel, filter.gradeLevel));
    }
    if (filter?.educationSystem) {
      conditions.push(eq(students.educationSystem, filter.educationSystem));
    }
    if (filter?.languageTrack) {
      conditions.push(eq(students.languageTrack, filter.languageTrack));
    }

    if (conditions.length > 0) {
      return this.client.select().from(students).where(and(...conditions)).all();
    }
    return this.client.select().from(students).all();
  }

  addNote(note: NewStudentNoteRow): StudentNoteRow {
    this.client.insert(studentNotes).values(note).run();
    const created = this.client
      .select()
      .from(studentNotes)
      .where(eq(studentNotes.id, note.id))
      .get();
    if (!created) {
      throw new Error(`Failed to create student note with id: ${note.id}`);
    }
    return created;
  }

  getNotes(studentId: string): StudentNoteRow[] {
    return this.client
      .select()
      .from(studentNotes)
      .where(eq(studentNotes.studentId, studentId))
      .orderBy(desc(studentNotes.createdAt))
      .all();
  }
}
