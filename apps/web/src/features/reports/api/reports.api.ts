import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  ReportCategory,
  ReportFilters,
  ReportAnalyticsData,
  SavedReport,
  CreateSavedReportPayload,
} from '@schoolos/types';

export const reportsApi = {
  async getAnalytics(category: ReportCategory, filters: ReportFilters = {}): Promise<ReportAnalyticsData> {
    try {
      const params = Object.fromEntries(
        Object.entries({ category, ...filters }).filter(([, v]) => v !== undefined && v !== ''),
      );
      const res = await apiClient.get<ApiResponse<ReportAnalyticsData>>(
        `/reports/analytics/${category}`,
        { params },
      );
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listSavedReports(): Promise<SavedReport[]> {
    try {
      const res = await apiClient.get<ApiResponse<SavedReport[]>>('/reports/saved');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async saveReport(payload: CreateSavedReportPayload): Promise<SavedReport> {
    try {
      const res = await apiClient.post<ApiResponse<SavedReport>>('/reports/saved', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getSavedReport(id: string): Promise<SavedReport> {
    try {
      const res = await apiClient.get<ApiResponse<SavedReport>>(`/reports/saved/${id}`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteSavedReport(id: string): Promise<void> {
    try {
      await apiClient.delete(`/reports/saved/${id}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
