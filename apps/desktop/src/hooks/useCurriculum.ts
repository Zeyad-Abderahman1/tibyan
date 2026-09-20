import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CurriculumCatalogDto,
  CurriculumCatalogFilter,
  CreateCurriculumCatalogDto,
  UpdateCurriculumCatalogDto,
  CurriculumTreeNodeDto,
  CurriculumNodeDto,
  CreateCurriculumNodeDto,
  UpdateCurriculumNodeDto,
  ReorderCurriculumNodesDto,
  GroupCurriculumOverviewDto,
  AssignGroupCatalogDto,
  UpdateGroupNodeProgressDto,
  GroupNodeProgressDto,
  CurriculumProgressStatus,
} from '@tibyan/contracts';

export const curriculumKeys = {
  all: ['curriculum'] as const,
  catalogs: () => [...curriculumKeys.all, 'catalogs'] as const,
  catalogList: (filter?: CurriculumCatalogFilter) => [...curriculumKeys.catalogs(), 'list', filter] as const,
  catalogDetail: (id: string) => [...curriculumKeys.catalogs(), 'detail', id] as const,
  trees: () => [...curriculumKeys.all, 'trees'] as const,
  tree: (catalogId: string) => [...curriculumKeys.trees(), catalogId] as const,
  groupOverview: (groupId: string) => [...curriculumKeys.all, 'group-overview', groupId] as const,
  groupProgressMap: (groupId: string) => [...curriculumKeys.all, 'group-progress-map', groupId] as const,
};

export function useCurriculumCatalogs(filter?: CurriculumCatalogFilter) {
  return useQuery({
    queryKey: curriculumKeys.catalogList(filter),
    queryFn: async (): Promise<CurriculumCatalogDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.listCatalogs) {
        const res = await window.tibyan.curriculum.listCatalogs(filter);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل قائمة المناهج');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useCurriculumCatalog(id?: string) {
  return useQuery({
    queryKey: curriculumKeys.catalogDetail(id || ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<CurriculumCatalogDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.getCatalog && id) {
        const res = await window.tibyan.curriculum.getCatalog(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل تفاصيل المنهج');
        }
        return res.data;
      }
      throw new Error('معرف المنهج غير صالح');
    },
  });
}

export function useCurriculumTree(catalogId?: string) {
  return useQuery({
    queryKey: curriculumKeys.tree(catalogId || ''),
    enabled: Boolean(catalogId),
    queryFn: async (): Promise<CurriculumTreeNodeDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.getTree && catalogId) {
        const res = await window.tibyan.curriculum.getTree(catalogId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل شجرة المنهج');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useCreateCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCurriculumCatalogDto): Promise<CurriculumCatalogDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.createCatalog) {
        const res = await window.tibyan.curriculum.createCatalog(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إنشاء المنهج الجديد');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.catalogs() });
    },
  });
}

export function useUpdateCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCurriculumCatalogDto }): Promise<CurriculumCatalogDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.updateCatalog) {
        const res = await window.tibyan.curriculum.updateCatalog(id, input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تعديل بيانات المنهج');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.catalogs() });
      queryClient.invalidateQueries({ queryKey: curriculumKeys.catalogDetail(data.id) });
    },
  });
}

export function usePublishCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<CurriculumCatalogDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.publishCatalog) {
        const res = await window.tibyan.curriculum.publishCatalog(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل نشر المنهج');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.catalogs() });
      queryClient.invalidateQueries({ queryKey: curriculumKeys.catalogDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(data.id) });
    },
  });
}

export function useReviseCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<CurriculumCatalogDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.reviseCatalog) {
        const res = await window.tibyan.curriculum.reviseCatalog(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إصدار نسخة مراجعة جديدة');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.catalogs() });
    },
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCurriculumNodeDto): Promise<CurriculumNodeDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.createNode) {
        const res = await window.tibyan.curriculum.createNode(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إضافة العنصر');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(data.catalogId) });
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      catalogId: _catalogId,
      input,
    }: {
      id: string;
      catalogId: string;
      input: UpdateCurriculumNodeDto;
    }): Promise<CurriculumNodeDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.updateNode) {
        const res = await window.tibyan.curriculum.updateNode(id, input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحديث العنصر');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(vars.catalogId) });
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, catalogId: _catalogId }: { id: string; catalogId: string }): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.deleteNode) {
        const res = await window.tibyan.curriculum.deleteNode(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل حذف العنصر');
        }
        return;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(vars.catalogId) });
    },
  });
}

export function useReorderNodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReorderCurriculumNodesDto): Promise<void> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.reorderNodes) {
        const res = await window.tibyan.curriculum.reorderNodes(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إعادة ترتيب العناصر');
        }
        return;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: curriculumKeys.tree(vars.catalogId) });
    },
  });
}

export function useGroupCurriculumOverview(groupId?: string) {
  return useQuery({
    queryKey: curriculumKeys.groupOverview(groupId || ''),
    enabled: Boolean(groupId),
    queryFn: async (): Promise<GroupCurriculumOverviewDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.getGroupOverview && groupId) {
        const res = await window.tibyan.curriculum.getGroupOverview(groupId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل تقرير خطة المجموعة');
        }
        return res.data;
      }
      throw new Error('معرف المجموعة غير صالح');
    },
  });
}

export function useAssignGroupCatalog(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignGroupCatalogDto) => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.assignGroupCatalog) {
        const res = await window.tibyan.curriculum.assignGroupCatalog(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل ربط المنهج بالمجموعة');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: () => {
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: curriculumKeys.groupOverview(groupId) });
        queryClient.invalidateQueries({ queryKey: curriculumKeys.groupProgressMap(groupId) });
      }
    },
  });
}

export function useUpdateGroupProgress(groupId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateGroupNodeProgressDto): Promise<GroupNodeProgressDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.updateGroupProgress) {
        const res = await window.tibyan.curriculum.updateGroupProgress(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحديث حالة التقدم');
        }
        return res.data;
      }
      throw new Error('خدمة المناهج غير متاحة');
    },
    onSuccess: () => {
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: curriculumKeys.groupOverview(groupId) });
        queryClient.invalidateQueries({ queryKey: curriculumKeys.groupProgressMap(groupId) });
      }
    },
  });
}

export function useGroupProgressMap(groupId?: string) {
  return useQuery({
    queryKey: curriculumKeys.groupProgressMap(groupId || ''),
    enabled: Boolean(groupId),
    queryFn: async (): Promise<Record<string, CurriculumProgressStatus>> => {
      if (typeof window !== 'undefined' && window.tibyan?.curriculum?.getGroupProgressMap && groupId) {
        const res = await window.tibyan.curriculum.getGroupProgressMap(groupId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل سجل تقدم المنهج');
        }
        return res.data;
      }
      return {};
    },
  });
}
