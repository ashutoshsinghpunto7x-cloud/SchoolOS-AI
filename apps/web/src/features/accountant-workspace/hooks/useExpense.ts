import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { expenseApi } from '../api/expense.api';
import { accountantWorkspaceKeys } from './useAccountantWorkspace';
import type {
  ExpenseListOptions,
  CreateExpenseRecordPayload,
  UpdateExpenseRecordPayload,
} from '@schoolos/types';

export const expenseKeys = {
  all:     ['expenses'] as const,
  lists:   () => [...expenseKeys.all, 'list'] as const,
  list:    (o: ExpenseListOptions) => [...expenseKeys.lists(), o] as const,
  detail:  (id: string) => [...expenseKeys.all, 'detail', id] as const,
  summary: (from?: string, to?: string) => [...expenseKeys.all, 'summary', from ?? '', to ?? ''] as const,
};

export const useExpenseList = (opts: ExpenseListOptions = {}) =>
  useQuery({
    queryKey: expenseKeys.list(opts),
    queryFn:  () => expenseApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useExpenseSummary = (dateFrom?: string, dateTo?: string) =>
  useQuery({
    queryKey: expenseKeys.summary(dateFrom, dateTo),
    queryFn:  () => expenseApi.getSummary(dateFrom, dateTo),
  });

export const useCreateExpenseRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpenseRecordPayload) => expenseApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useUpdateExpenseRecord = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateExpenseRecordPayload) => expenseApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useDeleteExpenseRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};
