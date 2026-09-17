import { z } from 'zod';
import {
  EducationSystemSchema,
  GradeLevelSchema,
  LanguageTrackSchema,
} from '../enums/academic.js';
import { StudentStatusSchema, StudentNoteTagSchema } from '../enums/student.js';
import { EGYPTIAN_PHONE_REGEX, normalizeEgyptianPhone } from '../common/regex.js';

export const EgyptianGuardianPhoneSchema = z
  .string()
  .trim()
  .regex(
    EGYPTIAN_PHONE_REGEX,
    'Invalid Egyptian mobile number. Must be 11 digits starting with 010, 011, 012, or 015 (e.g. 01012345678 or +201012345678)'
  )
  .transform((val) => normalizeEgyptianPhone(val));

export const CreateStudentSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name cannot be empty'),
  educationSystem: EducationSystemSchema,
  gradeLevel: GradeLevelSchema,
  languageTrack: LanguageTrackSchema,
  guardianPhone: EgyptianGuardianPhoneSchema,
  photoPath: z.string().trim().nullable().optional().default(null),
  initialNote: z.string().trim().optional(),
});
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  fullName: z.string().trim().min(1, 'Full name cannot be empty').optional(),
  educationSystem: EducationSystemSchema.optional(),
  gradeLevel: GradeLevelSchema.optional(),
  languageTrack: LanguageTrackSchema.optional(),
  guardianPhone: EgyptianGuardianPhoneSchema.optional(),
  photoPath: z.string().trim().nullable().optional(),
  status: StudentStatusSchema.optional(),
});
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

export const CreateStudentNoteSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  noteText: z.string().trim().min(1, 'Note text cannot be empty'),
  tag: StudentNoteTagSchema.default('GENERAL'),
});
export type CreateStudentNoteInput = z.infer<typeof CreateStudentNoteSchema>;

export const StudentFilterSchema = z.object({
  searchQuery: z.string().trim().optional(),
  educationSystem: EducationSystemSchema.optional(),
  gradeLevel: GradeLevelSchema.optional(),
  languageTrack: LanguageTrackSchema.optional(),
  status: StudentStatusSchema.optional(),
  groupId: z.string().uuid().optional(),
});
export type StudentFilterInput = z.infer<typeof StudentFilterSchema>;

export interface StudentDto {
  id: string;
  studentCode: string;
  fullName: string;
  photoPath: string | null;
  photoUrl?: string;
  educationSystem: z.infer<typeof EducationSystemSchema>;
  gradeLevel: z.infer<typeof GradeLevelSchema>;
  languageTrack: z.infer<typeof LanguageTrackSchema>;
  guardianPhone: string;
  status: z.infer<typeof StudentStatusSchema>;
  qrToken: string;
  barcodeValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentNoteDto {
  id: string;
  studentId: string;
  authorUserId: string | null;
  authorNameSnapshot: string;
  noteText: string;
  tag: z.infer<typeof StudentNoteTagSchema>;
  createdAt: string;
}
