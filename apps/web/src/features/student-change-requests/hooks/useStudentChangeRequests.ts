import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentChangeRequestsApi } from '../api/student-change-requests.api';
import type { CreateChangeRequestPayload, RejectChangeRequestPayload } from '@schoolos/types';

export const changeRequestKeys = {
  pending: ['student-change-requests', 'pending'] as const,
};

export const useCreateChangeRequest = () =>
  useMutation({
    mutationFn: (payload: CreateChangeRequestPayload) => studentChangeRequestsApi.create(payload),
  });

export const usePendingChangeRequests = () =>
  useQuery({
    queryKey: changeRequestKeys.pending,
    queryFn: studentChangeRequestsApi.listPending,
  });

export const useApproveChangeRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentChangeRequestsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: changeRequestKeys.pending }),
  });
};

export const useRejectChangeRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectChangeRequestPayload }) =>
      studentChangeRequestsApi.reject(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: changeRequestKeys.pending }),
  });
};
