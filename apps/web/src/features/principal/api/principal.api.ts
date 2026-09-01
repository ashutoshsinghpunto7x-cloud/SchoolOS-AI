import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, PrincipalDashboardData, TeachersSummaryData, PrincipalBriefingSummary, PrincipalRecruitmentDashboard } from '@schoolos/types';

export const principalApi = {
  async getDashboard(): Promise<PrincipalDashboardData> {
    try {
      const res = await apiClient.get<ApiResponse<PrincipalDashboardData>>('/principal/dashboard');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getTeachersSummary(date?: string): Promise<TeachersSummaryData> {
    try {
      const res = await apiClient.get<ApiResponse<TeachersSummaryData>>('/principal/teachers-summary', {
        params: date ? { date } : {},
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getBriefingSummary(): Promise<PrincipalBriefingSummary> {
    try {
      const res = await apiClient.post<ApiResponse<PrincipalBriefingSummary>>('/principal/briefing-summary');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  /** Reception Management Module SRD, Module 7 — combined recruitment +
   *  admissions overview (CVs awaiting review, forms pending verification,
   *  today's interviews/visitor appointments merged). */
  async getRecruitmentDashboard(): Promise<PrincipalRecruitmentDashboard> {
    try {
      const res = await apiClient.get<ApiResponse<PrincipalRecruitmentDashboard>>('/principal/recruitment-dashboard');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
