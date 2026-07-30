import { apiClient, extractErrorMessage } from '@/services/api';
import type { SyllabusCoverage, SyllabusActivityDay } from '@schoolos/types';

const BASE = '/syllabus-tracker';

export const syllabusTrackerApi = {
  getOverview: async (): Promise<SyllabusCoverage[]> => {
    try {
      const res = await apiClient.get<{ data: SyllabusCoverage[] }>(`${BASE}/overview`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getActivity: async (): Promise<SyllabusActivityDay[]> => {
    try {
      const res = await apiClient.get<{ data: SyllabusActivityDay[] }>(`${BASE}/activity`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
