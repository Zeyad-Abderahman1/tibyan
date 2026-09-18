import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  IpcResult,
  BackupHistoryItemDto,
  BackupStatusDto,
  CreateBackupInput,
} from '@tibyan/contracts';

export function useBackupStatus() {
  return useQuery({
    queryKey: ['backupStatus'],
    queryFn: async (): Promise<BackupStatusDto | null> => {
      if (typeof window !== 'undefined' && window.tibyan?.backup?.getStatus) {
        const res = await window.tibyan.backup.getStatus();
        if (res.success) {
          return res.data;
        }
      }
      return null;
    },
    staleTime: 1000 * 15, // 15 seconds
  });
}

export function useBackupRecords() {
  return useQuery({
    queryKey: ['backupRecords'],
    queryFn: async (): Promise<BackupHistoryItemDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.backup?.listRecords) {
        const res = await window.tibyan.backup.listRecords();
        if (res.success) {
          return res.data;
        }
      }
      return [];
    },
    staleTime: 1000 * 30,
  });
}

export function useTriggerBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input?: CreateBackupInput): Promise<IpcResult<BackupHistoryItemDto>> => {
      if (!window.tibyan?.backup?.trigger) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.backup.trigger is not available');
      }
      const res = await window.tibyan.backup.trigger(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'فشلت عملية إنشاء النسخة الاحتياطية.');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupStatus'] });
      queryClient.invalidateQueries({ queryKey: ['backupRecords'] });
    },
  });
}
