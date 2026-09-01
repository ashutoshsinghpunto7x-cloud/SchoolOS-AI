import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  VisitorAppointment,
  CreateVisitorAppointmentPayload,
  VisitorAppointmentListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/visitors/appointments';

export const visitorAppointmentApi = {
  create: async (payload: CreateVisitorAppointmentPayload): Promise<VisitorAppointment> => {
    try {
      const res = await apiClient.post<{ data: VisitorAppointment }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: VisitorAppointmentListOptions = {}): Promise<PaginatedResponse<VisitorAppointment>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<VisitorAppointment>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  cancel: async (id: string, reason?: string): Promise<VisitorAppointment> => {
    try {
      const res = await apiClient.patch<{ data: VisitorAppointment }>(`${BASE}/${id}/cancel`, { reason });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  markNoShow: async (id: string): Promise<VisitorAppointment> => {
    try {
      const res = await apiClient.patch<{ data: VisitorAppointment }>(`${BASE}/${id}/no-show`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
