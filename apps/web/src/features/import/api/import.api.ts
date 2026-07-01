import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  ImportSession,
  ImportRow,
  ImportTemplate,
  ImportType,
  ImportRowStatus,
} from '@schoolos/types';

const handle = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  try {
    const res = await promise;
    return res.data.data!;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

export const importApi = {
  // Upload a file and create a new import session
  async upload(importType: ImportType, file: File): Promise<ImportSession> {
    const form = new FormData();
    form.append('file', file);
    form.append('importType', importType);
    try {
      const res = await apiClient.post<ApiResponse<ImportSession>>('/import/sessions', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  // List import sessions
  async list(params: { page?: number; limit?: number; importType?: ImportType; status?: string } = {}): Promise<PaginatedResponse<ImportSession>> {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.importType) query.set('importType', params.importType);
      if (params.status) query.set('status', params.status);
      const res = await apiClient.get<PaginatedResponse<ImportSession>>(
        `/import/sessions${query.toString() ? `?${query}` : ''}`
      );
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  getById: (id: string) =>
    handle(apiClient.get<ApiResponse<ImportSession>>(`/import/sessions/${id}`)),

  // Get rows for a session
  async getRows(id: string, params: { page?: number; limit?: number; status?: ImportRowStatus } = {}): Promise<PaginatedResponse<ImportRow>> {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      const res = await apiClient.get<PaginatedResponse<ImportRow>>(
        `/import/sessions/${id}/rows${query.toString() ? `?${query}` : ''}`
      );
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  updateMapping: (id: string, mapping: Record<string, string>) =>
    handle(apiClient.patch<ApiResponse<ImportSession>>(`/import/sessions/${id}/mapping`, { mapping })),

  confirm: (id: string) =>
    handle(apiClient.post<ApiResponse<ImportSession>>(`/import/sessions/${id}/confirm`, {})),

  cancel: (id: string) =>
    handle(apiClient.post<ApiResponse<ImportSession>>(`/import/sessions/${id}/cancel`, {})),

  rollback: (id: string) =>
    handle(apiClient.post<ApiResponse<ImportSession>>(`/import/sessions/${id}/rollback`, {})),

  listTemplates: () =>
    handle(apiClient.get<ApiResponse<ImportTemplate[]>>('/import/templates')),

  // Returns a download URL for the template
  getTemplateDownloadUrl: (importType: ImportType) =>
    `/import/templates/${importType}/download`,
};
