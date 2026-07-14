import type { AccountantDashboardData, ApiResponse } from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const dashboardApi = {
  async getAccountantDashboard(): Promise<AccountantDashboardData> {
    const res = await apiClient.get<ApiResponse<AccountantDashboardData>>('/accountant-workspace/dashboard');
    if (!res.data.data) throw new Error('Accountant dashboard response missing data');
    return res.data.data;
  },
};
