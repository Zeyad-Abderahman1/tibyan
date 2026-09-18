import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IpcResult, GlobalSettingsDto, UpdateThemeSettingInput } from '@tibyan/contracts';
import { useTheme } from '@tibyan/design-system';

export function useSettings() {
  return useQuery({
    queryKey: ['systemSettings'],
    queryFn: async (): Promise<GlobalSettingsDto | null> => {
      if (typeof window !== 'undefined' && window.tibyan?.system?.getSettings) {
        const res = await window.tibyan.system.getSettings();
        if (res.success) {
          return res.data;
        }
      }
      return null;
    },
    staleTime: 1000 * 30, // 30s
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();

  return useMutation({
    mutationFn: async (input: UpdateThemeSettingInput): Promise<IpcResult<void>> => {
      if (!window.tibyan?.system?.updateTheme) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.system.updateTheme is not available');
      }
      const res = await window.tibyan.system.updateTheme(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'تعذر تحديث إعداد المظهر.');
      }
      return res;
    },
    onSuccess: (_data, variables) => {
      setTheme(variables.theme);
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
  });
}
