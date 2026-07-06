import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { SendMessageToTeachersPayload } from '@schoolos/types';

export const notificationKeys = {
  list: ['notifications', 'list'] as const,
};

const POLL_INTERVAL_MS = 30_000;

export const useNotifications = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: notificationsApi.list,
    enabled: isAuthenticated,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list }),
  });
};

export const useSendMessageToTeachers = () =>
  useMutation({
    mutationFn: (payload: SendMessageToTeachersPayload) => notificationsApi.sendMessageToTeachers(payload),
  });
