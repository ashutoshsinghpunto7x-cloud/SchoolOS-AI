import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, ClassSectionSummary, UpsertClassTeacherPayload, RemoveClassTeacherPayload, ClassTeacherAssignment } from '@schoolos/types';

const BASE = '/classes';

export const classesApi = {
  async list(): Promise<ClassSectionSummary[]> {
    try {
      const res = await apiClient.get<ApiResponse<ClassSectionSummary[]>>(BASE);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async assignTeacher(payload: UpsertClassTeacherPayload): Promise<ClassTeacherAssignment> {
    try {
      const res = await apiClient.put<ApiResponse<ClassTeacherAssignment>>(`${BASE}/teacher`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async removeTeacher(payload: RemoveClassTeacherPayload): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/teacher`, { data: payload });
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
