import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse } from '@schoolos/types';
import type { AcademicsBundle, AttendanceBundle, FeesBundle, ParentWorkspaceBundle, ReportCardBundle } from '../types';

export const parentWorkspaceApi = {
  async getWorkspace(childId?: string): Promise<ParentWorkspaceBundle> {
    try {
      const res = await apiClient.get<ApiResponse<ParentWorkspaceBundle>>('/parent-workspace', {
        params: childId ? { childId } : undefined,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async askAI(childId: string, question: string): Promise<string> {
    try {
      const res = await apiClient.post<ApiResponse<{ text: string }>>('/parent-workspace/ai/ask', {
        childId,
        question,
      });
      return res.data.data!.text;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getAcademics(childId: string): Promise<AcademicsBundle> {
    try {
      const res = await apiClient.get<ApiResponse<AcademicsBundle>>('/parent-workspace/academics', {
        params: { childId },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getAttendance(childId: string, month?: string): Promise<AttendanceBundle> {
    try {
      const res = await apiClient.get<ApiResponse<AttendanceBundle>>('/parent-workspace/attendance', {
        params: { childId, month },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getFees(childId: string): Promise<FeesBundle> {
    try {
      const res = await apiClient.get<ApiResponse<FeesBundle>>('/parent-workspace/fees', {
        params: { childId },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getReportCard(childId: string): Promise<ReportCardBundle> {
    try {
      const res = await apiClient.get<ApiResponse<ReportCardBundle>>('/parent-workspace/report-card', {
        params: { childId },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
