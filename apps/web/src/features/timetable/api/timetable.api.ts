import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  PeriodSlot,
  Timetable,
  TimetableSubstitute,
  ConflictInfo,
  CreatePeriodSlotPayload,
  UpdatePeriodSlotPayload,
  CreateTimetablePayload,
  UpdateTimetablePayload,
  UpsertEntryPayload,
  BulkUpdateEntriesPayload,
  UpdateTimetableStatusPayload,
  CreateSubstitutePayload,
  UpdateSubstitutePayload,
  TimetableListOptions,
  SubstituteListOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/timetable';

export const timetableApi = {
  // ── Period Slots ──────────────────────────────────────────────────────────

  listPeriodSlots: async (): Promise<PeriodSlot[]> => {
    try {
      const res = await apiClient.get<{ data: PeriodSlot[] }>(`${BASE}/periods`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  createPeriodSlot: async (payload: CreatePeriodSlotPayload): Promise<PeriodSlot> => {
    try {
      const res = await apiClient.post<{ data: PeriodSlot }>(`${BASE}/periods`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updatePeriodSlot: async (id: string, payload: UpdatePeriodSlotPayload): Promise<PeriodSlot> => {
    try {
      const res = await apiClient.patch<{ data: PeriodSlot }>(`${BASE}/periods/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deletePeriodSlot: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/periods/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  reorderPeriodSlots: async (orderedIds: string[]): Promise<void> => {
    try {
      await apiClient.patch(`${BASE}/periods/reorder`, { orderedIds });
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Timetables ────────────────────────────────────────────────────────────

  list: async (opts: TimetableListOptions = {}): Promise<PaginatedResponse<Timetable>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<Timetable>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<Timetable> => {
    try {
      const res = await apiClient.get<{ data: Timetable }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  create: async (payload: CreateTimetablePayload): Promise<Timetable> => {
    try {
      const res = await apiClient.post<{ data: Timetable }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateTimetablePayload): Promise<Timetable> => {
    try {
      const res = await apiClient.patch<{ data: Timetable }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  upsertEntry: async (id: string, payload: UpsertEntryPayload): Promise<Timetable> => {
    try {
      const res = await apiClient.patch<{ data: Timetable }>(`${BASE}/${id}/entry`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  removeEntry: async (id: string, dayOfWeek: number, slotId: string): Promise<Timetable> => {
    try {
      const res = await apiClient.delete<{ data: Timetable }>(`${BASE}/${id}/entry`, {
        data: { dayOfWeek, slotId },
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  bulkUpdateEntries: async (id: string, payload: BulkUpdateEntriesPayload): Promise<Timetable> => {
    try {
      const res = await apiClient.put<{ data: Timetable }>(`${BASE}/${id}/entries`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateStatus: async (id: string, payload: UpdateTimetableStatusPayload): Promise<Timetable> => {
    try {
      const res = await apiClient.patch<{ data: Timetable }>(`${BASE}/${id}/status`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getTeacherSchedule: async (teacherId: string): Promise<Timetable[]> => {
    try {
      const res = await apiClient.get<{ data: Timetable[] }>(`${BASE}/teacher/${teacherId}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  detectConflicts: async (): Promise<ConflictInfo[]> => {
    try {
      const res = await apiClient.get<{ data: ConflictInfo[] }>(`${BASE}/conflicts`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Substitutes ───────────────────────────────────────────────────────────

  listSubstitutes: async (opts: SubstituteListOptions = {}): Promise<PaginatedResponse<TimetableSubstitute>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<TimetableSubstitute>>(`${BASE}/substitutes`, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  createSubstitute: async (payload: CreateSubstitutePayload): Promise<TimetableSubstitute> => {
    try {
      const res = await apiClient.post<{ data: TimetableSubstitute }>(`${BASE}/substitutes`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  updateSubstitute: async (id: string, payload: UpdateSubstitutePayload): Promise<TimetableSubstitute> => {
    try {
      const res = await apiClient.patch<{ data: TimetableSubstitute }>(`${BASE}/substitutes/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  deleteSubstitute: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/substitutes/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
