import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  FollowUp,
  CreateFollowUpPayload,
  CompleteFollowUpPayload,
  RescheduleFollowUpPayload,
  FollowUpListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/follow-ups';

export const followUpApi = {
  create: async (payload: CreateFollowUpPayload): Promise<FollowUp> => {
    try {
      const res = await apiClient.post<{ data: FollowUp }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: FollowUpListOptions = {}): Promise<PaginatedResponse<FollowUp>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<FollowUp>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  complete: async (id: string, payload: CompleteFollowUpPayload = {}): Promise<FollowUp> => {
    try {
      const res = await apiClient.patch<{ data: FollowUp }>(`${BASE}/${id}/complete`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  reschedule: async (id: string, payload: RescheduleFollowUpPayload): Promise<FollowUp> => {
    try {
      const res = await apiClient.patch<{ data: FollowUp }>(`${BASE}/${id}/reschedule`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteFollowUp: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
