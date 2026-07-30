import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  LessonPlan,
  LessonPlanContent,
  GenerateLessonPlanPayload,
  SaveLessonPlanPayload,
  UpdateLessonPlanPayload,
  LessonPlanListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/lesson-planner';

export const lessonPlannerApi = {
  generate: async (payload: GenerateLessonPlanPayload): Promise<LessonPlanContent> => {
    try {
      const res = await apiClient.post<{ data: LessonPlanContent }>(`${BASE}/generate`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  save: async (payload: SaveLessonPlanPayload): Promise<LessonPlan> => {
    try {
      const res = await apiClient.post<{ data: LessonPlan }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: LessonPlanListOptions = {}): Promise<PaginatedResponse<LessonPlan>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<LessonPlan>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<LessonPlan> => {
    try {
      const res = await apiClient.get<{ data: LessonPlan }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateLessonPlanPayload): Promise<LessonPlan> => {
    try {
      const res = await apiClient.patch<{ data: LessonPlan }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
