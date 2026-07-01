import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, PrincipalDashboardData } from '@schoolos/types';

export const principalApi = {
  async getDashboard(): Promise<PrincipalDashboardData> {
    try {
      const res = await apiClient.get<ApiResponse<PrincipalDashboardData>>('/principal/dashboard');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
