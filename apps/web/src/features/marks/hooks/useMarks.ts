import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksApi } from '../api/marks.api';
import type {
  MarksListOptions,
  UpsertMarksPayload,
  BulkUpsertMarksPayload,
  MarksBatchTarget,
  MarksReviewActionPayload,
  MarksReopenPayload,
} from '@schoolos/types';

export const marksKeys = {
  all:        ['marks']                                  as const,
  lists:      () => [...marksKeys.all, 'list']            as const,
  list:       (o: MarksListOptions) => [...marksKeys.lists(), o] as const,
  entryTable: (t: MarksBatchTarget) => [...marksKeys.all, 'entry-table', t] as const,
  summary:    (t: MarksBatchTarget) => [...marksKeys.all, 'summary', t]     as const,
  detail:     (id: string) => [...marksKeys.all, 'detail', id] as const,
};

const targetReady = (t: Partial<MarksBatchTarget>): t is MarksBatchTarget =>
  !!(t.examId && t.class && t.section && t.subjectName);

export const useMarksEntryTable = (target: Partial<MarksBatchTarget>) =>
  useQuery({
    queryKey: marksKeys.entryTable(target as MarksBatchTarget),
    queryFn:  () => marksApi.getEntryTable(target as MarksBatchTarget),
    enabled:  targetReady(target),
  });

export const useMarksSummary = (target: Partial<MarksBatchTarget>) =>
  useQuery({
    queryKey: marksKeys.summary(target as MarksBatchTarget),
    queryFn:  () => marksApi.getSummary(target as MarksBatchTarget),
    enabled:  targetReady(target),
  });

export const useMarksList = (opts: MarksListOptions = {}) =>
  useQuery({
    queryKey: marksKeys.list(opts),
    queryFn:  () => marksApi.list(opts),
  });

// Every mutation invalidates the whole `marks` key rather than a single
// entry — entry-table, summary, and list all read from the same underlying
// collection, and a missed invalidation would show stale workflow status
// right after a save/submit/approve/publish action.
function useBatchMutation<TPayload, TResult>(fn: (payload: TPayload) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess:  () => qc.invalidateQueries({ queryKey: marksKeys.all }),
  });
}

export const useUpsertMarks = () => useBatchMutation((payload: UpsertMarksPayload) => marksApi.upsertSingle(payload));
export const useBulkUpsertMarks = () => useBatchMutation((payload: BulkUpsertMarksPayload) => marksApi.bulkUpsert(payload));
export const useSubmitMarksForReview = () => useBatchMutation((target: MarksBatchTarget) => marksApi.submitForReview(target));
export const useApproveMarks = () => useBatchMutation((payload: MarksReviewActionPayload) => marksApi.approve(payload));
export const useRequestMarksCorrection = () => useBatchMutation((payload: MarksReviewActionPayload) => marksApi.requestCorrection(payload));
export const usePublishMarks = () => useBatchMutation((target: MarksBatchTarget) => marksApi.publish(target));
export const useLockMarks = () => useBatchMutation((target: MarksBatchTarget) => marksApi.lock(target));
export const useReopenMarks = () => useBatchMutation((payload: MarksReopenPayload) => marksApi.reopen(payload));

// AI extraction never saves anything, so no query invalidation on success.
export const useExtractMarksFromImage = () =>
  useMutation({ mutationFn: ({ target, file }: { target: MarksBatchTarget; file: File }) => marksApi.extractFromImage(target, file) });

export const useExtractMarksFromVoice = () =>
  useMutation({ mutationFn: ({ target, file, filename }: { target: MarksBatchTarget; file: Blob; filename: string }) => marksApi.extractFromVoice(target, file, filename) });

export const useExtractMarksFromTranscript = () =>
  useMutation({ mutationFn: ({ target, transcript, timeoutMs }: { target: MarksBatchTarget; transcript: string; timeoutMs?: number }) => marksApi.extractFromTranscript(target, transcript, timeoutMs) });
