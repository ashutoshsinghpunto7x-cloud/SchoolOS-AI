import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internalMessagesApi } from '../api/internal-messages.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SendInternalMessagePayload, CreateMessageTemplatePayload } from '@schoolos/types';

export const internalMessageKeys = {
  list: ['internal-messages', 'list'] as const,
  pending: ['internal-messages', 'pending-ack'] as const,
  sent: ['internal-messages', 'sent'] as const,
  templates: ['internal-messages', 'templates'] as const,
  staff: ['internal-messages', 'staff-directory'] as const,
};

const POLL_INTERVAL_MS = 20_000;

export const useInternalMessages = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: internalMessageKeys.list,
    queryFn: internalMessagesApi.list,
    enabled: isAuthenticated,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const usePendingAcknowledgment = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: internalMessageKeys.pending,
    queryFn: internalMessagesApi.pendingAcknowledgment,
    enabled: isAuthenticated,
    refetchInterval: POLL_INTERVAL_MS,
  });
};

export const useMarkMessageRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => internalMessagesApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: internalMessageKeys.list }),
  });
};

export const useAcknowledgeMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => internalMessagesApi.acknowledge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: internalMessageKeys.pending });
      qc.invalidateQueries({ queryKey: internalMessageKeys.list });
    },
  });
};

export const useSendInternalMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendInternalMessagePayload) => internalMessagesApi.send(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: internalMessageKeys.sent }),
  });
};

export const useSentMessages = () =>
  useQuery({
    queryKey: internalMessageKeys.sent,
    queryFn: internalMessagesApi.listSent,
  });

export const useMessageTemplates = () =>
  useQuery({
    queryKey: internalMessageKeys.templates,
    queryFn: internalMessagesApi.listTemplates,
  });

export const useCreateMessageTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMessageTemplatePayload) => internalMessagesApi.createTemplate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: internalMessageKeys.templates }),
  });
};

export const useDeleteMessageTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => internalMessagesApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: internalMessageKeys.templates }),
  });
};

export const useStaffDirectory = () =>
  useQuery({
    queryKey: internalMessageKeys.staff,
    queryFn: internalMessagesApi.staffDirectory,
  });
