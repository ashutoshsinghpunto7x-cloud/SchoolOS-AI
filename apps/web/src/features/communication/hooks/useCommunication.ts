import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationApi } from '../api/communication.api';
import type { CommStatus, CommunicationsQueryOptions, UpdateCommunicationPayload } from '@schoolos/types';

const TERMINAL: CommStatus[] = ['COMPLETED', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED'];

export const communicationKeys = {
  all: ['communications'] as const,
  lists: () => [...communicationKeys.all, 'list'] as const,
  list: (opts: CommunicationsQueryOptions) => [...communicationKeys.lists(), opts] as const,
  byStudent: (id: string) => [...communicationKeys.all, 'student', id] as const,
  detail: (id: string) => [...communicationKeys.all, 'detail', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/** Global paginated list — for dashboard/history views. */
export const useCommList = (opts: CommunicationsQueryOptions = {}) =>
  useQuery({
    queryKey: communicationKeys.list(opts),
    queryFn: () => communicationApi.list(opts),
  });

export const useCommunicationList = (studentId: string | null) =>
  useQuery({
    queryKey: communicationKeys.byStudent(studentId ?? ''),
    queryFn: () => communicationApi.listByStudent(studentId!),
    enabled: Boolean(studentId),
  });

/** Polls every 2 s until the communication reaches a terminal status. */
export const useCommunicationById = (id: string | null) =>
  useQuery({
    queryKey: communicationKeys.detail(id ?? ''),
    queryFn: () => communicationApi.getById(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.includes(status) ? false : 2_000;
    },
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useInitiateCall = () =>
  useMutation({ mutationFn: (studentId: string) => communicationApi.initiateCall(studentId) });

export const useCreateNote = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => communicationApi.createNote(studentId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: communicationKeys.byStudent(studentId) }),
  });
};

export const useSendWhatsApp = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => communicationApi.sendWhatsApp(studentId, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: communicationKeys.byStudent(studentId) }),
  });
};

export const useUpdateCommunication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCommunicationPayload }) =>
      communicationApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: communicationKeys.detail(id) });
      qc.invalidateQueries({ queryKey: communicationKeys.lists() });
    },
  });
};
