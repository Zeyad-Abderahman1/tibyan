import { z } from 'zod';

export const CreateAcademicYearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g. 2026-2027)'),
  })
  .refine(
    (data) => {
      const parts = data.name.split('-');
      const startYear = parseInt(parts[0]!, 10);
      const endYear = parseInt(parts[1]!, 10);
      return endYear === startYear + 1;
    },
    {
      message: 'Ending year must equal starting year + 1 (e.g. 2026-2027)',
      path: ['name'],
    }
  );
export type CreateAcademicYearInput = z.infer<typeof CreateAcademicYearSchema>;

export const SwitchAcademicYearSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID format'),
});
export type SwitchAcademicYearInput = z.infer<typeof SwitchAcademicYearSchema>;

export const UpdateThemeSettingSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});
export type UpdateThemeSettingInput = z.infer<typeof UpdateThemeSettingSchema>;

export interface AcademicYearDto {
  id: string;
  name: string;
  dbFilename: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppInfoDto {
  nameEn: string;
  nameAr: string;
  version: string;
  isPackaged: boolean;
  platform: string;
  appDataDir: string;
}

export interface GlobalSettingsDto {
  theme: 'light' | 'dark' | 'system';
  activeAcademicYearId: string | null;
  activeAcademicYearName: string | null;
}

export interface SetupStateDto {
  isSetupComplete: boolean;
  hasOwner: boolean;
  hasActiveAcademicYear: boolean;
  activeAcademicYearName: string | null;
}

import { EGYPTIAN_PHONE_REGEX, normalizeEgyptianPhone } from '../common/regex.js';

export const OpenWhatsAppInputSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      EGYPTIAN_PHONE_REGEX,
      'Invalid Egyptian mobile number. Must be 11 digits starting with 010, 011, 012, or 015 (e.g. 01012345678 or +201012345678)'
    )
    .transform((val) => normalizeEgyptianPhone(val)),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
});
export type OpenWhatsAppInput = z.infer<typeof OpenWhatsAppInputSchema>;
