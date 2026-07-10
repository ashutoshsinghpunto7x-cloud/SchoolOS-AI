import { useQuery } from '@tanstack/react-query';
import { principalApi } from '../api/principal.api';
import type { PrincipalDashboardData, TeachersSummaryData } from '@schoolos/types';

export const principalKeys = {
  all: ['principal'] as const,
  dashboard: () => [...principalKeys.all, 'dashboard'] as const,
  teachersSummary: (date?: string) => [...principalKeys.all, 'teachers-summary', date ?? ''] as const,
};

export const usePrincipalDashboard = () =>
  useQuery<PrincipalDashboardData, Error>({
    queryKey: principalKeys.dashboard(),
    queryFn: principalApi.getDashboard,
    staleTime: 2 * 60 * 1000,   // 2 minutes — refresh on tab focus after 2 min
    refetchOnWindowFocus: true,
  });

export const useTeachersSummary = (date?: string) =>
  useQuery<TeachersSummaryData, Error>({
    queryKey: principalKeys.teachersSummary(date),
    queryFn: () => principalApi.getTeachersSummary(date),
  });
