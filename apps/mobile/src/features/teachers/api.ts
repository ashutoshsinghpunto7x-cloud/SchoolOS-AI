import type {
  ApiResponse,
  ChangeStatusPayload,
  CreateTeacherNotePayload,
  CreateTeacherPayload,
  EmploymentStatus,
  PaginatedResponse,
  Teacher,
  TeacherListOptions,
  TeacherNote,
  UpdateTeacherNotePayload,
  UpdateTeacherPayload,
} from '@schoolos/types';
import { apiClient } from '@/services/api/client';

// Same shape as an expo-image-picker asset — kept minimal so this file
// doesn't depend on the picker library directly.
export interface PickedImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

function toPhotoFormData(image: PickedImage): FormData {
  const formData = new FormData();
  const name = image.fileName ?? 'photo.jpg';
  const type = image.mimeType ?? 'image/jpeg';
  // React Native's FormData accepts this { uri, name, type } object shape for
  // file fields — it is not a real Blob, but RN's fetch/XHR layer knows to
  // stream it from the given URI.
  formData.append('file', { uri: image.uri, name, type } as unknown as Blob);
  return formData;
}

export const teachersApi = {
  async list(options: TeacherListOptions = {}): Promise<PaginatedResponse<Teacher>> {
    const res = await apiClient.get<PaginatedResponse<Teacher>>('/teachers', { params: options });
    return res.data;
  },

  async search(query: string): Promise<Teacher[]> {
    const res = await apiClient.get<ApiResponse<Teacher[]>>('/teachers/search', { params: { q: query } });
    return res.data.data ?? [];
  },

  async getById(id: string): Promise<Teacher> {
    const res = await apiClient.get<ApiResponse<Teacher>>(`/teachers/${id}`);
    if (!res.data.data) throw new Error('Teacher response missing data');
    return res.data.data;
  },

  async create(payload: CreateTeacherPayload): Promise<Teacher> {
    const res = await apiClient.post<ApiResponse<Teacher>>('/teachers', payload);
    if (!res.data.data) throw new Error('Create teacher response missing data');
    return res.data.data;
  },

  async update(id: string, payload: UpdateTeacherPayload): Promise<Teacher> {
    const res = await apiClient.patch<ApiResponse<Teacher>>(`/teachers/${id}`, payload);
    if (!res.data.data) throw new Error('Update teacher response missing data');
    return res.data.data;
  },

  async changeStatus(id: string, payload: ChangeStatusPayload): Promise<Teacher> {
    const res = await apiClient.patch<ApiResponse<Teacher>>(`/teachers/${id}/status`, payload);
    if (!res.data.data) throw new Error('Change status response missing data');
    return res.data.data;
  },

  async uploadPhoto(id: string, image: PickedImage): Promise<Teacher> {
    const res = await apiClient.post<ApiResponse<Teacher>>(`/teachers/${id}/photo`, toPhotoFormData(image), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!res.data.data) throw new Error('Upload photo response missing data');
    return res.data.data;
  },

  async removePhoto(id: string): Promise<Teacher> {
    const res = await apiClient.delete<ApiResponse<Teacher>>(`/teachers/${id}/photo`);
    if (!res.data.data) throw new Error('Remove photo response missing data');
    return res.data.data;
  },

  async listNotes(teacherId: string): Promise<TeacherNote[]> {
    const res = await apiClient.get<ApiResponse<TeacherNote[]>>(`/teachers/${teacherId}/notes`);
    return res.data.data ?? [];
  },

  async createNote(teacherId: string, payload: CreateTeacherNotePayload): Promise<TeacherNote> {
    const res = await apiClient.post<ApiResponse<TeacherNote>>(`/teachers/${teacherId}/notes`, payload);
    if (!res.data.data) throw new Error('Create note response missing data');
    return res.data.data;
  },

  async updateNote(teacherId: string, noteId: string, payload: UpdateTeacherNotePayload): Promise<TeacherNote> {
    const res = await apiClient.patch<ApiResponse<TeacherNote>>(`/teachers/${teacherId}/notes/${noteId}`, payload);
    if (!res.data.data) throw new Error('Update note response missing data');
    return res.data.data;
  },

  async deleteNote(teacherId: string, noteId: string): Promise<void> {
    await apiClient.delete(`/teachers/${teacherId}/notes/${noteId}`);
  },
};

export type { EmploymentStatus };
