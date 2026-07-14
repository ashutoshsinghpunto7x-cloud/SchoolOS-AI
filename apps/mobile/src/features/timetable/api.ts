import type { ApiResponse, PeriodSlot, Timetable } from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const timetableApi = {
  async getTeacherSchedule(teacherId: string): Promise<Timetable[]> {
    const res = await apiClient.get<ApiResponse<Timetable[]>>(`/timetable/teacher/${teacherId}`);
    return res.data.data ?? [];
  },

  async getPeriods(): Promise<PeriodSlot[]> {
    const res = await apiClient.get<ApiResponse<PeriodSlot[]>>('/timetable/periods');
    return res.data.data ?? [];
  },
};
