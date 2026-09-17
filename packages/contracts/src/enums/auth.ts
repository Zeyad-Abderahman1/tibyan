import { z } from 'zod';

export const UserRoleSchema = z.enum(['OWNER', 'ASSISTANT']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ActorTypeSchema = z.enum(['USER', 'SYSTEM']);
export type ActorType = z.infer<typeof ActorTypeSchema>;

export const PermissionCodeSchema = z.enum([
  'STUDENTS_READ',
  'STUDENTS_WRITE',
  'GROUPS_READ',
  'GROUPS_WRITE',
  'SESSIONS_MANAGE',
  'ATTENDANCE_WRITE',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE',
  'REPORTS_READ',
  'SETTINGS_WRITE',
  'USERS_MANAGE',
  'BACKUP_MANAGE',
]);
export type PermissionCode = z.infer<typeof PermissionCodeSchema>;
