import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GroupDto,
  CreateGroupInput,
  UpdateGroupInput,
  SetGroupScheduleInput,
  GroupEnrollmentDto,
  EnrollStudentInput,
  UpdateEnrollmentPaymentInput,
  EndEnrollmentInput,
  SessionDto,
  RescheduleSessionInput,
  ListSessionsByDateRangeInput,
  IpcResult,
} from '@tibyan/contracts';

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: () => [...groupKeys.lists()] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
  enrollments: (groupId: string) => [...groupKeys.all, 'enrollments', groupId] as const,
  sessions: (groupId: string) => [...groupKeys.all, 'sessions', groupId] as const,
};

export const sessionKeys = {
  all: ['sessions'] as const,
  range: (params: ListSessionsByDateRangeInput) => [...sessionKeys.all, 'range', params] as const,
};

/**
 * Fetches the list of all academic groups in the active academic year.
 */
export function useGroupsList() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async (): Promise<GroupDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.groups?.list) {
        const res = await window.tibyan.groups.list();
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل قائمة المجموعات');
        }
        return res.data;
      }
      return [];
    },
  });
}

/**
 * Fetches a single group by ID.
 */
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn: async (): Promise<GroupDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.groups?.getById) {
        const res = await window.tibyan.groups.getById(groupId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع بيانات المجموعة');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    enabled: Boolean(groupId),
  });
}

/**
 * Fetches all student enrollments (active & ended) for a specific group.
 */
export function useGroupEnrollments(groupId: string) {
  return useQuery({
    queryKey: groupKeys.enrollments(groupId),
    queryFn: async (): Promise<GroupEnrollmentDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.enrollments?.listByGroup) {
        const res = await window.tibyan.enrollments.listByGroup(groupId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل قائمة الطلاب المسجلين');
        }
        return res.data;
      }
      return [];
    },
    enabled: Boolean(groupId),
  });
}

/**
 * Fetches sessions within a date range for a specific group.
 */
export function useGroupSessions(groupId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: sessionKeys.range({ startDate, endDate, groupId }),
    queryFn: async (): Promise<SessionDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.sessions?.listByRange) {
        const res = await window.tibyan.sessions.listByRange({ startDate, endDate, groupId });
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع جدول الحصص');
        }
        return res.data;
      }
      return [];
    },
    enabled: Boolean(groupId) && Boolean(startDate) && Boolean(endDate),
  });
}

/**
 * Mutation for creating a new group.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<IpcResult<GroupDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.groups?.create) {
        return window.tibyan.groups.create(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
        queryClient.setQueryData(groupKeys.detail(res.data.id), res.data);
      }
    },
  });
}

/**
 * Mutation for updating group metadata or status (e.g. archiving).
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGroupInput): Promise<IpcResult<GroupDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.groups?.update) {
        return window.tibyan.groups.update(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(variables.groupId) });
      }
    },
  });
}

/**
 * Mutation for setting recurring weekly schedules.
 */
export function useSetGroupSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SetGroupScheduleInput): Promise<IpcResult<GroupDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.groups?.setSchedule) {
        return window.tibyan.groups.setSchedule(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(variables.groupId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
        queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      }
    },
  });
}

/**
 * Mutation for enrolling a student into a group.
 */
export function useEnrollStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EnrollStudentInput): Promise<IpcResult<GroupEnrollmentDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.enrollments?.enroll) {
        return window.tibyan.enrollments.enroll(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: groupKeys.enrollments(variables.groupId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(variables.groupId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      }
    },
  });
}

/**
 * Mutation for updating enrollment payment overrides.
 */
export function useUpdateEnrollmentPayment(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEnrollmentPaymentInput): Promise<IpcResult<GroupEnrollmentDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.enrollments?.updatePayment) {
        return window.tibyan.enrollments.updatePayment(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: groupKeys.enrollments(groupId) });
      }
    },
  });
}

/**
 * Mutation for ending an active enrollment.
 */
export function useEndEnrollment(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EndEnrollmentInput): Promise<IpcResult<void>> => {
      if (typeof window !== 'undefined' && window.tibyan?.enrollments?.end) {
        return window.tibyan.enrollments.end(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: groupKeys.enrollments(groupId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      }
    },
  });
}

/**
 * Mutation for rescheduling a single session occurrence.
 */
export function useRescheduleSession(groupId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RescheduleSessionInput): Promise<IpcResult<SessionDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.sessions?.reschedule) {
        return window.tibyan.sessions.reschedule(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: sessionKeys.all });
        if (groupId) {
          queryClient.invalidateQueries({ queryKey: groupKeys.sessions(groupId) });
        }
        // Invalidate today dashboard if applicable
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'today'] });
      }
    },
  });
}
