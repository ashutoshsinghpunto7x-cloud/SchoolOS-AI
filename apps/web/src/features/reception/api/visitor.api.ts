import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Visitor,
  VisitorIdProofType,
  CreateVisitorPayload,
  UpdateVisitorStatusPayload,
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

  getHistory: async (id: string): Promise<Visitor[]> => {
    try {
      const res = await apiClient.get<{ data: Visitor[] }>(`${BASE}/${id}/history`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateStatus: async (id: string, payload: UpdateVisitorStatusPayload): Promise<Visitor> => {
    try {
      const res = await apiClient.patch<{ data: Visitor }>(`${BASE}/${id}/status`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  uploadPhoto: async (id: string, file: File): Promise<Visitor> => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.patch<{ data: Visitor }>(`${BASE}/${id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  uploadIdProof: async (id: string, idProofType: VisitorIdProofType, file: File): Promise<Visitor> => {
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('idProofType', idProofType);
      const res = await apiClient.patch<{ data: Visitor }>(`${BASE}/${id}/id-proof`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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

  arriveFromAppointment: async (appointmentId: string): Promise<Visitor> => {
    try {
      const res = await apiClient.post<{ data: Visitor }>(`${BASE}/appointments/${appointmentId}/arrive`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
