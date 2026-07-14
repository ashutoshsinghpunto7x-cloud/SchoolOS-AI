import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { principalAssistantApi } from '../api/principal-assistant.api';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const usePrincipalAssistant = () => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  const mutation = useMutation({
    mutationFn: (message: string) => principalAssistantApi.sendMessage(message),
  });

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || mutation.isPending) return;

      const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMessage]);

      mutation.mutate(trimmed, {
        onSuccess: (result) => {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', content: result.reply },
          ]);
        },
      });
    },
    [mutation]
  );

  return {
    messages,
    sendMessage,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
