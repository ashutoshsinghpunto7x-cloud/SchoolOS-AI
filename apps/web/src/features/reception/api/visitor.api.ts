import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Visitor,
  CreateVisitorPayload,
  CheckOutVisitorPayload,
  VisitorListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/visitors';

export const visitorApi = {
  create: async (payload: CreateVisitorPayload): Promise<Visitor> => {
    try {
      const res = await apiClient.post<{ data: Visitor }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: VisitorListOptions = {}): Promise<PaginatedResponse<Visitor>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Visitor>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Visitor> => {
    try {
      const res = await apiClient.get<{ data: Visitor }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  checkOut: async (id: string, payload: CheckOutVisitorPayload = {}): Promise<Visitor> => {
    try {
      const res = await apiClient.patch<{ data: Visitor }>(`${BASE}/${id}/check-out`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteVisitor: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
