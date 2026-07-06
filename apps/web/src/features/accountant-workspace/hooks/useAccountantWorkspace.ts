import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountantWorkspaceApi } from '../api/accountant-workspace.api';
import type { SendDefaultersToTeacherPayload, SendReceiptEmailPayload } from '@schoolos/types';

export const accountantWorkspaceKeys = {
  dashboard:  ['accountant-workspace', 'dashboard'] as const,
  defaulters: ['accountant-workspace', 'defaulters-grouped'] as const,
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
