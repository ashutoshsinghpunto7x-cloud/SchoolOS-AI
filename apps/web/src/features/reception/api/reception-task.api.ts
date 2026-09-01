import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ReceptionTask,
  CreateReceptionTaskPayload,
  UpdateReceptionTaskPayload,
  ReceptionTaskListOptions,
  ReceptionTaskStatus,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/reception-tasks';

export const receptionTaskApi = {
  create: async (payload: CreateReceptionTaskPayload): Promise<ReceptionTask> => {
    try {
      const res = await apiClient.post<{ data: ReceptionTask }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: ReceptionTaskListOptions = {}): Promise<PaginatedResponse<ReceptionTask>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<ReceptionTask>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateReceptionTaskPayload): Promise<ReceptionTask> => {
    try {
      const res = await apiClient.patch<{ data: ReceptionTask }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  setStatus: async (id: string, status: ReceptionTaskStatus): Promise<ReceptionTask> => {
    try {
      const res = await apiClient.patch<{ data: ReceptionTask }>(`${BASE}/${id}/status`, { status });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  complete: async (id: string, completionNotes?: string): Promise<ReceptionTask> => {
    try {
      const res = await apiClient.patch<{ data: ReceptionTask }>(`${BASE}/${id}/complete`, { completionNotes });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  snooze: async (id: string, dueDate: string): Promise<ReceptionTask> => {
    try {
      const res = await apiClient.patch<{ data: ReceptionTask }>(`${BASE}/${id}/snooze`, { dueDate });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteTask: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
