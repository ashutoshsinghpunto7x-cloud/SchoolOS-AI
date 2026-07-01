import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { feesApi } from '../api/fees.api';
import type {
  FeeListOptions,
  OutstandingOptions,
  CreateFeeRecordPayload,
  UpdateFeeRecordPayload,
  RecordPaymentPayload,
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

export const useCreateFeeRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFeeRecordPayload) => feesApi.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: feeKeys.all }),
  });
};

export const useUpdateFeeRecord = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateFeeRecordPayload) => feesApi.update(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: feeKeys.all }),
  });
};

export const useDeleteFeeRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: feeKeys.all }),
  });
};

export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordPaymentPayload) => feesApi.recordPayment(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: feeKeys.all }),
  });
};
