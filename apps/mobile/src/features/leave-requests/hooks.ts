import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateLeaveRequestPayload } from '@schoolos/types';
import { leaveRequestsApi } from './api';

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: ['leave-requests', 'mine'],
    queryFn: leaveRequestsApi.listMine,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeaveRequestPayload) => leaveRequestsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests', 'mine'] }),
  });
}
