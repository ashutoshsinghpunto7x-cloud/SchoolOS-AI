import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse, CollectionScheduleEntry, UpsertCollectionSchedulePayload } from '@schoolos/types';

const BASE = '/collection-schedule';

export const collectionScheduleApi = {
  async list(academicYear: string): Promise<CollectionScheduleEntry[]> {
    try {
      const res = await apiClient.get<ApiResponse<CollectionScheduleEntry[]>>(BASE, { params: { academicYear } });
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async upsert(payload: UpsertCollectionSchedulePayload): Promise<CollectionScheduleEntry> {
    try {
      const res = await apiClient.post<ApiResponse<CollectionScheduleEntry>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async remove(academicYear: string, depositMonth: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${encodeURIComponent(depositMonth)}`, { params: { academicYear } });
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async useDefaultSchedule(academicYear: string): Promise<CollectionScheduleEntry[]> {
    try {
      const res = await apiClient.post<ApiResponse<CollectionScheduleEntry[]>>(`${BASE}/use-default`, { academicYear });
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
