import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, SchoolSettings } from '@schoolos/types';

export const schoolSettingsApi = {
  async getSettings(): Promise<SchoolSettings> {
    try {
      const res = await apiClient.get<ApiResponse<SchoolSettings>>('/school-settings');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async uploadLogo(file: File): Promise<SchoolSettings> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<ApiResponse<SchoolSettings>>('/school-settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async removeLogo(): Promise<SchoolSettings> {
    try {
      const res = await apiClient.delete<ApiResponse<SchoolSettings>>('/school-settings/logo');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
