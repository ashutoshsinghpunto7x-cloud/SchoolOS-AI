import type {
  ApiResponse,
  ConvertToStudentPayload,
  ConvertToStudentResult,
  CreateEnquiryNotePayload,
  CreateEnquiryPayload,
  Enquiry,
  EnquiryListOptions,
  EnquiryNote,
  PaginatedResponse,
  StageCounts,
  UpdateEnquiryNotePayload,
  UpdateEnquiryPayload,
  UpdateEnquiryStagePayload,
} from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const enquiriesApi = {
  async list(options: EnquiryListOptions = {}): Promise<PaginatedResponse<Enquiry>> {
    const res = await apiClient.get<PaginatedResponse<Enquiry>>('/enquiries', { params: options });
    return res.data;
  },

  async getStageCounts(): Promise<StageCounts[]> {
    const res = await apiClient.get<ApiResponse<StageCounts[]>>('/enquiries/stage-counts');
    return res.data.data ?? [];
  },

  async getById(id: string): Promise<Enquiry> {
    const res = await apiClient.get<ApiResponse<Enquiry>>(`/enquiries/${id}`);
    if (!res.data.data) throw new Error('Enquiry response missing data');
    return res.data.data;
  },

  async create(payload: CreateEnquiryPayload): Promise<Enquiry> {
    const res = await apiClient.post<ApiResponse<Enquiry>>('/enquiries', payload);
    if (!res.data.data) throw new Error('Create enquiry response missing data');
    return res.data.data;
  },

  async update(id: string, payload: UpdateEnquiryPayload): Promise<Enquiry> {
    const res = await apiClient.patch<ApiResponse<Enquiry>>(`/enquiries/${id}`, payload);
    if (!res.data.data) throw new Error('Update enquiry response missing data');
    return res.data.data;
  },

  async updateStage(id: string, payload: UpdateEnquiryStagePayload): Promise<Enquiry> {
    const res = await apiClient.patch<ApiResponse<Enquiry>>(`/enquiries/${id}/stage`, payload);
    if (!res.data.data) throw new Error('Update stage response missing data');
    return res.data.data;
  },

  async convert(id: string, payload: ConvertToStudentPayload): Promise<ConvertToStudentResult> {
    const res = await apiClient.post<ApiResponse<ConvertToStudentResult>>(`/enquiries/${id}/convert`, payload);
    if (!res.data.data) throw new Error('Convert response missing data');
    return res.data.data;
  },

  async listNotes(enquiryId: string): Promise<EnquiryNote[]> {
    const res = await apiClient.get<ApiResponse<EnquiryNote[]>>(`/enquiries/${enquiryId}/notes`);
    return res.data.data ?? [];
  },

  async createNote(enquiryId: string, payload: CreateEnquiryNotePayload): Promise<EnquiryNote> {
    const res = await apiClient.post<ApiResponse<EnquiryNote>>(`/enquiries/${enquiryId}/notes`, payload);
    if (!res.data.data) throw new Error('Create note response missing data');
    return res.data.data;
  },

  async updateNote(enquiryId: string, noteId: string, payload: UpdateEnquiryNotePayload): Promise<EnquiryNote> {
    const res = await apiClient.patch<ApiResponse<EnquiryNote>>(`/enquiries/${enquiryId}/notes/${noteId}`, payload);
    if (!res.data.data) throw new Error('Update note response missing data');
    return res.data.data;
  },

  async deleteNote(enquiryId: string, noteId: string): Promise<void> {
    await apiClient.delete(`/enquiries/${enquiryId}/notes/${noteId}`);
  },
};
