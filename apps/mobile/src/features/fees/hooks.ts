import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeeListOptions, OutstandingOptions, RecordPaymentPayload } from '@schoolos/types';
import { feesApi } from './api';

export const feeKeys = {
  summary: (academicYear?: string) => ['fees', 'summary', academicYear] as const,
  outstanding: (options: OutstandingOptions) => ['fees', 'outstanding', options] as const,
  list: (options: FeeListOptions) => ['fees', 'list', options] as const,
  studentFees: (studentId: string) => ['fees', 'student', studentId] as const,
  receipt: (receiptNumber: string) => ['fees', 'receipt', receiptNumber] as const,
};

export function useFeeSummary(academicYear?: string) {
  return useQuery({
    queryKey: feeKeys.summary(academicYear),
    queryFn: () => feesApi.getSummary(academicYear),
  });
}

export function useOutstandingFees(options: OutstandingOptions = {}) {
  return useQuery({
    queryKey: feeKeys.outstanding(options),
    queryFn: () => feesApi.getOutstanding(options),
  });
}

export function useStudentFees(studentId: string) {
  return useQuery({
    queryKey: feeKeys.studentFees(studentId),
    queryFn: () => feesApi.getStudentFees(studentId),
    enabled: !!studentId,
  });
}

export function useReceipt(receiptNumber: string) {
  return useQuery({
    queryKey: feeKeys.receipt(receiptNumber),
    queryFn: () => feesApi.getReceiptByNumber(receiptNumber),
    enabled: !!receiptNumber,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordPaymentPayload) => feesApi.recordPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}
