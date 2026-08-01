import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ReportCardTemplate,
  CreateReportCardTemplatePayload,
  UpdateReportCardTemplatePayload,
  CloneReportCardTemplatePayload,
  ReportCardTemplateListOptions,
} from '@schoolos/types';

const BASE = '/report-card-templates';

export const reportCardTemplateApi = {
  list: async (opts: ReportCardTemplateListOptions = {}): Promise<ReportCardTemplate[]> => {
    try {
      const res = await apiClient.get<{ data: ReportCardTemplate[] }>(BASE, { params: opts });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<ReportCardTemplate> => {
    try {
      const res = await apiClient.get<{ data: ReportCardTemplate }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getByClassYear: async (cls: string, academicYear: string): Promise<ReportCardTemplate | null> => {
    try {
      const res = await apiClient.get<{ data: ReportCardTemplate }>(`${BASE}/class/${cls}/year/${academicYear}`);
      return res.data.data;
    } catch {
      return null;
    }
  },

  create: async (payload: CreateReportCardTemplatePayload): Promise<ReportCardTemplate> => {
    try {
      const res = await apiClient.post<{ data: ReportCardTemplate }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateReportCardTemplatePayload): Promise<ReportCardTemplate> => {
    try {
      const res = await apiClient.patch<{ data: ReportCardTemplate }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  publish: async (id: string): Promise<ReportCardTemplate> => {
    try {
      const res = await apiClient.post<{ data: ReportCardTemplate }>(`${BASE}/${id}/publish`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  unpublish: async (id: string): Promise<ReportCardTemplate> => {
    try {
      const res = await apiClient.post<{ data: ReportCardTemplate }>(`${BASE}/${id}/unpublish`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteTemplate: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  clone: async (cls: string, payload: CloneReportCardTemplatePayload): Promise<ReportCardTemplate> => {
    try {
      const res = await apiClient.post<{ data: ReportCardTemplate }>(`${BASE}/clone`, { class: cls, ...payload });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
