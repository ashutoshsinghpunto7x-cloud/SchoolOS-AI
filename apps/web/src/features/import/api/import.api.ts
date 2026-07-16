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

export interface ColumnMappingSuggestion {
  sourceColumn: string;
  suggestedField: string | null;
  confidence: number;
  fieldLabel: string;
  requiresConfirmation: boolean;
}

export interface ImportMappingTemplate {
  _id: string;
  schoolId: string;
  importType: ImportType;
  name?: string;
  mapping: Record<string, string>;
  createdBy: string;
  createdAt: string;
}

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
  async getRows(id: string, params: { page?: number; limit?: number; status?: ImportRowStatus; search?: string } = {}): Promise<PaginatedResponse<ImportRow>> {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.search) query.set('search', params.search);
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

  updateRow: (id: string, rowNumber: number, mappedData: Record<string, unknown>) =>
    handle(apiClient.patch<ApiResponse<{ session: ImportSession; row: ImportRow }>>(
      `/import/sessions/${id}/rows/${rowNumber}`, { mappedData },
    )),

  addRow: (id: string, mappedData: Record<string, unknown> = {}) =>
    handle(apiClient.post<ApiResponse<{ session: ImportSession; row: ImportRow }>>(
      `/import/sessions/${id}/rows`, { mappedData },
    )),

  deleteRow: (id: string, rowNumber: number) =>
    handle(apiClient.delete<ApiResponse<ImportSession>>(`/import/sessions/${id}/rows/${rowNumber}`)),

  setDuplicateStrategy: (id: string, strategy: 'skip' | 'update' | 'create') =>
    handle(apiClient.patch<ApiResponse<ImportSession>>(`/import/sessions/${id}/duplicates`, { strategy })),

  aiMap: (id: string) =>
    handle(apiClient.post<ApiResponse<ColumnMappingSuggestion[]>>(`/import/sessions/${id}/ai-map`, {})),

  saveMappingTemplate: (sessionId: string, name: string) =>
    handle(apiClient.post<ApiResponse<ImportMappingTemplate>>(`/import/sessions/${sessionId}/save-mapping-template`, { name })),

  listMappingTemplates: (importType?: ImportType) =>
    handle(apiClient.get<ApiResponse<ImportMappingTemplate[]>>('/import/mapping-templates', { params: importType ? { importType } : {} })),

  deleteMappingTemplate: (id: string) =>
    handle(apiClient.delete<ApiResponse<null>>(`/import/mapping-templates/${id}`)),

  // Downloads the failed-rows CSV via the authenticated axios client (a plain
  // <a href> would skip the Authorization header) and triggers a client-side save.
  async downloadErrorReport(id: string, importType: string): Promise<void> {
    try {
      const res = await apiClient.get(`/import/sessions/${id}/errors/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importType}-import-errors.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

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
