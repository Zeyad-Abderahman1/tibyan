import { z } from 'zod';
import {
  EducationSystemSchema,
  GradeLevelSchema,
  LanguageTrackSchema,
  MathBranchSchema,
} from '../enums/academic.js';
import { PaymentTypeSchema } from '../enums/payment.js';
import { WeekdaySchema } from '../enums/session.js';
import { TIME_HHMM_REGEX } from '../common/regex.js';

export const WeeklyScheduleSlotInputSchema = z.object({
  id: z.string().uuid().optional(),
  weekday: WeekdaySchema,
  startTime: z
    .string()
    .trim()
    .regex(TIME_HHMM_REGEX, 'Start time must be in 24-hour format (HH:mm)'),
  durationMinutes: z
    .number()
    .int('Duration must be an integer')
    .positive('Duration must be greater than 0 minutes')
    .default(120),
});
export type WeeklyScheduleSlotInput = z.infer<typeof WeeklyScheduleSlotInputSchema>;

export const CreateGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name cannot be empty'),
  educationSystem: EducationSystemSchema,
  gradeLevel: GradeLevelSchema,
  languageTrack: LanguageTrackSchema,
  focusMathBranch: MathBranchSchema.nullable().optional().default(null),
  defaultPaymentType: PaymentTypeSchema,
  defaultPaymentAmount: z
    .number()
    .nonnegative('Default payment amount cannot be negative'),
  schedules: z.array(WeeklyScheduleSlotInputSchema).default([]),
});
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;

export const UpdateGroupSchema = z.object({
  groupId: z.string().uuid('Invalid group ID format'),
  name: z.string().trim().min(1, 'Group name cannot be empty').optional(),
  educationSystem: EducationSystemSchema.optional(),
  gradeLevel: GradeLevelSchema.optional(),
  languageTrack: LanguageTrackSchema.optional(),
  focusMathBranch: MathBranchSchema.nullable().optional(),
  defaultPaymentType: PaymentTypeSchema.optional(),
  defaultPaymentAmount: z
    .number()
    .nonnegative('Default payment amount cannot be negative')
    .optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;

export const SetGroupScheduleSchema = z.object({
  groupId: z.string().uuid('Invalid group ID format'),
  slots: z.array(WeeklyScheduleSlotInputSchema),
});
export type SetGroupScheduleInput = z.infer<typeof SetGroupScheduleSchema>;

export interface WeeklyScheduleSlotDto {
  id: string;
  groupId: string;
  weekday: z.infer<typeof WeekdaySchema>;
  startTime: string;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDto {
  id: string;
  name: string;
  educationSystem: z.infer<typeof EducationSystemSchema>;
  gradeLevel: z.infer<typeof GradeLevelSchema>;
  languageTrack: z.infer<typeof LanguageTrackSchema>;
  focusMathBranch: z.infer<typeof MathBranchSchema> | null;
  defaultPaymentType: z.infer<typeof PaymentTypeSchema>;
  defaultPaymentAmount: number;
  status: 'ACTIVE' | 'ARCHIVED';
  schedules: WeeklyScheduleSlotDto[];
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}
