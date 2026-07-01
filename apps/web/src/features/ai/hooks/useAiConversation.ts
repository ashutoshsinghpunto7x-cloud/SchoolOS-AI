import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../api/ai.api';
import type { AiConversationStatus } from '@schoolos/types';

const TERMINAL_CONV_STATUSES: AiConversationStatus[] = ['completed', 'failed'];

export const aiKeys = {
  all: ['ai'] as const,
  conversation: (commId: string) => [...aiKeys.all, 'conversation', commId] as const,
  status: () => [...aiKeys.all, 'status'] as const,
};

/** Fetches the AI conversation for a communication. Polls until terminal status. */
export const useAiConversation = (communicationId: string | null | undefined) =>
  useQuery({
    queryKey: aiKeys.conversation(communicationId ?? ''),
    queryFn: () => aiApi.getConversation(communicationId!),
    enabled: Boolean(communicationId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL_CONV_STATUSES.includes(status)) return false;
      return 3_000;
    },
    staleTime: 0,
  });

/** Fetches AI provider status. Admin-only. */
export const useAiStatus = () =>
  useQuery({
    queryKey: aiKeys.status(),
    queryFn: aiApi.getStatus,
    staleTime: 60_000,
    retry: false,
  });
