import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recoveryApi } from '../api/recovery.api';
import type { SubmitRecoveryRequestPayload, RejectRecoveryRequestPayload, SetNewPasswordPayload, SetPinPayload } from '@schoolos/types';

export const recoveryKeys = {
  all: ['recovery-requests'] as const,
  detail: (id: string) => [...recoveryKeys.all, 'detail', id] as const,
};

export const useSubmitRecoveryRequest = () =>
  useMutation({
    mutationFn: (payload: SubmitRecoveryRequestPayload) => recoveryApi.submitRequest(payload),
  });

export const useRecoveryRequests = (status?: string) =>
  useQuery({
    queryKey: [...recoveryKeys.all, status ?? 'all'],
    queryFn: () => recoveryApi.list(status),
  });

export const useRecoveryRequest = (id: string) =>
  useQuery({
    queryKey: recoveryKeys.detail(id),
    queryFn: () => recoveryApi.getById(id),
    enabled: !!id,
  });

export const useApproveRecoveryRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recoveryApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: recoveryKeys.all }),
  });
};

export const useRejectRecoveryRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: RejectRecoveryRequestPayload }) =>
      recoveryApi.reject(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: recoveryKeys.all }),
  });
};

export const useCompletePasswordReset = () =>
  useMutation({
    mutationFn: (payload: SetNewPasswordPayload) => recoveryApi.completePasswordReset(payload),
  });

export const useCompletePinReset = () =>
  useMutation({
    mutationFn: (payload: SetPinPayload) => recoveryApi.completePinReset(payload),
  });
