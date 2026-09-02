import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  Worksheet,
  WorksheetDraft,
  GenerateWorksheetPayload,
  SaveWorksheetPayload,
  WorksheetListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/worksheet-generator';

export const worksheetGeneratorApi = {
  generate: async (payload: GenerateWorksheetPayload): Promise<WorksheetDraft> => {
    try {
      const res = await apiClient.post<{ data: { chapterNames: string[]; questions: WorksheetDraft['questions'] } }>(`${BASE}/generate`, payload);
      return { config: payload, questions: res.data.data.questions };
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  save: async (payload: SaveWorksheetPayload): Promise<Worksheet> => {
    try {
      const res = await apiClient.post<{ data: Worksheet }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: WorksheetListOptions = {}): Promise<PaginatedResponse<Worksheet>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Worksheet>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Worksheet> => {
    try {
      const res = await apiClient.get<{ data: Worksheet }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, patch: { title?: string; questions?: { questionText: string; difficulty: string; estimatedTimeMinutes: number }[] }): Promise<Worksheet> => {
    try {
      const res = await apiClient.patch<{ data: Worksheet }>(`${BASE}/${id}`, patch);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
