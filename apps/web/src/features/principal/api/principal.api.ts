import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, PrincipalDashboardData, TeachersSummaryData, PrincipalBriefingSummary } from '@schoolos/types';

export const principalApi = {
  async getDashboard(): Promise<PrincipalDashboardData> {
    try {
      const res = await apiClient.get<ApiResponse<PrincipalDashboardData>>('/principal/dashboard');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getTeachersSummary(date?: string): Promise<TeachersSummaryData> {
    try {
      const res = await apiClient.get<ApiResponse<TeachersSummaryData>>('/principal/teachers-summary', {
        params: date ? { date } : {},
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getBriefingSummary(): Promise<PrincipalBriefingSummary> {
    try {
      const res = await apiClient.post<ApiResponse<PrincipalBriefingSummary>>('/principal/briefing-summary');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
