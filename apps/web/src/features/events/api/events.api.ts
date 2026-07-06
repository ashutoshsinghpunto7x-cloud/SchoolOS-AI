import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  SchoolEvent,
  CreateEventPayload,
  UpdateEventPayload,
  UpdateEventStatusPayload,
  EventListOptions,
  UpcomingEventsOptions,
  EventReadReceipts,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/events';

export const eventsApi = {
  list: async (opts: EventListOptions = {}): Promise<PaginatedResponse<SchoolEvent>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<SchoolEvent>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<SchoolEvent> => {
    try {
      const res = await apiClient.get<{ data: SchoolEvent }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getUpcoming: async (opts: UpcomingEventsOptions = {}): Promise<SchoolEvent[]> => {
    try {
      const res = await apiClient.get<{ data: SchoolEvent[] }>(`${BASE}/upcoming`, { params: opts });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  create: async (payload: CreateEventPayload): Promise<SchoolEvent> => {
    try {
      const res = await apiClient.post<{ data: SchoolEvent }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateEventPayload): Promise<SchoolEvent> => {
    try {
      const res = await apiClient.patch<{ data: SchoolEvent }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateStatus: async (id: string, payload: UpdateEventStatusPayload): Promise<SchoolEvent> => {
    try {
      const res = await apiClient.patch<{ data: SchoolEvent }>(`${BASE}/${id}/status`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  markRead: async (id: string): Promise<void> => {
    try {
      await apiClient.post(`${BASE}/${id}/read`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getReadReceipts: async (id: string): Promise<EventReadReceipts> => {
    try {
      const res = await apiClient.get<{ data: EventReadReceipts }>(`${BASE}/${id}/read-receipts`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
