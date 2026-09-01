import { apiClient, extractErrorMessage } from '@/services/api';
import type { AdmissionsReport, RecruitmentReport, VisitorReport, FrontOfficeReportDateRange, ApiResponse } from '@schoolos/types';

const BASE = '/reports/front-office';

export const frontOfficeReportsApi = {
  async getAdmissions(range: FrontOfficeReportDateRange = {}): Promise<AdmissionsReport> {
    try {
      const res = await apiClient.get<ApiResponse<AdmissionsReport>>(`${BASE}/admissions`, { params: range });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getRecruitment(range: FrontOfficeReportDateRange = {}): Promise<RecruitmentReport> {
    try {
      const res = await apiClient.get<ApiResponse<RecruitmentReport>>(`${BASE}/recruitment`, { params: range });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getVisitors(range: FrontOfficeReportDateRange = {}): Promise<VisitorReport> {
    try {
      const res = await apiClient.get<ApiResponse<VisitorReport>>(`${BASE}/visitors`, { params: range });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
