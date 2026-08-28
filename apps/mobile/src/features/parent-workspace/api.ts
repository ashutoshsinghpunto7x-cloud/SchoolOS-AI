import type { ApiResponse } from '@schoolos/types';
import { apiClient } from '@/services/api/client';
import type { AcademicsBundle, AttendanceBundle, FeesBundle, ParentWorkspaceBundle } from './types';

export const parentWorkspaceApi = {
  async getWorkspace(childId?: string): Promise<ParentWorkspaceBundle> {
    const res = await apiClient.get<ApiResponse<ParentWorkspaceBundle>>('/parent-workspace', {
      params: childId ? { childId } : undefined,
    });
    if (!res.data.data) throw new Error('Workspace response missing data');
    return res.data.data;
  },

  async getAcademics(childId: string): Promise<AcademicsBundle> {
    const res = await apiClient.get<ApiResponse<AcademicsBundle>>('/parent-workspace/academics', {
      params: { childId },
    });
    if (!res.data.data) throw new Error('Academics response missing data');
    return res.data.data;
  },

  async getAttendance(childId: string, month?: string): Promise<AttendanceBundle> {
    const res = await apiClient.get<ApiResponse<AttendanceBundle>>('/parent-workspace/attendance', {
      params: month ? { childId, month } : { childId },
    });
    if (!res.data.data) throw new Error('Attendance response missing data');
    return res.data.data;
  },

  async getFees(childId: string): Promise<FeesBundle> {
    const res = await apiClient.get<ApiResponse<FeesBundle>>('/parent-workspace/fees', {
      params: { childId },
    });
    if (!res.data.data) throw new Error('Fees response missing data');
    return res.data.data;
  },
};
