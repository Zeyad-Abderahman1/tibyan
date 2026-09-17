import { z } from 'zod';

export const CreateAcademicYearSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g. 2026-2027)'),
});
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
