import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  LeaveRequest,
  CreateLeaveRequestPayload,
  RejectLeaveRequestPayload,
} from '@schoolos/types';

export const leaveRequestsApi = {
  async create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    try {
      const res = await apiClient.post<ApiResponse<LeaveRequest>>('/leave-requests', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listMine(): Promise<LeaveRequest[]> {
    try {
      const res = await apiClient.get<ApiResponse<LeaveRequest[]>>('/leave-requests/mine');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listPending(): Promise<LeaveRequest[]> {
    try {
      const res = await apiClient.get<ApiResponse<LeaveRequest[]>>('/leave-requests/pending');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async approve(id: string): Promise<LeaveRequest> {
    try {
      const res = await apiClient.patch<ApiResponse<LeaveRequest>>(`/leave-requests/${id}/approve`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async reject(id: string, payload: RejectLeaveRequestPayload): Promise<LeaveRequest> {
    try {
      const res = await apiClient.patch<ApiResponse<LeaveRequest>>(`/leave-requests/${id}/reject`, payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
