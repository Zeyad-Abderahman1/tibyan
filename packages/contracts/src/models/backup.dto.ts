import { z } from 'zod';

export const CreateBackupSchema = z.object({
  reason: z.string().trim().optional(),
});
export type CreateBackupInput = z.infer<typeof CreateBackupSchema>;

export interface BackupRecordDto {
  id: string;
  backupPath: string;
  backupDate: string;
  status: 'SUCCESS' | 'FAILED';
  sizeBytes: number;
  academicYearsIncluded: string[];
  createdAt: string;
}

export interface BackupHistoryItemDto {
  id: string;
  backupDate: string;
  status: 'SUCCESS' | 'FAILED';
  sizeBytes: number;
  academicYearsIncluded: string[];
  createdAt: string;
}

export interface BackupStatusDto {
  lastBackupAt: string | null;
  lastBackupStatus: 'SUCCESS' | 'FAILED' | null;
  totalBackupsCount: number;
  latestBackupSizeBytes: number | null;
  isBackupRunning: boolean;
}
