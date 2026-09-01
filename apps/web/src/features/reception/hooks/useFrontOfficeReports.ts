import { useQuery } from '@tanstack/react-query';
import { frontOfficeReportsApi } from '../api/front-office-reports.api';
import type { FrontOfficeReportDateRange } from '@schoolos/types';

export const frontOfficeReportKeys = {
  all:         ['front-office-reports'] as const,
  admissions:  (r: FrontOfficeReportDateRange) => [...frontOfficeReportKeys.all, 'admissions', r] as const,
  recruitment: (r: FrontOfficeReportDateRange) => [...frontOfficeReportKeys.all, 'recruitment', r] as const,
  visitors:    (r: FrontOfficeReportDateRange) => [...frontOfficeReportKeys.all, 'visitors', r] as const,
};

export const useAdmissionsReport = (range: FrontOfficeReportDateRange = {}) =>
  useQuery({
    queryKey: frontOfficeReportKeys.admissions(range),
    queryFn:  () => frontOfficeReportsApi.getAdmissions(range),
  });

export const useRecruitmentReport = (range: FrontOfficeReportDateRange = {}) =>
  useQuery({
    queryKey: frontOfficeReportKeys.recruitment(range),
    queryFn:  () => frontOfficeReportsApi.getRecruitment(range),
  });

export const useVisitorReport = (range: FrontOfficeReportDateRange = {}) =>
  useQuery({
    queryKey: frontOfficeReportKeys.visitors(range),
    queryFn:  () => frontOfficeReportsApi.getVisitors(range),
  });
