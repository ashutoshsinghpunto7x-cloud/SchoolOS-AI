import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Candidate,
  ForwardCandidatePayload,
  RejectCandidatePayload,
  SetCandidateFinalDecisionPayload,
  CandidateListOptions,
  CandidateSource,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/candidates';

export interface CreateCandidateFormInput {
  name: string;
  mobile: string;
  email?: string;
  positionApplied: string;
  department?: string;
  qualification?: string;
  experienceYears?: number;
  source: CandidateSource;
  resume: File;
}

export const candidateApi = {
  create: async (input: CreateCandidateFormInput): Promise<Candidate> => {
    try {
      const form = new FormData();
      form.append('file', input.resume);
      form.append('name', input.name);
      form.append('mobile', input.mobile);
      if (input.email) form.append('email', input.email);
      form.append('positionApplied', input.positionApplied);
      if (input.department) form.append('department', input.department);
      if (input.qualification) form.append('qualification', input.qualification);
      if (input.experienceYears != null) form.append('experienceYears', String(input.experienceYears));
      form.append('source', input.source);
      const res = await apiClient.post<{ data: Candidate }>(BASE, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  checkDuplicate: async (mobile?: string, email?: string): Promise<Candidate[]> => {
    try {
      const res = await apiClient.get<{ data: Candidate[] }>(`${BASE}/check-duplicate`, { params: { mobile, email } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: CandidateListOptions = {}): Promise<PaginatedResponse<Candidate>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Candidate>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Candidate> => {
    try {
      const res = await apiClient.get<{ data: Candidate }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  forward: async (id: string, payload: ForwardCandidatePayload): Promise<Candidate> => {
    try {
      const res = await apiClient.patch<{ data: Candidate }>(`${BASE}/${id}/forward`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  reject: async (id: string, payload: RejectCandidatePayload): Promise<Candidate> => {
    try {
      const res = await apiClient.patch<{ data: Candidate }>(`${BASE}/${id}/reject`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  markUnderReview: async (id: string): Promise<Candidate> => {
    try {
      const res = await apiClient.patch<{ data: Candidate }>(`${BASE}/${id}/under-review`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  setFinalDecision: async (id: string, payload: SetCandidateFinalDecisionPayload): Promise<Candidate> => {
    try {
      const res = await apiClient.patch<{ data: Candidate }>(`${BASE}/${id}/decision`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteCandidate: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
