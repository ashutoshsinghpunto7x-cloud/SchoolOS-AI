import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Exam,
  CreateExamPayload,
  UpdateExamPayload,
  ExamListOptions,
  ExamStatus,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/exams';

export const examsApi = {
  create: async (payload: CreateExamPayload): Promise<Exam> => {
    try {
      const res = await apiClient.post<{ data: Exam }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: ExamListOptions = {}): Promise<PaginatedResponse<Exam>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Exam>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  listForClass: async (cls: string): Promise<Exam[]> => {
    try {
      const res = await apiClient.get<{ data: Exam[] }>(`${BASE}/class/${encodeURIComponent(cls)}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Exam> => {
    try {
      const res = await apiClient.get<{ data: Exam }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateExamPayload): Promise<Exam> => {
    try {
      const res = await apiClient.patch<{ data: Exam }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateStatus: async (id: string, status: ExamStatus): Promise<Exam> => {
    try {
      const res = await apiClient.patch<{ data: Exam }>(`${BASE}/${id}/status`, { status });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteExam: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
