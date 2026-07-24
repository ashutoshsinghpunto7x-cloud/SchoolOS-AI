import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  BehaviorOption,
  BehaviorRecord,
  BehaviorWindowStatus,
  CreateBehaviorOptionPayload,
  UpdateBehaviorOptionPayload,
  MarkBehaviorPayload,
  BulkBehaviorPayload,
  BehaviorHistoryOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/behavior';

export const behaviorApi = {
  listOptions: async (): Promise<BehaviorOption[]> => {
    try {
      const res = await apiClient.get<{ data: BehaviorOption[] }>(`${BASE}/options`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  createOption: async (payload: CreateBehaviorOptionPayload): Promise<BehaviorOption> => {
    try {
      const res = await apiClient.post<{ data: BehaviorOption }>(`${BASE}/options`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateOption: async (id: string, payload: UpdateBehaviorOptionPayload): Promise<BehaviorOption> => {
    try {
      const res = await apiClient.patch<{ data: BehaviorOption }>(`${BASE}/options/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getWindowStatus: async (): Promise<BehaviorWindowStatus> => {
    try {
      const res = await apiClient.get<{ data: BehaviorWindowStatus }>(`${BASE}/window`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  markSingle: async (payload: MarkBehaviorPayload): Promise<BehaviorRecord> => {
    try {
      const res = await apiClient.post<{ data: BehaviorRecord }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  bulkMark: async (payload: BulkBehaviorPayload): Promise<BehaviorRecord[]> => {
    try {
      const res = await apiClient.post<{ data: BehaviorRecord[] }>(`${BASE}/bulk`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getClassRecords: async (cls: string, section: string, date?: string): Promise<BehaviorRecord[]> => {
    try {
      const res = await apiClient.get<{ data: BehaviorRecord[] }>(
        `${BASE}/class/${encodeURIComponent(cls)}/${encodeURIComponent(section)}`,
        { params: date ? { date } : {} },
      );
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getStudentHistory: async (
    studentId: string,
    opts: BehaviorHistoryOptions = {},
  ): Promise<PaginatedResponse<BehaviorRecord>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<BehaviorRecord>>(`${BASE}/student/${studentId}`, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteRecord: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
