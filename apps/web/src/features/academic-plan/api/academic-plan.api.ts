import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  AcademicPlan,
  GenerateAcademicPlanPayload,
  AcademicPlanGenerationResult,
  SetPlanDayStatusPayload,
  EditPlanDayPayload,
  MovePlanDayPayload,
  AcademicPlanPrincipalOverviewEntry,
  SyllabusChapter,
  ChapterDifficulty,
  ChapterPriority,
  PlanAlert,
} from '@schoolos/types';

const BASE = '/academic-plan';

export interface PlanTarget {
  class: string;
  section?: string;
  subject: string;
}

export interface ChapterSizingPayload {
  estimatedPeriods?: number;
  difficulty?: ChapterDifficulty;
  priority?: ChapterPriority;
  revisionWeight?: number;
}

export const academicPlanApi = {
  generate: async (payload: GenerateAcademicPlanPayload): Promise<AcademicPlanGenerationResult> => {
    try {
      const res = await apiClient.post<{ data: AcademicPlanGenerationResult }>(`${BASE}/generate`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getMine: async (target: PlanTarget): Promise<AcademicPlan | null> => {
    try {
      const res = await apiClient.get<{ data: AcademicPlan | null }>(`${BASE}/mine`, {
        params: { class: target.class, section: target.section, subject: target.subject },
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  setDayStatus: async (planId: string, payload: SetPlanDayStatusPayload): Promise<AcademicPlan> => {
    try {
      const res = await apiClient.patch<{ data: AcademicPlan }>(`${BASE}/${planId}/days`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  editDay: async (planId: string, payload: EditPlanDayPayload): Promise<AcademicPlan> => {
    try {
      const res = await apiClient.patch<{ data: AcademicPlan }>(`${BASE}/${planId}/days/edit`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  moveDay: async (planId: string, payload: MovePlanDayPayload): Promise<AcademicPlan> => {
    try {
      const res = await apiClient.patch<{ data: AcademicPlan }>(`${BASE}/${planId}/days/move`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Principal (read-only) ────────────────────────────────────────────────

  getPrincipalOverview: async (): Promise<AcademicPlanPrincipalOverviewEntry[]> => {
    try {
      const res = await apiClient.get<{ data: AcademicPlanPrincipalOverviewEntry[] }>(`${BASE}/principal/overview`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getForTeacher: async (teacherId: string, target: PlanTarget): Promise<AcademicPlan> => {
    try {
      const res = await apiClient.get<{ data: AcademicPlan }>(`${BASE}/principal/${teacherId}`, {
        params: { class: target.class, section: target.section, subject: target.subject },
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Coordinator (syllabus sizing) ─────────────────────────────────────────

  updateChapterSizing: async (chapterId: string, payload: ChapterSizingPayload): Promise<SyllabusChapter> => {
    try {
      const res = await apiClient.patch<{ data: SyllabusChapter }>(`${BASE}/chapters/${chapterId}/sizing`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Plan Alerts (automation) ──────────────────────────────────────────────

  listAlerts: async (): Promise<PlanAlert[]> => {
    try {
      const res = await apiClient.get<{ data: PlanAlert[] }>(`${BASE}/alerts`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  resolveAlert: async (alertId: string): Promise<PlanAlert> => {
    try {
      const res = await apiClient.patch<{ data: PlanAlert }>(`${BASE}/alerts/${alertId}/resolve`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
