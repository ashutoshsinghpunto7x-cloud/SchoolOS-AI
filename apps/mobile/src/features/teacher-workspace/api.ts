import type { ApiResponse, TeacherWorkspaceData } from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const teacherWorkspaceApi = {
  async getMe(): Promise<TeacherWorkspaceData> {
    const res = await apiClient.get<ApiResponse<TeacherWorkspaceData>>('/teacher-workspace/me');
    if (!res.data.data) throw new Error('Workspace response missing data');
    return res.data.data;
  },
};
