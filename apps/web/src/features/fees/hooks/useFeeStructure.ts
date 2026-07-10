import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feeStructureApi } from '../api/fee-structure.api';
import type { UpsertFeeStructurePayload, CreateDiscountRequestPayload, ReviewDiscountRequestPayload } from '@schoolos/types';

export const feeStructureKeys = {
  all: ['fee-structure'] as const,
  list: (year?: string) => [...feeStructureKeys.all, 'list', year ?? ''] as const,
  pendingDiscounts: () => [...feeStructureKeys.all, 'discounts-pending'] as const,
  studentDiscounts: (studentId: string) => [...feeStructureKeys.all, 'discounts-student', studentId] as const,
};

export const useFeeStructure = (academicYear?: string) =>
  useQuery({
    queryKey: feeStructureKeys.list(academicYear),
    queryFn: () => feeStructureApi.list(academicYear),
  });

export const useUpsertFeeStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertFeeStructurePayload) => feeStructureApi.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: feeStructureKeys.all }),
  });
};

export const useDeleteFeeStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feeStructureApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: feeStructureKeys.all }),
  });
};

export const usePendingDiscounts = () =>
  useQuery({
    queryKey: feeStructureKeys.pendingDiscounts(),
    queryFn: feeStructureApi.listPendingDiscounts,
  });

export const useStudentDiscounts = (studentId: string) =>
  useQuery({
    queryKey: feeStructureKeys.studentDiscounts(studentId),
    queryFn: () => feeStructureApi.listStudentDiscounts(studentId),
    enabled: !!studentId,
  });

export const useCreateDiscountRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDiscountRequestPayload) => feeStructureApi.createDiscountRequest(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: feeStructureKeys.all }),
  });
};

export const useApproveDiscountRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ReviewDiscountRequestPayload }) =>
      feeStructureApi.approveDiscountRequest(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeStructureKeys.all });
      qc.invalidateQueries({ queryKey: ['fees'] });
    },
  });
};

export const useRejectDiscountRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ReviewDiscountRequestPayload }) =>
      feeStructureApi.rejectDiscountRequest(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: feeStructureKeys.all }),
  });
};
