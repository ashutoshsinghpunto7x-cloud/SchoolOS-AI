import { useQuery, useMutation } from '@tanstack/react-query';
import { principalApi } from '../api/principal.api';
import type { PrincipalDashboardData, TeachersSummaryData, PrincipalBriefingSummary, PrincipalRecruitmentDashboard } from '@schoolos/types';

export const principalKeys = {
  all: ['principal'] as const,
  dashboard: () => [...principalKeys.all, 'dashboard'] as const,
  teachersSummary: (date?: string) => [...principalKeys.all, 'teachers-summary', date ?? ''] as const,
  recruitmentDashboard: () => [...principalKeys.all, 'recruitment-dashboard'] as const,
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
    staleTime: 30 * 1000,        // 30s — matches the polling cadence below
    refetchOnWindowFocus: true,
    // Attendance is marked by teachers throughout the morning while a principal
    // may keep this dashboard open and focused the whole time — refetchOnWindowFocus
    // alone never fires without a blur/focus cycle, so poll to stay live.
    refetchInterval: 30 * 1000,
    enabled,
  });

export const useTeachersSummary = (date?: string) =>
  useQuery<TeachersSummaryData, Error>({
    queryKey: principalKeys.teachersSummary(date),
    queryFn: () => principalApi.getTeachersSummary(date),
  });

export const useRecruitmentDashboard = () =>
  useQuery<PrincipalRecruitmentDashboard, Error>({
    queryKey: principalKeys.recruitmentDashboard(),
    queryFn: principalApi.getRecruitmentDashboard,
    refetchInterval: 60 * 1000,
  });

// On-demand action (not a query) — the Daily Briefing card's "Summarize with
// AI" button calls this explicitly rather than on every dashboard load.
export const useBriefingSummary = () =>
  useMutation<PrincipalBriefingSummary, Error, void>({
    mutationFn: principalApi.getBriefingSummary,
  });
