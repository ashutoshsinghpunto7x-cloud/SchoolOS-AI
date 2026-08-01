import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  TermReportCard,
  TermReportCardRoster,
  TermReportCardVerification,
  GenerateTermReportCardPayload,
  UpdateTermReportCardPayload,
  UpdateTermReportCardSkillsPayload,
} from '@schoolos/types';

const BASE = '/term-report-cards';

export const termReportCardApi = {
  generate: async (payload: GenerateTermReportCardPayload): Promise<TermReportCard> => {
    try {
      const res = await apiClient.post<{ data: TermReportCard }>(`${BASE}/generate`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<TermReportCard> => {
    try {
      const res = await apiClient.get<{ data: TermReportCard }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getByStudentYear: async (studentId: string, academicYear: string): Promise<TermReportCard | null> => {
    try {
      const res = await apiClient.get<{ data: TermReportCard | null }>(`${BASE}/by-student/${studentId}/year/${academicYear}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getRoster: async (cls: string, section: string, academicYear: string): Promise<TermReportCardRoster> => {
    try {
      const res = await apiClient.get<{ data: TermReportCardRoster }>(`${BASE}/roster`, { params: { class: cls, section, academicYear } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateTermReportCardPayload): Promise<TermReportCard> => {
    try {
      const res = await apiClient.patch<{ data: TermReportCard }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateSkills: async (id: string, payload: UpdateTermReportCardSkillsPayload): Promise<TermReportCard> => {
    try {
      const res = await apiClient.patch<{ data: TermReportCard }>(`${BASE}/${id}/skills`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  publish: async (id: string): Promise<TermReportCard> => {
    try {
      const res = await apiClient.post<{ data: TermReportCard }>(`${BASE}/${id}/publish`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getQrImage: async (id: string): Promise<{ dataUri: string; verifyUrl: string }> => {
    try {
      const res = await apiClient.get<{ data: { dataUri: string; verifyUrl: string } }>(`${BASE}/${id}/qr`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  verify: async (token: string): Promise<TermReportCardVerification> => {
    try {
      const res = await apiClient.get<{ data: TermReportCardVerification }>(`${BASE}/verify/${token}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
