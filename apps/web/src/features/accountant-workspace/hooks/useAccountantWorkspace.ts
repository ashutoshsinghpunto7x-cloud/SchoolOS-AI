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

export const useGroupedDefaulters = () =>
  useQuery({
    queryKey: accountantWorkspaceKeys.defaulters,
    queryFn:  accountantWorkspaceApi.getGroupedDefaulters,
    staleTime: 30_000,
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
