import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ReportCard,
  ReportCardRoster,
  ReportCardVerification,
  GenerateReportCardPayload,
  UpdateReportCardPayload,
} from '@schoolos/types';

const BASE = '/report-cards';

export const reportCardApi = {
  generate: async (payload: GenerateReportCardPayload): Promise<ReportCard> => {
    try {
      const res = await apiClient.post<{ data: ReportCard }>(`${BASE}/generate`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<ReportCard> => {
    try {
      const res = await apiClient.get<{ data: ReportCard }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getByExamStudent: async (examId: string, studentId: string): Promise<ReportCard | null> => {
    try {
      const res = await apiClient.get<{ data: ReportCard | null }>(`${BASE}/by-exam/${examId}/student/${studentId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getRoster: async (examId: string, cls: string, section: string): Promise<ReportCardRoster> => {
    try {
      const res = await apiClient.get<{ data: ReportCardRoster }>(`${BASE}/roster`, { params: { examId, class: cls, section } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateReportCardPayload): Promise<ReportCard> => {
    try {
      const res = await apiClient.patch<{ data: ReportCard }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  regenerateRemark: async (id: string): Promise<ReportCard> => {
    try {
      const res = await apiClient.post<{ data: ReportCard }>(`${BASE}/${id}/regenerate-remark`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  publish: async (id: string): Promise<ReportCard> => {
    try {
      const res = await apiClient.post<{ data: ReportCard }>(`${BASE}/${id}/publish`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getQrImage: async (id: string): Promise<{ dataUri: string; verifyUrl: string }> => {
    try {
      const res = await apiClient.get<{ data: { dataUri: string; verifyUrl: string } }>(`${BASE}/${id}/qr`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  verify: async (token: string): Promise<ReportCardVerification> => {
    try {
      const res = await apiClient.get<{ data: ReportCardVerification }>(`${BASE}/verify/${token}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
