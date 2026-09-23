import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SourceDocumentDto,
  CurriculumGradeGroup,
  CurriculumLibraryFilter,
  ImportCurriculumLibraryInput,
  UpdateCurriculumLibraryInput,
} from '@tibyan/contracts';

export const curriculumLibraryKeys = {
  all: ['curriculum-library'] as const,
  list: (filter?: CurriculumLibraryFilter) =>
    [...curriculumLibraryKeys.all, 'list', filter] as const,
  grouped: () => [...curriculumLibraryKeys.all, 'grouped'] as const,
  detail: (id: string) => [...curriculumLibraryKeys.all, 'detail', id] as const,
};

export function useCurriculumLibraryList(filter?: CurriculumLibraryFilter) {
  return useQuery({
    queryKey: curriculumLibraryKeys.list(filter),
    queryFn: async (): Promise<SourceDocumentDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculumLibrary?.list) {
        const res = await window.tibyan.curriculumLibrary.list(filter);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل تحميل المكتبة');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useCurriculumLibraryGrouped() {
  return useQuery({
    queryKey: curriculumLibraryKeys.grouped(),
    queryFn: async (): Promise<CurriculumGradeGroup[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculumLibrary?.listGrouped) {
        const res = await window.tibyan.curriculumLibrary.listGrouped();
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل تحميل المكتبة');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useCurriculumLibraryItem(id?: string) {
  return useQuery({
    queryKey: curriculumLibraryKeys.detail(id || ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<SourceDocumentDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculumLibrary?.get && id) {
        const res = await window.tibyan.curriculumLibrary.get(id);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل تحميل الوثيقة');
        }
        return res.data;
      }
      throw new Error('معرف الوثيقة غير صالح');
    },
  });
}

export function useImportCurriculumLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ImportCurriculumLibraryInput): Promise<SourceDocumentDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculumLibrary?.import) {
        const res = await window.tibyan.curriculumLibrary.import(input);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل استيراد الملف');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumLibraryKeys.all });
    },
  });
}

export function useUpdateCurriculumLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCurriculumLibraryInput): Promise<SourceDocumentDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculumLibrary?.update) {
        const res = await window.tibyan.curriculumLibrary.update(input);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل تحديث الوثيقة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: curriculumLibraryKeys.all });
      queryClient.invalidateQueries({ queryKey: curriculumLibraryKeys.detail(data.id) });
    },
  });
}

export function useDeleteCurriculumLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculumLibrary?.delete) {
        const res = await window.tibyan.curriculumLibrary.delete(id);
        if (!res.success) {
          throw new Error(res.error?.message || 'فشل حذف الوثيقة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumLibraryKeys.all });
    },
  });
}
