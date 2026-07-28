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
  MarksExtractionResult,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/marks';

interface BatchResult { updated: number }

interface ExtractionJobStatus {
  status: 'processing' | 'completed' | 'failed';
  result?: MarksExtractionResult;
  error?: string;
}

const EXTRACTION_POLL_INTERVAL_MS = 1500;
const EXTRACTION_POLL_TIMEOUT_MS = 90_000;

/** The extract endpoints return a job id immediately (the AI call runs in the
 *  background) — poll until it's done rather than holding one HTTP request
 *  open for the whole OpenAI/Whisper round trip. */
async function pollExtractionJob(jobId: string): Promise<MarksExtractionResult> {
  const deadline = Date.now() + EXTRACTION_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await apiClient.get<{ data: ExtractionJobStatus }>(`${BASE}/extract/jobs/${jobId}`);
    const job = res.data.data;
    if (job.status === 'completed' && job.result) return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'AI extraction failed');
    await new Promise((resolve) => setTimeout(resolve, EXTRACTION_POLL_INTERVAL_MS));
  }
  throw new Error('AI extraction is taking longer than expected — try again.');
}

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

  extractFromImage: async (target: MarksBatchTarget, file: File): Promise<MarksExtractionResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/extract/image`, formData, {
        params: target,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return await pollExtractionJob(res.data.data.jobId);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  extractFromVoice: async (target: MarksBatchTarget, file: Blob, filename: string): Promise<MarksExtractionResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file, filename);
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/extract/voice`, formData, {
        params: target,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return await pollExtractionJob(res.data.data.jobId);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  extractFromTranscript: async (target: MarksBatchTarget, transcript: string, timeoutMs?: number): Promise<MarksExtractionResult> => {
    try {
      const res = await apiClient.post<{ data: MarksExtractionResult }>(`${BASE}/extract/transcript`, { transcript }, {
        params: target,
        ...(timeoutMs ? { timeout: timeoutMs } : {}),
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
