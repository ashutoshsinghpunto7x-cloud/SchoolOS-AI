import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api/events.api';
import { principalKeys } from '@/features/principal/hooks/usePrincipal';
import type {
  CreateEventPayload,
  UpdateEventPayload,
  UpdateEventStatusPayload,
  EventListOptions,
  UpcomingEventsOptions,
} from '@schoolos/types';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const eventKeys = {
  all:           ['events'] as const,
  lists:         () => [...eventKeys.all, 'list'] as const,
  list:          (opts: EventListOptions) => [...eventKeys.lists(), opts] as const,
  detail:        (id: string) => [...eventKeys.all, 'detail', id] as const,
  upcoming:      (opts: UpcomingEventsOptions) => [...eventKeys.all, 'upcoming', opts] as const,
  readReceipts:  (id: string) => [...eventKeys.all, 'read-receipts', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export const useEvents = (opts: EventListOptions = {}) =>
  useQuery({
    queryKey:        eventKeys.list(opts),
    queryFn:         () => eventsApi.list(opts),
    placeholderData: (prev) => prev,
  });

export const useEvent = (id: string) =>
  useQuery({
    queryKey: eventKeys.detail(id),
    queryFn:  () => eventsApi.getById(id),
    enabled:  Boolean(id),
  });

export const useUpcomingEvents = (opts: UpcomingEventsOptions = {}, enabled = true) =>
  useQuery({
    queryKey: eventKeys.upcoming(opts),
    queryFn:  () => eventsApi.getUpcoming(opts),
    enabled,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

// Every mutation below also invalidates the principal dashboard's cache —
// it fetches upcomingEvents through a separate aggregate endpoint (not
// eventKeys), so without this a principal creating/editing an event on the
// Calendar page wouldn't see it reflected on their own dashboard until the
// 2-minute staleTime lapsed.
export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => eventsApi.create(payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: principalKeys.dashboard() });
    },
  });
};

export const useUpdateEvent = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEventPayload) => eventsApi.update(id, payload),
    onSuccess:  (updated) => {
      qc.setQueryData(eventKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: eventKeys.lists() });
      qc.invalidateQueries({ queryKey: eventKeys.upcoming({}) });
      qc.invalidateQueries({ queryKey: principalKeys.dashboard() });
    },
  });
};

export const useUpdateEventStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEventStatusPayload) => eventsApi.updateStatus(id, payload),
    onSuccess:  (updated) => {
      qc.setQueryData(eventKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: eventKeys.lists() });
      qc.invalidateQueries({ queryKey: eventKeys.upcoming({}) });
      qc.invalidateQueries({ queryKey: principalKeys.dashboard() });
    },
  });
};

export const useDeleteEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: principalKeys.dashboard() });
    },
  });
};

export const useMarkEventRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.markRead(id),
    onSuccess:  (_data, id) => qc.invalidateQueries({ queryKey: eventKeys.readReceipts(id) }),
  });
};

export const useEventReadReceipts = (id: string, enabled = true) =>
  useQuery({
    queryKey: eventKeys.readReceipts(id),
    queryFn:  () => eventsApi.getReadReceipts(id),
    enabled:  Boolean(id) && enabled,
  });

export const useUploadEventAttachment = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => eventsApi.uploadAttachment(id, file),
    onSuccess:  (updated) => qc.setQueryData(eventKeys.detail(id), updated),
  });
};

export const useRemoveEventAttachment = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eventsApi.removeAttachment(id),
    onSuccess:  (updated) => qc.setQueryData(eventKeys.detail(id), updated),
  });
};
