import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, AdminOverviewData } from '@schoolos/types';

export const adminOverviewApi = {
  async get(): Promise<AdminOverviewData> {
    try {
      const res = await apiClient.get<ApiResponse<AdminOverviewData>>('/admin-overview');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
