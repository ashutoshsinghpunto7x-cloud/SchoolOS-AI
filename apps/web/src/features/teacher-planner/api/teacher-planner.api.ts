import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  TeacherPlanner,
  PlannerExtractionResult,
  ConfirmPlannerPayload,
  GeneratePlannerPayload,
  PlannerProgress,
  PacePosition,
  SavedChapterOption,
  TeachingWeeksInfo,
  PrincipalPlannerOverviewEntry,
  PrincipalPlannerDetail,
} from '@schoolos/types';

const BASE = '/teacher-planner';

export const teacherPlannerApi = {
  getChapters: async (cls: string, subject: string): Promise<SavedChapterOption[]> => {
    try {
      const res = await apiClient.get<{ data: SavedChapterOption[] }>(`${BASE}/chapters`, { params: { class: cls, subject } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getTeachingWeeks: async (cls: string, subject: string): Promise<TeachingWeeksInfo> => {
    try {
      const res = await apiClient.get<{ data: TeachingWeeksInfo }>(`${BASE}/teaching-weeks`, { params: { class: cls, subject } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  generate: async (payload: GeneratePlannerPayload): Promise<PlannerExtractionResult> => {
    try {
      const res = await apiClient.post<{ data: PlannerExtractionResult }>(`${BASE}/generate`, payload);
      return res.data.data;
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

  // ── Principal (read-only) ────────────────────────────────────────────────

  getPrincipalOverview: async (): Promise<PrincipalPlannerOverviewEntry[]> => {
    try {
      const res = await apiClient.get<{ data: PrincipalPlannerOverviewEntry[] }>(`${BASE}/principal/overview`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getForTeacher: async (teacherId: string, cls: string, subject: string): Promise<PrincipalPlannerDetail> => {
    try {
      const res = await apiClient.get<{ data: PrincipalPlannerDetail }>(`${BASE}/principal/${teacherId}`, { params: { class: cls, subject } });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
