import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { feesApi } from '../api/fees.api';
import { accountantWorkspaceKeys } from '@/features/accountant-workspace/hooks/useAccountantWorkspace';
import type {
  FeeListOptions,
  OutstandingOptions,
  CreateFeeRecordPayload,
  UpdateFeeRecordPayload,
  RecordPaymentPayload,
  RecordBulkPaymentPayload,
} from '@schoolos/types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const feeKeys = {
  all:         ['fees']                                          as const,
  lists:       ()                   => [...feeKeys.all, 'list'] as const,
  list:        (o: FeeListOptions)  => [...feeKeys.lists(), o]  as const,
  detail:      (id: string)         => [...feeKeys.all, 'detail', id]      as const,
  student:     (id: string, o: object) => [...feeKeys.all, 'student', id, o] as const,
  outstanding: (o: OutstandingOptions) => [...feeKeys.all, 'outstanding', o] as const,
  summary:     (year?: string)      => [...feeKeys.all, 'summary', year ?? ''] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export const useFeeList = (opts: FeeListOptions = {}) =>
  useQuery({
    queryKey: feeKeys.list(opts),
    queryFn:  () => feesApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useFeeRecord = (id: string) =>
  useQuery({
    queryKey: feeKeys.detail(id),
    queryFn:  () => feesApi.getById(id),
    enabled:  !!id,
  });

export const useStudentFees = (studentId: string, opts: { academicYear?: string; status?: string } = {}) =>
  useQuery({
    queryKey: feeKeys.student(studentId, opts),
    queryFn:  () => feesApi.getStudentFees(studentId, opts),
    enabled:  !!studentId,
  });

export const useOutstandingFees = (opts: OutstandingOptions = {}) =>
  useQuery({
    queryKey: feeKeys.outstanding(opts),
    queryFn:  () => feesApi.getOutstanding(opts),
    placeholderData: keepPreviousData,
  });

export const useFeeSummary = (academicYear?: string) =>
  useQuery({
    queryKey: feeKeys.summary(academicYear),
    queryFn:  () => feesApi.getSummary(academicYear),
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Fee mutations affect the Accountant Dashboard's summary/defaulters and any open
 * Student Ledger too — invalidate both alongside the fee lists themselves so a
 * just-recorded payment never appears stale on those views. */
function invalidateFeeRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: feeKeys.all });
  qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.all });
}

export const useCreateFeeRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFeeRecordPayload) => feesApi.create(payload),
    onSuccess:  () => invalidateFeeRelated(qc),
  });
};

export const useUpdateFeeRecord = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateFeeRecordPayload) => feesApi.update(id, payload),
    onSuccess:  () => invalidateFeeRelated(qc),
  });
};

/** Same as useUpdateFeeRecord, but the record id is passed per-call instead of fixed at
 * hook-instantiation time — for flows that update a dynamic, variable-length set of
 * records (e.g. paying several selected months at once). */
export const useUpdateAnyFeeRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFeeRecordPayload }) => feesApi.update(id, payload),
    onSuccess:  () => invalidateFeeRelated(qc),
  });
};

export const useDeleteFeeRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesApi.delete(id),
    onSuccess:  () => invalidateFeeRelated(qc),
  });
};

export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordPaymentPayload) => feesApi.recordPayment(payload),
    onSuccess:  () => invalidateFeeRelated(qc),
  });
};

export const useRecordBulkPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordBulkPaymentPayload) => feesApi.recordBulkPayment(payload),
    onSuccess:  () => invalidateFeeRelated(qc),
  });
};

/** On-demand receipt/bill-number lookup — triggered imperatively (search action), not a live query. */
export const useReceiptLookup = () =>
  useMutation({
    mutationFn: (receiptNumber: string) => feesApi.getPaymentByReceipt(receiptNumber),
  });
