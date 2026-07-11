import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentChangeRequestsApi } from '../api/student-change-requests.api';
import type { CreateChangeRequestPayload, RejectChangeRequestPayload } from '@schoolos/types';

export const changeRequestKeys = {
  pending: ['student-change-requests', 'pending'] as const,
  pendingForStudent: (studentId: string) => ['student-change-requests', 'pending', studentId] as const,
};

export const useCreateChangeRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChangeRequestPayload) => studentChangeRequestsApi.create(payload),
    onSuccess: (_result, payload) => {
      qc.invalidateQueries({ queryKey: changeRequestKeys.pendingForStudent(payload.studentId) });
    },
  });
};

export const usePendingChangeRequests = () =>
  useQuery({
    queryKey: changeRequestKeys.pending,
    queryFn: studentChangeRequestsApi.listPending,
  });

export const usePendingChangeRequestsForStudent = (studentId: string, enabled = true) =>
  useQuery({
    queryKey: changeRequestKeys.pendingForStudent(studentId),
    queryFn: () => studentChangeRequestsApi.listPendingForStudent(studentId),
    enabled: enabled && !!studentId,
  });

export const useApproveChangeRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentChangeRequestsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: changeRequestKeys.pending });
      // Approval writes straight to the Student record (e.g. monthlyTuitionFee) —
      // refresh every screen reading student data, not just this request list.
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['accountant-workspace'] });
      qc.invalidateQueries({ queryKey: ['fees'] });
    },
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
