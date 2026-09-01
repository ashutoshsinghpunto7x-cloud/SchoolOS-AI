import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Interview,
  ScheduleInterviewPayload,
  RescheduleInterviewPayload,
  SetInterviewStatusPayload,
  SubmitInterviewFeedbackPayload,
  InterviewListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/interviews';

export const interviewApi = {
  schedule: async (payload: ScheduleInterviewPayload): Promise<Interview> => {
    try {
      const res = await apiClient.post<{ data: Interview }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: InterviewListOptions = {}): Promise<PaginatedResponse<Interview>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Interview>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getByCandidate: async (candidateId: string): Promise<Interview[]> => {
    try {
      const res = await apiClient.get<{ data: Interview[] }>(`${BASE}/by-candidate/${candidateId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  setStatus: async (id: string, payload: SetInterviewStatusPayload): Promise<Interview> => {
    try {
      const res = await apiClient.patch<{ data: Interview }>(`${BASE}/${id}/status`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  reschedule: async (id: string, payload: RescheduleInterviewPayload): Promise<Interview> => {
    try {
      const res = await apiClient.patch<{ data: Interview }>(`${BASE}/${id}/reschedule`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  submitFeedback: async (id: string, payload: SubmitInterviewFeedbackPayload): Promise<Interview> => {
    try {
      const res = await apiClient.post<{ data: Interview }>(`${BASE}/${id}/feedback`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteInterview: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
