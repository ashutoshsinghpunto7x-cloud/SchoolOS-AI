import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { salaryApi } from '../api/salary.api';
import { accountantWorkspaceKeys } from './useAccountantWorkspace';
import type {
  SalaryListOptions,
  CreateSalaryRecordPayload,
  UpdateSalaryRecordPayload,
  MarkSalaryPaidPayload,
} from '@schoolos/types';

export const salaryKeys = {
  all:     ['salary'] as const,
  lists:   () => [...salaryKeys.all, 'list'] as const,
  list:    (o: SalaryListOptions) => [...salaryKeys.lists(), o] as const,
  detail:  (id: string) => [...salaryKeys.all, 'detail', id] as const,
  summary: (m?: string, y?: number) => [...salaryKeys.all, 'summary', m ?? '', y ?? ''] as const,
};

export const useSalaryList = (opts: SalaryListOptions = {}) =>
  useQuery({
    queryKey: salaryKeys.list(opts),
    queryFn:  () => salaryApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useSalarySummary = (month?: string, year?: number) =>
  useQuery({
    queryKey: salaryKeys.summary(month, year),
    queryFn:  () => salaryApi.getSummary(month, year),
  });

export const useCreateSalaryRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalaryRecordPayload) => salaryApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salaryKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useBulkCreateSalaryRecords = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: CreateSalaryRecordPayload[]) => salaryApi.bulkCreate(records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salaryKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useUpdateSalaryRecord = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSalaryRecordPayload) => salaryApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salaryKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useMarkSalaryPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkSalaryPaidPayload }) => salaryApi.markPaid(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salaryKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useForcePendingSalary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salaryApi.forcePending(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salaryKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useDeleteSalaryRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salaryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salaryKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};
