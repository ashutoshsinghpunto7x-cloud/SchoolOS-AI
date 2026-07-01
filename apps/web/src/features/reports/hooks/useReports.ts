import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import type {
  ReportCategory,
  ReportFilters,
  ReportAnalyticsData,
  SavedReport,
  CreateSavedReportPayload,
} from '@schoolos/types';

export const reportKeys = {
  all:        ['reports'] as const,
  analytics:  (cat: ReportCategory, f: ReportFilters) => [...reportKeys.all, 'analytics', cat, f] as const,
  saved:      () => [...reportKeys.all, 'saved'] as const,
  savedOne:   (id: string) => [...reportKeys.saved(), id] as const,
};

export const useAnalytics = (category: ReportCategory, filters: ReportFilters, enabled = true) =>
  useQuery<ReportAnalyticsData, Error>({
    queryKey:  reportKeys.analytics(category, filters),
    queryFn:   () => reportsApi.getAnalytics(category, filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

export const useSavedReports = () =>
  useQuery<SavedReport[], Error>({
    queryKey: reportKeys.saved(),
    queryFn:  reportsApi.listSavedReports,
  });

export const useSaveReport = () => {
  const qc = useQueryClient();
  return useMutation<SavedReport, Error, CreateSavedReportPayload>({
    mutationFn: reportsApi.saveReport,
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: reportKeys.saved() }); },
  });
};

export const useDeleteSavedReport = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: reportsApi.deleteSavedReport,
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: reportKeys.saved() }); },
  });
};
