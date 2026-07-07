import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveRequestsApi } from '../api/leave-requests.api';
import type { CreateLeaveRequestPayload, RejectLeaveRequestPayload } from '@schoolos/types';

export const leaveRequestKeys = {
  mine: ['leave-requests', 'mine'] as const,
  pending: ['leave-requests', 'pending'] as const,
};

export const useMyLeaveRequests = () =>
  useQuery({
    queryKey: leaveRequestKeys.mine,
    queryFn: leaveRequestsApi.listMine,
    staleTime: 30_000,
  });

export const usePendingLeaveRequests = () =>
  useQuery({
    queryKey: leaveRequestKeys.pending,
    queryFn: leaveRequestsApi.listPending,
    staleTime: 30_000,
  });

export const useCreateLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeaveRequestPayload) => leaveRequestsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveRequestKeys.mine }),
  });
};

export const useApproveLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveRequestsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveRequestKeys.pending }),
  });
};

export const useRejectLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectLeaveRequestPayload }) =>
      leaveRequestsApi.reject(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveRequestKeys.pending }),
  });
};
