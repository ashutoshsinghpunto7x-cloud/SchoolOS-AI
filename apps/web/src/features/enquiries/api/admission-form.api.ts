import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  AdmissionForm,
  IssueAdmissionFormPayload,
  UpdateAdmissionFormPaymentPayload,
  VerifyAdmissionFormPayload,
  AddChecklistItemPayload,
  UpdateChecklistItemPayload,
  AdmissionFormListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/admission-forms';

export const admissionFormApi = {
  issue: async (payload: IssueAdmissionFormPayload): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.post<{ data: AdmissionForm }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: AdmissionFormListOptions = {}): Promise<PaginatedResponse<AdmissionForm>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<AdmissionForm>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.get<{ data: AdmissionForm }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getByEnquiry: async (enquiryId: string): Promise<AdmissionForm | null> => {
    try {
      const res = await apiClient.get<{ data: AdmissionForm | null }>(`${BASE}/by-enquiry/${enquiryId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updatePayment: async (id: string, payload: UpdateAdmissionFormPaymentPayload): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.patch<{ data: AdmissionForm }>(`${BASE}/${id}/payment`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  recordSubmission: async (id: string): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.patch<{ data: AdmissionForm }>(`${BASE}/${id}/submit`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  resubmit: async (id: string): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.patch<{ data: AdmissionForm }>(`${BASE}/${id}/resubmit`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  verify: async (id: string, payload: VerifyAdmissionFormPayload): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.patch<{ data: AdmissionForm }>(`${BASE}/${id}/verify`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  addChecklistItem: async (id: string, payload: AddChecklistItemPayload): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.post<{ data: AdmissionForm }>(`${BASE}/${id}/checklist`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  removeChecklistItem: async (id: string, itemId: string): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.delete<{ data: AdmissionForm }>(`${BASE}/${id}/checklist/${itemId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateChecklistItem: async (id: string, itemId: string, payload: UpdateChecklistItemPayload): Promise<AdmissionForm> => {
    try {
      const res = await apiClient.patch<{ data: AdmissionForm }>(`${BASE}/${id}/checklist/${itemId}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  uploadChecklistItemFile: async (id: string, itemId: string, file: File): Promise<AdmissionForm> => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.patch<{ data: AdmissionForm }>(`${BASE}/${id}/checklist/${itemId}/file`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteForm: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
