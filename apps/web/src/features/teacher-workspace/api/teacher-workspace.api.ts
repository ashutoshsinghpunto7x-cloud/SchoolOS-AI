import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  TeacherWorkspaceData,
  UpsertOwnTimetableEntryPayload,
  RemoveOwnTimetableEntryPayload,
  Timetable,
} from '@schoolos/types';

export const teacherWorkspaceApi = {
  async getMe(): Promise<TeacherWorkspaceData> {
    try {
      const res = await apiClient.get<ApiResponse<TeacherWorkspaceData>>('/teacher-workspace/me');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async upsertTimetableEntry(payload: UpsertOwnTimetableEntryPayload): Promise<Timetable> {
    try {
      const res = await apiClient.post<ApiResponse<Timetable>>('/teacher-workspace/timetable/entry', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async removeTimetableEntry(payload: RemoveOwnTimetableEntryPayload): Promise<Timetable> {
    try {
      const res = await apiClient.delete<ApiResponse<Timetable>>('/teacher-workspace/timetable/entry', {
        data: payload,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
