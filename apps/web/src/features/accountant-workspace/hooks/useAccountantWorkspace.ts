import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountantWorkspaceApi } from '../api/accountant-workspace.api';
import type { SendDefaultersToTeacherPayload, SendReceiptEmailPayload } from '@schoolos/types';

export const accountantWorkspaceKeys = {
  all:          ['accountant-workspace'] as const,
  dashboard:    ['accountant-workspace', 'dashboard'] as const,
  defaulters:   ['accountant-workspace', 'defaulters-grouped'] as const,
  ledger:       (studentId: string) => ['accountant-workspace', 'student-ledger', studentId] as const,
  classSummary: (klass: string, section: string) => ['accountant-workspace', 'class-fee-summary', klass, section] as const,
};

export const useAccountantDashboard = () =>
  useQuery({
    queryKey: accountantWorkspaceKeys.dashboard,
    queryFn:  accountantWorkspaceApi.getDashboard,
    staleTime: 30_000,
  });

/** `enabled: false` by default from callers that only need this on-demand (e.g. opening a "send reminder" modal) — avoids fetching up to 1000 records on every dashboard view. */
export const useGroupedDefaulters = (enabled = true) =>
  useQuery({
    queryKey: accountantWorkspaceKeys.defaulters,
    queryFn:  accountantWorkspaceApi.getGroupedDefaulters,
    staleTime: 30_000,
    enabled,
  });

export const useInvalidateAccountantDashboard = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
};

export const useSendDefaultersToTeacher = () =>
  useMutation({
    mutationFn: (payload: SendDefaultersToTeacherPayload) => accountantWorkspaceApi.sendDefaultersToTeacher(payload),
  });

export const useSendReceiptEmail = () =>
  useMutation({
    mutationFn: (payload: SendReceiptEmailPayload) => accountantWorkspaceApi.sendReceiptEmail(payload),
  });

export const useStudentLedger = (studentId: string) =>
  useQuery({
    queryKey: accountantWorkspaceKeys.ledger(studentId),
    queryFn:  () => accountantWorkspaceApi.getStudentLedger(studentId),
    enabled:  !!studentId,
  });

export const useInvalidateStudentLedger = (studentId: string) => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.ledger(studentId) });
};

export const useClassFeeSummary = (klass: string, section: string) =>
  useQuery({
    queryKey: accountantWorkspaceKeys.classSummary(klass, section),
    queryFn:  () => accountantWorkspaceApi.getClassFeeSummary(klass, section),
    enabled:  !!klass.trim() && !!section.trim(),
  });

export const useSendLedgerWhatsAppReminder = () =>
  useMutation({
    mutationFn: (studentId: string) => accountantWorkspaceApi.sendLedgerWhatsAppReminder(studentId),
  });

export const useSendLedgerStatementEmail = () =>
  useMutation({
    mutationFn: (studentId: string) => accountantWorkspaceApi.sendLedgerStatementEmail(studentId),
  });
