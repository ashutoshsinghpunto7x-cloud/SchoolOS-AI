import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Student,
  StudentNote,
  CreateStudentPayload,
  UpdateStudentPayload,
  StudentListOptions,
  CreateStudentNotePayload,
  UpdateStudentNotePayload,
} from '@schoolos/types';

export const studentsApi = {
  // ── Student CRUD ──────────────────────────────────────────────────────────

  async create(payload: CreateStudentPayload): Promise<Student> {
    try {
      const res = await apiClient.post<ApiResponse<Student>>('/students', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  /** Backward-compat: returns flat Student[] for CommunicationWorkspace StudentSearch. */
  async list(search?: string): Promise<Student[]> {
    try {
      const res = await apiClient.get<ApiResponse<Student[]>>('/students/search', {
        params: search ? { q: search } : {},
      });
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  /** Server-side paginated list for StudentListPage. */
  async listPaginated(opts: StudentListOptions = {}): Promise<PaginatedResponse<Student>> {
    try {
      const res = await apiClient.get<PaginatedResponse<Student>>('/students', { params: opts });
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getById(id: string): Promise<Student> {
    try {
      const res = await apiClient.get<ApiResponse<Student>>(`/students/${id}`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async update(id: string, payload: UpdateStudentPayload): Promise<Student> {
    try {
      const res = await apiClient.patch<ApiResponse<Student>>(`/students/${id}`, payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async changeStatus(id: string, status: string, reason?: string): Promise<Student> {
    try {
      const res = await apiClient.patch<ApiResponse<Student>>(`/students/${id}/status`, {
        status,
        reason,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteStudent(id: string): Promise<void> {
    try {
      await apiClient.delete(`/students/${id}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  /** Single-request Excel/CSV import scoped to one class + section (teacher quick-add). */
  async quickImport(
    file: File,
    cls: string,
    section: string,
  ): Promise<{ totalRows: number; created: number; failed: number; errors: { row: number; message: string }[] }> {
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('class', cls);
      form.append('section', section);
      const res = await apiClient.post<ApiResponse<{
        totalRows: number; created: number; failed: number; errors: { row: number; message: string }[];
      }>>('/students/quick-import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  // ── Notes ─────────────────────────────────────────────────────────────────

  async listNotes(studentId: string): Promise<StudentNote[]> {
    try {
      const res = await apiClient.get<ApiResponse<StudentNote[]>>(`/students/${studentId}/notes`);
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async createNote(studentId: string, payload: CreateStudentNotePayload): Promise<StudentNote> {
    try {
      const res = await apiClient.post<ApiResponse<StudentNote>>(
        `/students/${studentId}/notes`,
        payload,
      );
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async updateNote(
    studentId: string,
    noteId: string,
    payload: UpdateStudentNotePayload,
  ): Promise<StudentNote> {
    try {
      const res = await apiClient.patch<ApiResponse<StudentNote>>(
        `/students/${studentId}/notes/${noteId}`,
        payload,
      );
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async deleteNote(studentId: string, noteId: string): Promise<void> {
    try {
      await apiClient.delete(`/students/${studentId}/notes/${noteId}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
