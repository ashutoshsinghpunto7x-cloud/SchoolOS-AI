import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  StudentChangeRequest,
  CreateChangeRequestPayload,
  RejectChangeRequestPayload,
} from '@schoolos/types';

export const studentChangeRequestsApi = {
  async create(payload: CreateChangeRequestPayload): Promise<StudentChangeRequest> {
    try {
      const res = await apiClient.post<ApiResponse<StudentChangeRequest>>('/student-change-requests', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listPending(): Promise<StudentChangeRequest[]> {
    try {
      const res = await apiClient.get<ApiResponse<StudentChangeRequest[]>>('/student-change-requests');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listPendingForStudent(studentId: string): Promise<StudentChangeRequest[]> {
    try {
      const res = await apiClient.get<ApiResponse<StudentChangeRequest[]>>(`/student-change-requests/student/${studentId}`);
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async approve(id: string): Promise<StudentChangeRequest> {
    try {
      const res = await apiClient.patch<ApiResponse<StudentChangeRequest>>(`/student-change-requests/${id}/approve`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async reject(id: string, payload: RejectChangeRequestPayload): Promise<StudentChangeRequest> {
    try {
      const res = await apiClient.patch<ApiResponse<StudentChangeRequest>>(`/student-change-requests/${id}/reject`, payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
