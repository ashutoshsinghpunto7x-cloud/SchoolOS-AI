import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { behaviorApi } from '../api/behavior.api';
import type {
  BehaviorHistoryOptions,
  CreateBehaviorOptionPayload,
  UpdateBehaviorOptionPayload,
  MarkBehaviorPayload,
  BulkBehaviorPayload,
} from '@schoolos/types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const behaviorKeys = {
  all:      ['behavior']                                as const,
  options:  ()  => [...behaviorKeys.all, 'options']            as const,
  window:   ()  => [...behaviorKeys.all, 'window']             as const,
  classDate:(cls: string, sec: string, date?: string) =>
              [...behaviorKeys.all, 'class', cls, sec, date ?? 'today'] as const,
  student:  (id: string, o: BehaviorHistoryOptions) =>
              [...behaviorKeys.all, 'student', id, o]          as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export const useBehaviorOptions = () =>
  useQuery({
    queryKey: behaviorKeys.options(),
    queryFn:  () => behaviorApi.listOptions(),
    staleTime: 60_000,
  });

/** Polls periodically so a teacher sitting on the marking screen sees the
 *  window flip open/closed without needing to reload. */
export const useBehaviorWindowStatus = () =>
  useQuery({
    queryKey: behaviorKeys.window(),
    queryFn:  () => behaviorApi.getWindowStatus(),
    refetchInterval: 60_000,
  });

export const useClassBehaviorRecords = (cls: string, section: string, date?: string) =>
  useQuery({
    queryKey: behaviorKeys.classDate(cls, section, date),
    queryFn:  () => behaviorApi.getClassRecords(cls, section, date),
    enabled:  !!cls && !!section,
  });

export const useStudentBehaviorHistory = (studentId: string, opts: BehaviorHistoryOptions = {}) =>
  useQuery({
    queryKey: behaviorKeys.student(studentId, opts),
    queryFn:  () => behaviorApi.getStudentHistory(studentId, opts),
    enabled:  !!studentId,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateBehaviorOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBehaviorOptionPayload) => behaviorApi.createOption(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: behaviorKeys.options() }),
  });
};

export const useUpdateBehaviorOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBehaviorOptionPayload }) =>
      behaviorApi.updateOption(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: behaviorKeys.options() }),
  });
};

export const useMarkBehavior = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarkBehaviorPayload) => behaviorApi.markSingle(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: behaviorKeys.all }),
  });
};

export const useBulkMarkBehavior = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkBehaviorPayload) => behaviorApi.bulkMark(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: behaviorKeys.all }),
  });
};

export const useDeleteBehaviorRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => behaviorApi.deleteRecord(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: behaviorKeys.all }),
  });
};
