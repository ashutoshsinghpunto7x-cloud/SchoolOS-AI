import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '../api/timetable.api';
import type {
  TimetableListOptions,
  SubstituteListOptions,
  CreatePeriodSlotPayload,
  UpdatePeriodSlotPayload,
  CreateTimetablePayload,
  UpdateTimetablePayload,
  UpsertEntryPayload,
  BulkUpdateEntriesPayload,
  UpdateTimetableStatusPayload,
  CreateSubstitutePayload,
  UpdateSubstitutePayload,
} from '@schoolos/types';

export const timetableKeys = {
  all:          ['timetable'] as const,
  periods:      () => [...timetableKeys.all, 'periods'] as const,
  lists:        () => [...timetableKeys.all, 'list'] as const,
  list:         (opts: TimetableListOptions) => [...timetableKeys.lists(), opts] as const,
  detail:       (id: string) => [...timetableKeys.all, 'detail', id] as const,
  teacher:      (teacherId: string) => [...timetableKeys.all, 'teacher', teacherId] as const,
  conflicts:    () => [...timetableKeys.all, 'conflicts'] as const,
  substitutes:  (opts: SubstituteListOptions) => [...timetableKeys.all, 'substitutes', opts] as const,
  needsSubstitute: (date: string) => [...timetableKeys.all, 'substitutes-needed', date] as const,
  suggestTeachers: (cls: string, section: string) => [...timetableKeys.all, 'suggest-teachers', cls, section] as const,
};

// ── Period Slots ──────────────────────────────────────────────────────────────

export const usePeriodSlots = () =>
  useQuery({ queryKey: timetableKeys.periods(), queryFn: timetableApi.listPeriodSlots });

export const useCreatePeriodSlot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePeriodSlotPayload) => timetableApi.createPeriodSlot(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.periods() }),
  });
};

export const useUpdatePeriodSlot = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePeriodSlotPayload) => timetableApi.updatePeriodSlot(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.periods() }),
  });
};

export const useDeletePeriodSlot = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => timetableApi.deletePeriodSlot(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.periods() }),
  });
};

// ── Timetables ────────────────────────────────────────────────────────────────

export const useTimetables = (opts: TimetableListOptions = {}) =>
  useQuery({
    queryKey: timetableKeys.list(opts),
    queryFn:  () => timetableApi.list(opts),
    placeholderData: (prev) => prev,
  });

export const useTimetable = (id: string) =>
  useQuery({
    queryKey: timetableKeys.detail(id),
    queryFn:  () => timetableApi.getById(id),
    enabled:  !!id,
  });

export const useCreateTimetable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTimetablePayload) => timetableApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.lists() }),
  });
};

export const useUpdateTimetable = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTimetablePayload) => timetableApi.update(id, payload),
    onSuccess: (tt) => {
      qc.setQueryData(timetableKeys.detail(id), tt);
      qc.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
  });
};

export const useUpsertEntry = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertEntryPayload) => timetableApi.upsertEntry(id, payload),
    onSuccess: (tt) => {
      qc.setQueryData(timetableKeys.detail(id), tt);
      qc.invalidateQueries({ queryKey: timetableKeys.conflicts() });
    },
  });
};

export const useRemoveEntry = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dayOfWeek, slotId }: { dayOfWeek: number; slotId: string }) =>
      timetableApi.removeEntry(id, dayOfWeek, slotId),
    onSuccess: (tt) => {
      qc.setQueryData(timetableKeys.detail(id), tt);
      qc.invalidateQueries({ queryKey: timetableKeys.conflicts() });
    },
  });
};

export const useBulkUpdateEntries = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkUpdateEntriesPayload) => timetableApi.bulkUpdateEntries(id, payload),
    onSuccess: (tt) => {
      qc.setQueryData(timetableKeys.detail(id), tt);
      qc.invalidateQueries({ queryKey: timetableKeys.conflicts() });
    },
  });
};

export const useUpdateTimetableStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTimetableStatusPayload) => timetableApi.updateStatus(id, payload),
    onSuccess: (tt) => {
      qc.setQueryData(timetableKeys.detail(id), tt);
      qc.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
  });
};

export const useDeleteTimetable = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => timetableApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.lists() }),
  });
};

export const useTeacherSchedule = (teacherId: string) =>
  useQuery({
    queryKey: timetableKeys.teacher(teacherId),
    queryFn:  () => timetableApi.getTeacherSchedule(teacherId),
    enabled:  !!teacherId,
  });

export const useConflicts = () =>
  useQuery({
    queryKey: timetableKeys.conflicts(),
    queryFn:  timetableApi.detectConflicts,
  });

// ── Substitutes ───────────────────────────────────────────────────────────────

export const useSubstitutes = (opts: SubstituteListOptions = {}) =>
  useQuery({
    queryKey: timetableKeys.substitutes(opts),
    queryFn:  () => timetableApi.listSubstitutes(opts),
    placeholderData: (prev) => prev,
  });

export const useCreateSubstitute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubstitutePayload) => timetableApi.createSubstitute(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.all }),
  });
};

export const useUpdateSubstitute = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSubstitutePayload) => timetableApi.updateSubstitute(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.all }),
  });
};

export const useNeedsSubstitute = (date: string) =>
  useQuery({
    queryKey: timetableKeys.needsSubstitute(date),
    queryFn:  () => timetableApi.getNeedsSubstitute(date),
  });

export const useSuggestSubstituteTeachers = (cls: string, section: string, excludeTeacherId?: string, enabled = true) =>
  useQuery({
    queryKey: timetableKeys.suggestTeachers(cls, section),
    queryFn:  () => timetableApi.suggestSubstituteTeachers(cls, section, excludeTeacherId),
    enabled:  enabled && !!cls && !!section,
  });

export const useDeleteSubstitute = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => timetableApi.deleteSubstitute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: timetableKeys.all }),
  });
};
