import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, TeacherWorkspaceData } from '@schoolos/types';

export const teacherWorkspaceApi = {
  async getMe(): Promise<TeacherWorkspaceData> {
    try {
      const res = await apiClient.get<ApiResponse<TeacherWorkspaceData>>('/teacher-workspace/me');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
