import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  TeacherPlanner,
  PlannerExtractionResult,
  ConfirmPlannerPayload,
  PlannerProgress,
  PacePosition,
} from '@schoolos/types';

const BASE = '/teacher-planner';

interface ExtractionJobStatus {
  status: 'processing' | 'completed' | 'failed';
  result?: PlannerExtractionResult;
  error?: string;
}

const EXTRACTION_POLL_INTERVAL_MS = 1500;
const EXTRACTION_POLL_TIMEOUT_MS = 120_000;

async function pollExtractionJob(jobId: string): Promise<PlannerExtractionResult> {
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

export const teacherPlannerApi = {
  extractFromImage: async (target: { class: string; subject: string }, file: File): Promise<PlannerExtractionResult> => {
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

  extractFromPdf: async (target: { class: string; subject: string }, file: File): Promise<PlannerExtractionResult> => {
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

  confirmPlanner: async (payload: ConfirmPlannerPayload): Promise<TeacherPlanner> => {
    try {
      const res = await apiClient.post<{ data: TeacherPlanner }>(`${BASE}/confirm`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getMine: async (cls: string, subject: string): Promise<TeacherPlanner | null> => {
    try {
      const res = await apiClient.get<{ data: TeacherPlanner | null }>(`${BASE}/mine`, { params: { class: cls, subject } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  toggleTask: async (plannerId: string, taskId: string, status: 'pending' | 'completed'): Promise<TeacherPlanner> => {
    try {
      const res = await apiClient.patch<{ data: TeacherPlanner }>(`${BASE}/${plannerId}/tasks/${taskId}`, { status });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getProgress: async (plannerId: string): Promise<PlannerProgress> => {
    try {
      const res = await apiClient.get<{ data: PlannerProgress }>(`${BASE}/${plannerId}/progress`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getPace: async (plannerId: string): Promise<PacePosition> => {
    try {
      const res = await apiClient.get<{ data: PacePosition }>(`${BASE}/${plannerId}/pace`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
