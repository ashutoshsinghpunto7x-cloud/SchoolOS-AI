import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, PrincipalDashboardData, TeachersSummaryData } from '@schoolos/types';

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
};
