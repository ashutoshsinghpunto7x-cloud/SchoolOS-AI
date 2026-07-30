import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Question,
  SyllabusChapter,
  QuestionListOptions,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  QuestionExtractionResult,
  ConfirmExtractedQuestionsPayload,
  PaperGenerationConfig,
  GeneratedPaper,
  PaginatedResponse,
  QuestionSource,
} from '@schoolos/types';

const BASE = '/question-bank';

interface ExtractionJobStatus {
  status: 'processing' | 'completed' | 'failed';
  result?: QuestionExtractionResult;
  error?: string;
}

const EXTRACTION_POLL_INTERVAL_MS = 1500;
const EXTRACTION_POLL_TIMEOUT_MS = 120_000;

/** Extraction is backgrounded (OCR + vision/text call can take a while) — poll instead of holding the request open. */
async function pollExtractionJob(jobId: string): Promise<QuestionExtractionResult> {
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

export const questionBankApi = {
  extractFromImage: async (target: { class: string; subject: string }, file: File): Promise<QuestionExtractionResult> => {
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

  extractFromPdf: async (target: { class: string; subject: string }, file: File): Promise<QuestionExtractionResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/extract/pdf`, formData, {
        params: target,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return await pollExtractionJob(res.data.data.jobId);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  listSources: async (cls: string, subject: string): Promise<QuestionSource[]> => {
    try {
      const res = await apiClient.get<{ data: QuestionSource[] }>(`${BASE}/sources`, { params: { class: cls, subject } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  reExtractSource: async (id: string): Promise<QuestionExtractionResult> => {
    try {
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/sources/${id}/re-extract`);
      return await pollExtractionJob(res.data.data.jobId);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  confirmExtracted: async (payload: ConfirmExtractedQuestionsPayload): Promise<Question[]> => {
    try {
      const res = await apiClient.post<{ data: Question[] }>(`${BASE}/extract/confirm`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  listChapters: async (cls: string, subject: string): Promise<SyllabusChapter[]> => {
    try {
      const res = await apiClient.get<{ data: SyllabusChapter[] }>(`${BASE}/chapters`, { params: { class: cls, subject } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  listQuestions: async (opts: QuestionListOptions = {}): Promise<PaginatedResponse<Question>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Question>>(`${BASE}/questions`, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getQuestion: async (id: string): Promise<Question> => {
    try {
      const res = await apiClient.get<{ data: Question }>(`${BASE}/questions/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  createQuestion: async (payload: CreateQuestionPayload): Promise<Question> => {
    try {
      const res = await apiClient.post<{ data: Question }>(`${BASE}/questions`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateQuestion: async (id: string, payload: UpdateQuestionPayload): Promise<Question> => {
    try {
      const res = await apiClient.patch<{ data: Question }>(`${BASE}/questions/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteQuestion: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/questions/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  generatePaper: async (config: PaperGenerationConfig): Promise<GeneratedPaper> => {
    try {
      const res = await apiClient.post<{ data: GeneratedPaper }>(`${BASE}/papers/generate`, config);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getPaper: async (id: string): Promise<GeneratedPaper> => {
    try {
      const res = await apiClient.get<{ data: GeneratedPaper }>(`${BASE}/papers/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
