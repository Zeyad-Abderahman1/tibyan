import { z } from 'zod';

export const StudentStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type StudentStatus = z.infer<typeof StudentStatusSchema>;

export const StudentNoteTagSchema = z.enum([
  'GENERAL',
  'ACADEMIC_WEAKNESS',
  'EXCELLENT',
  'BEHAVIOR',
  'NEEDS_FOLLOW_UP',
]);
export type StudentNoteTag = z.infer<typeof StudentNoteTagSchema>;
