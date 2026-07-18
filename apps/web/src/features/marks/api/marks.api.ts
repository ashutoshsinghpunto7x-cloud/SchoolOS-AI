import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Marks,
  UpsertMarksPayload,
  BulkUpsertMarksPayload,
  MarksBatchTarget,
  MarksReviewActionPayload,
  MarksReopenPayload,
  MarksListOptions,
  MarksEntryTable,
  MarksSummary,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/marks';

interface BatchResult { updated: number }

export const marksApi = {
  upsertSingle: async (payload: UpsertMarksPayload): Promise<Marks> => {
    try {
      const res = await apiClient.post<{ data: Marks }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  bulkUpsert: async (payload: BulkUpsertMarksPayload): Promise<Marks[]> => {
    try {
      const res = await apiClient.post<{ data: Marks[] }>(`${BASE}/bulk`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getEntryTable: async (target: MarksBatchTarget): Promise<MarksEntryTable> => {
    try {
      const res = await apiClient.get<{ data: MarksEntryTable }>(`${BASE}/entry-table`, { params: target });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getSummary: async (target: MarksBatchTarget): Promise<MarksSummary> => {
    try {
      const res = await apiClient.get<{ data: MarksSummary }>(`${BASE}/summary`, { params: target });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: MarksListOptions = {}): Promise<PaginatedResponse<Marks>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Marks>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Marks> => {
    try {
      const res = await apiClient.get<{ data: Marks }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  submitForReview: async (target: MarksBatchTarget): Promise<BatchResult> => {
    try {
      const res = await apiClient.post<{ data: BatchResult }>(`${BASE}/submit`, target);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  approve: async (payload: MarksReviewActionPayload): Promise<BatchResult> => {
    try {
      const res = await apiClient.post<{ data: BatchResult }>(`${BASE}/approve`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  requestCorrection: async (payload: MarksReviewActionPayload): Promise<BatchResult> => {
    try {
      const res = await apiClient.post<{ data: BatchResult }>(`${BASE}/request-correction`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  publish: async (target: MarksBatchTarget): Promise<BatchResult> => {
    try {
      const res = await apiClient.post<{ data: BatchResult }>(`${BASE}/publish`, target);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  lock: async (target: MarksBatchTarget): Promise<BatchResult> => {
    try {
      const res = await apiClient.post<{ data: BatchResult }>(`${BASE}/lock`, target);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  reopen: async (payload: MarksReopenPayload): Promise<BatchResult> => {
    try {
      const res = await apiClient.post<{ data: BatchResult }>(`${BASE}/reopen`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
