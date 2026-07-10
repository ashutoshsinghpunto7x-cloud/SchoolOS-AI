import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, SchoolClass, ClassFeeOverviewRow } from '@schoolos/types';

export const schoolClassesApi = {
  async list(): Promise<SchoolClass[]> {
    try {
      const res = await apiClient.get<ApiResponse<SchoolClass[]>>('/school-classes');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getFeeOverview(): Promise<ClassFeeOverviewRow[]> {
    try {
      const res = await apiClient.get<ApiResponse<ClassFeeOverviewRow[]>>('/school-classes/fee-overview');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async create(name: string): Promise<SchoolClass> {
    try {
      const res = await apiClient.post<ApiResponse<SchoolClass>>('/school-classes', { name });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async rename(id: string, name: string): Promise<SchoolClass> {
    try {
      const res = await apiClient.patch<ApiResponse<SchoolClass>>(`/school-classes/${id}`, { name });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async addSection(id: string, section: string): Promise<SchoolClass> {
    try {
      const res = await apiClient.post<ApiResponse<SchoolClass>>(`/school-classes/${id}/sections`, { section });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async removeSection(id: string, section: string): Promise<SchoolClass> {
    try {
      const res = await apiClient.delete<ApiResponse<SchoolClass>>(`/school-classes/${id}/sections`, { data: { section } });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(`/school-classes/${id}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
