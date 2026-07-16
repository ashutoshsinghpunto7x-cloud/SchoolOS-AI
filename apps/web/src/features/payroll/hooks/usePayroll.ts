import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { payrollApi } from '../api/payroll.api';
import type {
  PayrollListOptions,
  GeneratePayrollPayload,
  GenerateAllPayrollPayload,
  MarkPayrollPaidPayload,
} from '@schoolos/types';

export const payrollKeys = {
  all:     ['payroll'] as const,
  lists:   () => [...payrollKeys.all, 'list'] as const,
  list:    (o: PayrollListOptions) => [...payrollKeys.lists(), o] as const,
  detail:  (id: string) => [...payrollKeys.all, 'detail', id] as const,
  summary: (m?: number, y?: number) => [...payrollKeys.all, 'summary', m ?? '', y ?? ''] as const,
};

export const usePayrollList = (opts: PayrollListOptions = {}) =>
  useQuery({
    queryKey: payrollKeys.list(opts),
    queryFn:  () => payrollApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const usePayrollSummary = (month?: number, year?: number) =>
  useQuery({
    queryKey: payrollKeys.summary(month, year),
    queryFn:  () => payrollApi.getSummary(month, year),
  });

export const usePayrollRecord = (id: string) =>
  useQuery({
    queryKey: payrollKeys.detail(id),
    queryFn:  () => payrollApi.getById(id),
    enabled:  Boolean(id),
  });

export const useGeneratePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeneratePayrollPayload) => payrollApi.generate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
};

export const useGenerateAllPayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateAllPayrollPayload) => payrollApi.generateAll(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
};

/** Self-service: the logged-in user's own payslip history, if any. */
export const useMyPayslips = () =>
  useQuery({
    queryKey: [...payrollKeys.all, 'me'] as const,
    queryFn:  () => payrollApi.listMine(),
    retry:    false,
  });

export const useMarkPayrollPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkPayrollPaidPayload }) => payrollApi.markPaid(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: payrollKeys.all });
      qc.setQueryData(payrollKeys.detail(updated._id), updated);
    },
  });
};
