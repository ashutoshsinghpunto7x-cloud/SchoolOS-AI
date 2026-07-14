import type {
  ApiResponse,
  Attendance,
  AttendanceSummary,
  AttendanceSummaryOptions,
  BulkAttendancePayload,
  PaginatedResponse,
  StudentHistoryOptions,
} from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const attendanceApi = {
  async getSummary(options: AttendanceSummaryOptions = {}): Promise<AttendanceSummary> {
    const res = await apiClient.get<ApiResponse<AttendanceSummary>>('/attendance/summary', { params: options });
    if (!res.data.data) throw new Error('Attendance summary response missing data');
    return res.data.data;
  },

  async getClassAttendance(klass: string, section: string, date?: string): Promise<Attendance[]> {
    const res = await apiClient.get<ApiResponse<Attendance[]>>(
      `/attendance/class/${encodeURIComponent(klass)}/${encodeURIComponent(section)}`,
      { params: date ? { date } : undefined }
    );
    return res.data.data ?? [];
  },

  async getStudentHistory(studentId: string, options: StudentHistoryOptions = {}): Promise<PaginatedResponse<Attendance>> {
    const res = await apiClient.get<PaginatedResponse<Attendance>>(`/attendance/student/${studentId}`, {
      params: options,
    });
    return res.data;
  },

  async bulkMark(payload: BulkAttendancePayload): Promise<Attendance[]> {
    const res = await apiClient.post<ApiResponse<Attendance[]>>('/attendance/bulk', payload);
    return res.data.data ?? [];
  },
};
