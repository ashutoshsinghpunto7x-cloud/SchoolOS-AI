import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Teacher,
  TeacherNote,
  CreateTeacherPayload,
  UpdateTeacherPayload,
  TeacherListOptions,
  CreateTeacherNotePayload,
  UpdateTeacherNotePayload,
} from '@schoolos/types';

export const teachersApi = {
  // ── Teacher CRUD ──────────────────────────────────────────────────────────

  async create(payload: CreateTeacherPayload): Promise<Teacher> {
    try {
      const res = await apiClient.post<ApiResponse<Teacher>>('/teachers', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  /** Flat list for autocomplete — uses lightweight /search endpoint. */
  async list(search?: string): Promise<Teacher[]> {
    try {
      const res = await apiClient.get<ApiResponse<Teacher[]>>('/teachers/search', {
        params: search ? { q: search } : {},
      });
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listPaginated(opts: TeacherListOptions = {}): Promise<PaginatedResponse<Teacher>> {
    try {
      const res = await apiClient.get<PaginatedResponse<Teacher>>('/teachers', { params: opts });
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getById(id: string): Promise<Teacher> {
    try {
      const res = await apiClient.get<ApiResponse<Teacher>>(`/teachers/${id}`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async update(id: string, payload: UpdateTeacherPayload): Promise<Teacher> {
    try {
      const res = await apiClient.patch<ApiResponse<Teacher>>(`/teachers/${id}`, payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async uploadPhoto(id: string, file: File): Promise<Teacher> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<ApiResponse<Teacher>>(`/teachers/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async removePhoto(id: string): Promise<Teacher> {
    try {
      const res = await apiClient.delete<ApiResponse<Teacher>>(`/teachers/${id}/photo`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async changeStatus(id: string, status: string, reason?: string): Promise<Teacher> {
    try {
      const res = await apiClient.patch<ApiResponse<Teacher>>(`/teachers/${id}/status`, {
        status,
        reason,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteTeacher(id: string): Promise<void> {
    try {
      await apiClient.delete(`/teachers/${id}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async linkUser(teacherId: string, userId: string): Promise<Teacher> {
    try {
      const res = await apiClient.patch<ApiResponse<Teacher>>(`/teachers/${teacherId}/link-user`, { userId });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  // ── Notes ─────────────────────────────────────────────────────────────────

  async listNotes(teacherId: string): Promise<TeacherNote[]> {
    try {
      const res = await apiClient.get<ApiResponse<TeacherNote[]>>(`/teachers/${teacherId}/notes`);
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async createNote(teacherId: string, payload: CreateTeacherNotePayload): Promise<TeacherNote> {
    try {
      const res = await apiClient.post<ApiResponse<TeacherNote>>(
        `/teachers/${teacherId}/notes`,
        payload,
      );
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async updateNote(teacherId: string, noteId: string, payload: UpdateTeacherNotePayload): Promise<TeacherNote> {
    try {
      const res = await apiClient.patch<ApiResponse<TeacherNote>>(
        `/teachers/${teacherId}/notes/${noteId}`,
        payload,
      );
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteNote(teacherId: string, noteId: string): Promise<void> {
    try {
      await apiClient.delete(`/teachers/${teacherId}/notes/${noteId}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
