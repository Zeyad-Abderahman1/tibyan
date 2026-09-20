import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SourceDocumentDto,
  ImportSourceDocumentDto,
  UpdateSourceDocumentDto,
  SourceReferenceDto,
  CreateSourceReferenceDto,
  UpdateSourceReferenceDto,
} from '@tibyan/contracts';

export const pdfSourceKeys = {
  all: ['pdf-sources'] as const,
  list: (catalogId?: string) => [...pdfSourceKeys.all, 'list', catalogId] as const,
  detail: (id: string) => [...pdfSourceKeys.all, 'detail', id] as const,
  references: (sourceDocumentId?: string) => [...pdfSourceKeys.all, 'references', sourceDocumentId] as const,
};

export function usePdfSources(catalogId?: string) {
  return useQuery({
    queryKey: pdfSourceKeys.list(catalogId),
    queryFn: async (): Promise<SourceDocumentDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.listSources) {
        const res = await window.tibyan.pdfSources.listSources(catalogId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل وثائق PDF');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function usePdfSource(id?: string) {
  return useQuery({
    queryKey: pdfSourceKeys.detail(id || ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<SourceDocumentDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.getSource && id) {
        const res = await window.tibyan.pdfSources.getSource(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل وثيقة PDF');
        }
        return res.data;
      }
      throw new Error('معرف الوثيقة غير صالح');
    },
  });
}

export function useSourceReferences(sourceDocumentId?: string) {
  return useQuery({
    queryKey: pdfSourceKeys.references(sourceDocumentId),
    queryFn: async (): Promise<SourceReferenceDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.listReferences) {
        const res = await window.tibyan.pdfSources.listReferences(sourceDocumentId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل مراجع الصفحات');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useImportPdfSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ImportSourceDocumentDto): Promise<SourceDocumentDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.importSource) {
        const res = await window.tibyan.pdfSources.importSource(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استيراد وثيقة PDF');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.all });
    },
  });
}

export function useUpdatePdfSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSourceDocumentDto }): Promise<SourceDocumentDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.updateSource) {
        const res = await window.tibyan.pdfSources.updateSource(id, data);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحديث وثيقة PDF');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.all });
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.detail(data.id) });
    },
  });
}

export function useDeletePdfSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.deleteSource) {
        const res = await window.tibyan.pdfSources.deleteSource(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل حذف وثيقة PDF');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.all });
    },
  });
}

export function useCreateSourceReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSourceReferenceDto): Promise<SourceReferenceDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.createReference) {
        const res = await window.tibyan.pdfSources.createReference(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إنشاء مرجع الصفحة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.all });
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.references(data.sourceDocumentId) });
    },
  });
}

export function useUpdateSourceReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSourceReferenceDto }): Promise<SourceReferenceDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.updateReference) {
        const res = await window.tibyan.pdfSources.updateReference(id, data);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحديث مرجع الصفحة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.all });
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.references(data.sourceDocumentId) });
    },
  });
}

export function useDeleteSourceReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.pdfSources?.deleteReference) {
        const res = await window.tibyan.pdfSources.deleteReference(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل حذف مرجع الصفحة');
        }
        return res.data;
      }
      throw new Error('IPC غير متاح');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pdfSourceKeys.all });
    },
  });
}
