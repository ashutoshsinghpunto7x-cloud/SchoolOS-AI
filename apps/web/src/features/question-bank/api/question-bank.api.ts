import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Question,
  SyllabusChapter,
  QuestionListOptions,
  QuestionGroup,
  QuestionGroupListOptions,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  QuestionExtractionResult,
  TextExtractionResult,
  ConfirmExtractedQuestionsPayload,
  PaperGenerationConfig,
  GeneratedPaper,
  PaginatedResponse,
  QuestionSource,
  UpdateQuestionSourcePayload,
  ChapterCaptureJobResult,
  ChapterPage,
  QuestionGenerationOptions,
} from '@schoolos/types';

const BASE = '/question-bank';

interface ExtractionJobStatus<T> {
  status: 'processing' | 'completed' | 'failed';
  result?: T;
  error?: string;
}

const EXTRACTION_POLL_INTERVAL_MS = 1500;
const EXTRACTION_POLL_TIMEOUT_MS = 120_000;

// Longer than apiClient's default 60s: these endpoints upload one or more
// full-resolution photos as multipart form data, which routinely exceeds 60s
// on a slow/patchy mobile connection well before the server even gets to
// respond — the request itself is still in flight, not hung server-side.
const UPLOAD_TIMEOUT_MS = 180_000;

/** Extraction is backgrounded (OCR + vision/text call can take a while) — poll instead of holding the request open. */
async function pollExtractionJob<T>(jobId: string): Promise<T> {
  const deadline = Date.now() + EXTRACTION_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await apiClient.get<{ data: ExtractionJobStatus<T> }>(`${BASE}/extract/jobs/${jobId}`);
    const job = res.data.data;
    if (job.status === 'completed' && job.result) return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'AI extraction failed');
    await new Promise((resolve) => setTimeout(resolve, EXTRACTION_POLL_INTERVAL_MS));
  }
  throw new Error('AI extraction is taking longer than expected — try again.');
}

export const questionBankApi = {
  /** Upload only transcribes + stores the page's text (no question drafts yet) — see reExtractSource to generate questions from it. `detectImages` is the teacher's "Include images" toggle — opt-in, so the default upload stays exactly as cheap/fast as before figure detection existed. */
  extractFromImage: async (target: { class: string; subject: string }, file: File, detectImages = false): Promise<TextExtractionResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/extract/image`, formData, {
        params: { ...target, ...(detectImages ? { detectImages: 'true' } : {}) },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
      });
      return await pollExtractionJob<TextExtractionResult>(res.data.data.jobId);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  extractFromPdf: async (target: { class: string; subject: string }, file: File): Promise<TextExtractionResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/extract/pdf`, formData, {
        params: target,
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
      });
      return await pollExtractionJob<TextExtractionResult>(res.data.data.jobId);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Layout-aware chapter capture (multi-page) ───────────────────────────────

  /** Starts a multi-page structured OCR batch job — returns immediately with a jobId to poll (see useChapterCaptureJob), unlike the single-image flows above which poll to completion internally. This lets the review screen show per-page progress. `detectImages` is the teacher's "Include images" toggle, same as extractFromImage. */
  extractChapter: async (images: File[], detectImages = false): Promise<{ jobId: string }> => {
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append('images', img));
      formData.append('detectImages', String(detectImages));
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/extract/chapter`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getChapterCaptureJob: async (jobId: string): Promise<ExtractionJobStatus<ChapterCaptureJobResult> & { totalPages?: number; completedPages?: number }> => {
    try {
      const res = await apiClient.get<{ data: ExtractionJobStatus<ChapterCaptureJobResult> & { totalPages?: number; completedPages?: number } }>(`${BASE}/extract/jobs/${jobId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  /** Reprocesses one page in-place — for "Retry Page" on a failed/low-confidence page without redoing the whole batch. */
  retryChapterPage: async (jobId: string, pageNumber: number, file: File): Promise<ChapterCaptureJobResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: ChapterCaptureJobResult }>(`${BASE}/extract/jobs/${jobId}/pages/${pageNumber}/retry`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  /** Finalizes a reviewed chapter capture (with the teacher's edits already applied) into a permanent, saved source — "Save Chapter". */
  saveChapterSource: async (payload: {
    class: string; subject: string; documentTitle?: string; language?: string; chapterName?: string; fileName?: string; pages: ChapterPage[];
  }): Promise<QuestionSource> => {
    try {
      const res = await apiClient.post<{ data: QuestionSource }>(`${BASE}/sources`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  /** Omit cls/subject to list every stored upload for the school (the "pending uploads" view). */
  listSources: async (cls?: string, subject?: string): Promise<QuestionSource[]> => {
    try {
      const res = await apiClient.get<{ data: QuestionSource[] }>(`${BASE}/sources`, { params: cls && subject ? { class: cls, subject } : {} });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getSource: async (id: string): Promise<QuestionSource> => {
    try {
      const res = await apiClient.get<{ data: QuestionSource }>(`${BASE}/sources/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateSource: async (id: string, payload: UpdateQuestionSourcePayload): Promise<QuestionSource> => {
    try {
      const res = await apiClient.patch<{ data: QuestionSource }>(`${BASE}/sources/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  /** Permanently deletes an upload's converted text — frees storage; questions already saved from it are unaffected. */
  deleteSource: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/sources/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  /** Generates a fresh batch of question drafts from a stored source's text — repeatable any number of times. */
  reExtractSource: async (id: string, options: QuestionGenerationOptions): Promise<QuestionExtractionResult> => {
    try {
      const res = await apiClient.post<{ data: { jobId: string } }>(`${BASE}/sources/${id}/re-extract`, options);
      return await pollExtractionJob<QuestionExtractionResult>(res.data.data.jobId);
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

  /** Chapter-grouped counts for the Question Bank landing view — one row per class/subject/chapter. */
  listQuestionGroups: async (opts: QuestionGroupListOptions = {}): Promise<QuestionGroup[]> => {
    try {
      const res = await apiClient.get<{ data: QuestionGroup[] }>(`${BASE}/questions/groups`, { params: opts });
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

  /** Deletes every question in one or more whole chapters at once — backs both the per-row delete and the collective/bulk delete on the Question Bank landing view. */
  deleteQuestionGroups: async (groups: { class: string; subject: string; chapterId: string }[]): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/questions/groups`, { data: { groups } });
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  generatePaper: async (config: PaperGenerationConfig): Promise<GeneratedPaper> => {
    try {
      // Same reasoning as UPLOAD_TIMEOUT_MS above: when the question bank can't fully
      // satisfy the requested marks breakdown, the server fills gaps with sequential
      // AI synthesis calls (one per unfilled marks row) — a paper with several rows can
      // easily exceed the default 60s timeout and needed to error before completing.
      const res = await apiClient.post<{ data: GeneratedPaper }>(`${BASE}/papers/generate`, config, { timeout: UPLOAD_TIMEOUT_MS });
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
