import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { TodayDashboardDto } from '@tibyan/contracts';

/**
 * Canonical query keys for the dashboard domain.
 * Centralized here to avoid duplicate definitions across hooks and feature modules.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  today: () => [...dashboardKeys.all, 'today'] as const,
};

export function invalidateDashboardQueries(
  queryClient: Pick<QueryClient, 'invalidateQueries'>
): Promise<unknown> {
  return queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

/**
 * Fetches the live Today Dashboard summary from the Main process.
 * Strictly read-only: never triggers session horizon materialization or state mutations.
 */
export function useTodayDashboard() {
  return useQuery({
    queryKey: dashboardKeys.today(),
    queryFn: async (): Promise<TodayDashboardDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.dashboard?.getToday) {
        const res = await window.tibyan.dashboard.getToday();
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل بيانات لوحة اليوم');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
  });
}
