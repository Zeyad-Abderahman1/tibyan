import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SessionAttendanceRosterDto,
  RecordAttendanceInput,
  AttendanceRecordDto,
  BatchRecordAttendanceInput,
  CompleteSessionInput,
  SessionDto,
  EndOfDayFollowUpDto,
} from '@tibyan/contracts';
import { dashboardKeys } from './useDashboard.js';
import { sessionKeys } from './useGroups.js';

export const attendanceKeys = {
  all: ['attendance'] as const,
  roster: (sessionId: string) => [...attendanceKeys.all, 'roster', sessionId] as const,
  endOfDay: (date: string) => [...attendanceKeys.all, 'endOfDay', date] as const,
};

/**
 * Fetches the attendance roster for a specific session.
 * Enabled only when sessionId is provided.
 */
export function useSessionRoster(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: attendanceKeys.roster(sessionId ?? ''),
    queryFn: async (): Promise<SessionAttendanceRosterDto> => {
      if (!sessionId) {
        throw new Error('NO_SESSION_ID');
      }
      if (typeof window !== 'undefined' && window.tibyan?.attendance?.getRoster) {
        const res = await window.tibyan.attendance.getRoster(sessionId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع سجل حضور الحصة');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    enabled: Boolean(sessionId),
  });
}

/**
 * Records or updates attendance for a single student.
 * Invalidates the session roster and Today dashboard cache on success.
 */
export function useRecordAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordAttendanceInput): Promise<AttendanceRecordDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.attendance?.record) {
        const res = await window.tibyan.attendance.record(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تسجيل حضور الطالب');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.roster(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.today() });
    },
  });
}

/**
 * Records attendance in bulk for multiple students.
 * Invalidates the session roster and Today dashboard cache on success.
 */
export function useBatchRecordAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BatchRecordAttendanceInput): Promise<AttendanceRecordDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.attendance?.batchRecord) {
        const res = await window.tibyan.attendance.batchRecord(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تسجيل الحضور الجماعي');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.roster(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.today() });
    },
  });
}

/**
 * Completes a session and auto-marks unmarked students as absent.
 * Invalidates the session roster, all session queries, and the Today dashboard cache.
 */
export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CompleteSessionInput): Promise<SessionDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.sessions?.complete) {
        const res = await window.tibyan.sessions.complete(input);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل إنهاء الحصة');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.roster(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.today() });
    },
  });
}

/**
 * Fetches the End-of-Day follow-up data (absent and late students) for a given date.
 */
export function useEndOfDayFollowUp(date: string) {
  return useQuery({
    queryKey: attendanceKeys.endOfDay(date),
    queryFn: async (): Promise<EndOfDayFollowUpDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.attendance?.getEndOfDay) {
        const res = await window.tibyan.attendance.getEndOfDay(date);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع متابعة نهاية اليوم');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    enabled: Boolean(date),
  });
}
