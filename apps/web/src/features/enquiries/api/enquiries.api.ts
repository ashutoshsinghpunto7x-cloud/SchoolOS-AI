import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Enquiry,
  EnquiryNote,
  StageCounts,
  CreateEnquiryPayload,
  UpdateEnquiryPayload,
  UpdateEnquiryStagePayload,
  ConvertToStudentPayload,
  ConvertToStudentResult,
  EnquiryListOptions,
  CreateEnquiryNotePayload,
  UpdateEnquiryNotePayload,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/enquiries';

export const enquiriesApi = {
  // ── Enquiry CRUD ─────────────────────────────────────────────────────────────

  create: async (payload: CreateEnquiryPayload): Promise<Enquiry> => {
    try {
      const res = await apiClient.post<{ data: Enquiry }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: EnquiryListOptions = {}): Promise<PaginatedResponse<Enquiry>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Enquiry>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getStageCounts: async (): Promise<StageCounts[]> => {
    try {
      const res = await apiClient.get<{ data: StageCounts[] }>(`${BASE}/stage-counts`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Enquiry> => {
    try {
      const res = await apiClient.get<{ data: Enquiry }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateEnquiryPayload): Promise<Enquiry> => {
    try {
      const res = await apiClient.patch<{ data: Enquiry }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateStage: async (id: string, payload: UpdateEnquiryStagePayload): Promise<Enquiry> => {
    try {
      const res = await apiClient.patch<{ data: Enquiry }>(`${BASE}/${id}/stage`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  convert: async (id: string, payload: ConvertToStudentPayload): Promise<ConvertToStudentResult> => {
    try {
      const res = await apiClient.post<{ data: ConvertToStudentResult }>(`${BASE}/${id}/convert`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Notes ─────────────────────────────────────────────────────────────────────

  listNotes: async (enquiryId: string): Promise<EnquiryNote[]> => {
    try {
      const res = await apiClient.get<{ data: EnquiryNote[] }>(`${BASE}/${enquiryId}/notes`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  createNote: async (enquiryId: string, payload: CreateEnquiryNotePayload): Promise<EnquiryNote> => {
    try {
      const res = await apiClient.post<{ data: EnquiryNote }>(`${BASE}/${enquiryId}/notes`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateNote: async (
    enquiryId: string,
    noteId: string,
    payload: UpdateEnquiryNotePayload,
  ): Promise<EnquiryNote> => {
    try {
      const res = await apiClient.patch<{ data: EnquiryNote }>(
        `${BASE}/${enquiryId}/notes/${noteId}`,
        payload,
      );
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteNote: async (enquiryId: string, noteId: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${enquiryId}/notes/${noteId}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
