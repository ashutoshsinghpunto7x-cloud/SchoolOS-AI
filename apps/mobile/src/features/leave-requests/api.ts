import type { ApiResponse, CreateLeaveRequestPayload, LeaveRequest } from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const leaveRequestsApi = {
  async listMine(): Promise<LeaveRequest[]> {
    const res = await apiClient.get<ApiResponse<LeaveRequest[]>>('/leave-requests/mine');
    return res.data.data ?? [];
  },

  async create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    const res = await apiClient.post<ApiResponse<LeaveRequest>>('/leave-requests', payload);
    if (!res.data.data) throw new Error('Create leave request response missing data');
    return res.data.data;
  },
};
