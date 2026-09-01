import { apiClient, extractErrorMessage } from '@/services/api';
import type { AcademicYear, UpsertAcademicYearPayload } from '@schoolos/types';

const BASE = '/academic-year';

export const academicYearApi = {
  getCurrent: async (): Promise<AcademicYear> => {
    try {
      const res = await apiClient.get<{ data: AcademicYear }>(`${BASE}/current`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  upsert: async (payload: UpsertAcademicYearPayload): Promise<AcademicYear> => {
    try {
      const res = await apiClient.put<{ data: AcademicYear }>(`${BASE}/current`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
