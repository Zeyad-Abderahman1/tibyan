import { z } from 'zod';

export const AttendanceStatusSchema = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
]);

export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const FollowUpContactStatusSchema = z.enum([
  'UNCONTACTED',
  'CONTACTED',
  'UNREACHABLE',
]);

export type FollowUpContactStatus = z.infer<typeof FollowUpContactStatusSchema>;
