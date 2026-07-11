import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  TeacherTimetable,
  GetOrCreateTeacherTimetablePayload,
  BulkUpdateTeacherTimetableEntriesPayload,
  BulkUpdateTeacherTimetableEntriesResult,
  UpdateTeacherTimetableStatusPayload,
} from '@schoolos/types';

const BASE = '/teacher-timetable';

export const teacherTimetableApi = {
  getOrCreate: async (payload: GetOrCreateTeacherTimetablePayload): Promise<TeacherTimetable> => {
    try {
      const res = await apiClient.post<{ data: TeacherTimetable }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getForTeacher: async (teacherId: string): Promise<TeacherTimetable | null> => {
    try {
      const res = await apiClient.get<{ data: TeacherTimetable | null }>(`${BASE}/teacher/${teacherId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getMine: async (): Promise<TeacherTimetable | null> => {
    try {
      const res = await apiClient.get<{ data: TeacherTimetable | null }>(`${BASE}/me`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  bulkUpdateEntries: async (id: string, payload: BulkUpdateTeacherTimetableEntriesPayload): Promise<BulkUpdateTeacherTimetableEntriesResult> => {
    try {
      const res = await apiClient.put<{ data: BulkUpdateTeacherTimetableEntriesResult }>(`${BASE}/${id}/entries`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateStatus: async (id: string, payload: UpdateTeacherTimetableStatusPayload): Promise<TeacherTimetable> => {
    try {
      const res = await apiClient.patch<{ data: TeacherTimetable }>(`${BASE}/${id}/status`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
