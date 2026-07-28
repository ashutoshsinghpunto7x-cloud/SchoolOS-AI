import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { principalAssistantApi, ActionPreview } from '../api/principal-assistant.api';

export type ActionPreviewStatus = 'pending' | 'editing' | 'executing' | 'error';

export type AssistantMessage =
  | { id: string; role: 'user' | 'assistant'; type: 'text'; content: string }
  | {
      id: string;
      role: 'assistant';
      type: 'action_preview';
      actionId: string;
      params: Record<string, unknown>;
      preview: ActionPreview;
      status: ActionPreviewStatus;
      error?: string;
    }
  | { id: string; role: 'assistant'; type: 'action_result'; actionId: string; summary: string; notifiedCount?: number };

export const usePrincipalAssistant = () => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  const mutation = useMutation({
    mutationFn: (message: string) => principalAssistantApi.sendMessage(message),
  });

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || mutation.isPending) return;

      const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: 'user', type: 'text', content: trimmed };
      setMessages((prev) => [...prev, userMessage]);

      mutation.mutate(trimmed, {
        onSuccess: (result) => {
          if (result.type === 'text') {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', type: 'text', content: result.reply }]);
            return;
          }
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              type: 'action_preview',
              actionId: result.actionId,
              params: result.params,
              preview: result.preview,
              status: 'pending',
            },
          ]);
        },
      });
    },
    [mutation]
  );

  /** Updates one field locally, then re-previews server-side to refresh conflict warnings. Never mutates. */
  const onEditField = useCallback(async (messageId: string, key: string, value: unknown) => {
    let actionId = '';
    let nextParams: Record<string, unknown> = {};

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || m.type !== 'action_preview') return m;
        nextParams = { ...m.params, [key]: value };
        actionId = m.actionId;
        return { ...m, params: nextParams, status: 'editing' };
      })
    );
    if (!actionId) return;

    try {
      const result = await principalAssistantApi.previewAction(actionId, nextParams);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.type === 'action_preview'
            ? { ...m, params: result.params, preview: result.preview, status: 'pending' }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.type === 'action_preview' ? { ...m, status: 'error', error: (err as Error).message } : m
        )
      );
    }
  }, []);

  const onApprove = useCallback(async (messageId: string) => {
    let actionId = '';
    let params: Record<string, unknown> = {};

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || m.type !== 'action_preview') return m;
        actionId = m.actionId;
        params = m.params;
        return { ...m, status: 'executing' };
      })
    );
    if (!actionId) return;

    try {
      const result = await principalAssistantApi.executeAction(actionId, params);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { id: m.id, role: 'assistant', type: 'action_result', actionId: result.actionId, summary: result.summary, notifiedCount: result.notifiedCount }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.type === 'action_preview' ? { ...m, status: 'error', error: (err as Error).message } : m
        )
      );
    }
  }, []);

  const onCancel = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return {
    messages,
    sendMessage,
    onEditField,
    onApprove,
    onCancel,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
