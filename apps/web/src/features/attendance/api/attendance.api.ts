import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Attendance,
  AttendanceSummary,
  MarkAttendancePayload,
  BulkAttendancePayload,
  UpdateAttendancePayload,
  AttendanceListOptions,
  StudentHistoryOptions,
  AttendanceSummaryOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/attendance';

export const attendanceApi = {
  markSingle: async (payload: MarkAttendancePayload): Promise<Attendance> => {
    try {
      const res = await apiClient.post<{ data: Attendance }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  bulkMark: async (payload: BulkAttendancePayload): Promise<Attendance[]> => {
    try {
      const res = await apiClient.post<{ data: Attendance[] }>(`${BASE}/bulk`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: AttendanceListOptions = {}): Promise<PaginatedResponse<Attendance>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Attendance>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Attendance> => {
    try {
      const res = await apiClient.get<{ data: Attendance }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateAttendancePayload): Promise<Attendance> => {
    try {
      const res = await apiClient.patch<{ data: Attendance }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteRecord: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getClassAttendance: async (cls: string, section: string, date?: string): Promise<Attendance[]> => {
    try {
      const res = await apiClient.get<{ data: Attendance[] }>(
        `${BASE}/class/${encodeURIComponent(cls)}/${encodeURIComponent(section)}`,
        { params: date ? { date } : {} },
      );
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getStudentHistory: async (
    studentId: string,
    opts: StudentHistoryOptions = {},
  ): Promise<PaginatedResponse<Attendance>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Attendance>>(
        `${BASE}/student/${studentId}`,
        { params: opts },
      );
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getSummary: async (opts: AttendanceSummaryOptions = {}): Promise<AttendanceSummary> => {
    try {
      const res = await apiClient.get<{ data: AttendanceSummary }>(`${BASE}/summary`, { params: opts });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
