import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, OperationsSummary } from '@schoolos/types';

export const operationsApi = {
  async getSummary(): Promise<OperationsSummary> {
    try {
      const res = await apiClient.get<ApiResponse<OperationsSummary>>('/operations/summary');
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
