import { useQuery } from '@tanstack/react-query';
import { principalApi } from '../api/principal.api';
import type { PrincipalDashboardData, TeachersSummaryData } from '@schoolos/types';

export const principalKeys = {
  all: ['principal'] as const,
  dashboard: () => [...principalKeys.all, 'dashboard'] as const,
  teachersSummary: (date?: string) => [...principalKeys.all, 'teachers-summary', date ?? ''] as const,
};

// `enabled` defaults to true (principal's own dashboard always wants this).
// The admin/reception dashboard (ReceptionWorkspace) reuses this same query
// to show an attendance-today figure and upcoming events — the /principal/
// dashboard API already allows the admin role (see principal.routes.ts), but
// NOT the reception role, so that page passes `enabled: isAdmin` to avoid a
// 403 for actual reception staff.
export const usePrincipalDashboard = (enabled = true) =>
  useQuery<PrincipalDashboardData, Error>({
    queryKey: principalKeys.dashboard(),
    queryFn: principalApi.getDashboard,
    staleTime: 2 * 60 * 1000,   // 2 minutes — refresh on tab focus after 2 min
    refetchOnWindowFocus: true,
    enabled,
  });

export const useTeachersSummary = (date?: string) =>
  useQuery<TeachersSummaryData, Error>({
    queryKey: principalKeys.teachersSummary(date),
    queryFn: () => principalApi.getTeachersSummary(date),
  });
