import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  SchoolClass,
  Question,
  ChapterCaptureJobResult,
  ChapterPage,
  ConfirmExtractedQuestionsPayload,
  PrincipalMaterialsClass,
} from '@schoolos/types';

interface ExtractionJobStatus<T> {
  status: 'processing' | 'completed' | 'failed';
  result?: T;
  error?: string;
}

// Same reasoning as the teacher-facing question-bank.api.ts: multi-page photo uploads routinely
// exceed the default 60s timeout on their own, before the server even responds.
const UPLOAD_TIMEOUT_MS = 180_000;

const base = (schoolId: string) => `/ops/schools/${schoolId}/question-bank`;

/** Ops Centre variant of the "Chapter Capture" flow, scoped to a school picked explicitly by the
 * ops user (their own account has no schoolId) rather than the caller's own tenant. Mirrors
 * question-bank.api.ts's chapter-capture functions one-to-one, just against the /ops/schools/:id
 * base instead of /question-bank. */
export const opsContentApi = {
  listSchoolClasses: async (schoolId: string): Promise<SchoolClass[]> => {
    try {
      const res = await apiClient.get<{ data: SchoolClass[] }>(`/ops/schools/${schoolId}/classes`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getQuestionBankOverview: async (schoolId: string): Promise<PrincipalMaterialsClass[]> => {
    try {
      const res = await apiClient.get<{ data: PrincipalMaterialsClass[] }>(`${base(schoolId)}/overview`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  extractChapter: async (
    schoolId: string, target: { class: string; subject: string }, chapterName: string, images: File[], detectImages = false,
  ): Promise<{ jobId: string }> => {
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append('images', img));
      formData.append('class', target.class);
      formData.append('subject', target.subject);
      formData.append('chapterName', chapterName);
      formData.append('detectImages', String(detectImages));
      const res = await apiClient.post<{ data: { jobId: string } }>(`${base(schoolId)}/extract/chapter`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getChapterCaptureJob: async (schoolId: string, jobId: string): Promise<ExtractionJobStatus<ChapterCaptureJobResult> & { totalPages?: number; completedPages?: number }> => {
    try {
      const res = await apiClient.get<{ data: ExtractionJobStatus<ChapterCaptureJobResult> & { totalPages?: number; completedPages?: number } }>(`${base(schoolId)}/extract/jobs/${jobId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  retryChapterPage: async (schoolId: string, jobId: string, pageNumber: number, file: File): Promise<ChapterCaptureJobResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: ChapterCaptureJobResult }>(`${base(schoolId)}/extract/jobs/${jobId}/pages/${pageNumber}/retry`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS,
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  confirmExtracted: async (schoolId: string, payload: ConfirmExtractedQuestionsPayload): Promise<Question[]> => {
    try {
      const res = await apiClient.post<{ data: Question[] }>(`${base(schoolId)}/extract/confirm`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};

// Exported for reuse by ChapterPage-shaped consumers.
export type { ChapterPage };
