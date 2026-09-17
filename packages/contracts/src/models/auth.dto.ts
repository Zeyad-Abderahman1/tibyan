import { z } from 'zod';
import { UserRoleSchema, PermissionCodeSchema } from '../enums/auth.js';
import { PIN_4DIGIT_REGEX } from '../common/regex.js';

export const PinSchema = z
  .string()
  .trim()
  .regex(PIN_4DIGIT_REGEX, 'PIN must be exactly 4 numeric digits');

export const LoginWithPinSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  pin: PinSchema,
});
export type LoginWithPinInput = z.infer<typeof LoginWithPinSchema>;

export const BootstrapOwnerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name cannot be empty'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').toLowerCase(),
  pin: PinSchema,
});
export type BootstrapOwnerInput = z.infer<typeof BootstrapOwnerSchema>;

export const CreateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name cannot be empty'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').toLowerCase(),
  pin: PinSchema,
  role: UserRoleSchema,
  permissions: z.array(PermissionCodeSchema).default([]),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdatePermissionsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  permissions: z.array(PermissionCodeSchema),
});
export type UpdatePermissionsInput = z.infer<typeof UpdatePermissionsSchema>;

export const ChangeUserStatusSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export type ChangeUserStatusInput = z.infer<typeof ChangeUserStatusSchema>;

export const ResetUserPinSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  newPin: PinSchema,
});
export type ResetUserPinInput = z.infer<typeof ResetUserPinSchema>;

export interface UserDto {
  id: string;
  fullName: string;
  username: string;
  role: z.infer<typeof UserRoleSchema>;
  status: 'ACTIVE' | 'INACTIVE';
  failedAttempts: number;
  lockedUntil: string | null;
  permissions: z.infer<typeof PermissionCodeSchema>[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionDto {
  userId: string;
  fullName: string;
  username: string;
  role: z.infer<typeof UserRoleSchema>;
  permissions: z.infer<typeof PermissionCodeSchema>[];
  tokenExpiresAt: string;
}

export const LoginUserSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
  fullName: z.string().min(1, 'Full name cannot be empty'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: UserRoleSchema,
});
export type LoginUserDto = z.infer<typeof LoginUserSchema>;
