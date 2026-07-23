import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { playNotificationSound } from '../lib/notificationSound';
import type { SendMessageToTeachersPayload } from '@schoolos/types';

export const notificationKeys = {
  list: ['notifications', 'list'] as const,
  detail: (id: string) => ['notifications', 'detail', id] as const,
};

const POLL_INTERVAL_MS = 30_000;

export const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const seenIds = useRef<Set<string> | null>(null);

  const query = useQuery({
    queryKey: notificationKeys.list,
    queryFn: notificationsApi.list,
    enabled: isAuthenticated,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    const notifications = query.data?.notifications;
    if (!notifications) return;

    // First successful fetch just establishes the baseline — nothing "new"
    // yet, so no sound on initial load or on a page refresh.
    if (seenIds.current === null) {
      seenIds.current = new Set(notifications.map((n) => n._id));
      return;
    }

    const unseenUnread = notifications.filter((n) => !n.isRead && !seenIds.current!.has(n._id));
    for (const n of notifications) seenIds.current.add(n._id);

    if (unseenUnread.length > 0) playNotificationSound('default');
  }, [query.data]);

  return query;
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

export const useNotification = (id: string | undefined) =>
  useQuery({
    queryKey: notificationKeys.detail(id ?? ''),
    queryFn: () => notificationsApi.getById(id!),
    enabled: !!id,
  });

export const useUpdateCallStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: string }) =>
      notificationsApi.updateCallStatus(id, studentId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.detail(id) }),
  });
};
