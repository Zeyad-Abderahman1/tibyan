import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  IpcResult,
  AcademicYearDto,
  CreateAcademicYearInput,
  SwitchAcademicYearInput,
} from '@tibyan/contracts';
import { studentKeys } from './useStudents.js';
import { groupKeys, sessionKeys } from './useGroups.js';
import { dashboardKeys } from './useDashboard.js';

export function useAcademicYears() {
  return useQuery({
    queryKey: ['academicYears'],
    queryFn: async (): Promise<AcademicYearDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.system?.listAcademicYears) {
        const res = await window.tibyan.system.listAcademicYears();
        if (res.success) {
          return res.data;
        }
      }
      return [];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAcademicYearInput): Promise<IpcResult<AcademicYearDto>> => {
      if (!window.tibyan?.system?.createAcademicYear) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.system.createAcademicYear is not available');
      }
      const res = await window.tibyan.system.createAcademicYear(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'تعذر إنشاء العام الدراسي الجديد.');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      queryClient.invalidateQueries({ queryKey: ['setupState'] });
    },
  });
}

export function useSwitchAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SwitchAcademicYearInput): Promise<IpcResult<void>> => {
      if (!window.tibyan?.system?.switchAcademicYear) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.system.switchAcademicYear is not available');
      }
      const res = await window.tibyan.system.switchAcademicYear(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'تعذر التبديل إلى العام الدراسي المحدد.');
      }
      return res;
    },
    onSuccess: () => {
      // Security Boundary: Purge all academic-year scoped queries immediately using canonical keys
      queryClient.removeQueries({ queryKey: studentKeys.all });
      queryClient.removeQueries({ queryKey: groupKeys.all });
      queryClient.removeQueries({ queryKey: sessionKeys.all });
      queryClient.removeQueries({ queryKey: dashboardKeys.all });

      // Invalidate system-scoped queries to refresh active academic year indicator
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      queryClient.invalidateQueries({ queryKey: ['setupState'] });
    },
  });
}
