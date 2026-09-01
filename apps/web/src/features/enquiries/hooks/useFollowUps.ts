import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { followUpApi } from '../api/follow-up.api';
import type { CreateFollowUpPayload, CompleteFollowUpPayload, RescheduleFollowUpPayload, FollowUpListOptions } from '@schoolos/types';
import { enquiryKeys } from './useEnquiries';

export const followUpKeys = {
  all:   ['follow-ups'] as const,
  lists: () => [...followUpKeys.all, 'list'] as const,
  list:  (o: FollowUpListOptions) => [...followUpKeys.lists(), o] as const,
};

export const useFollowUps = (opts: FollowUpListOptions = {}) =>
  useQuery({
    queryKey: followUpKeys.list(opts),
    queryFn:  () => followUpApi.list(opts),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

// A completed/rescheduled follow-up also updates the linked Enquiry's
// denormalized followUpDate/lastContactedAt (see follow-up.service.ts
// server-side) — invalidating both caches keeps the pipeline view and the
// enquiry profile page in sync without a manual refresh.
function invalidateFollowUpsAndEnquiries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: followUpKeys.all });
  qc.invalidateQueries({ queryKey: enquiryKeys.all });
}

export const useCreateFollowUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFollowUpPayload) => followUpApi.create(payload),
    onSuccess:  () => invalidateFollowUpsAndEnquiries(qc),
  });
};

export const useCompleteFollowUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CompleteFollowUpPayload }) =>
      followUpApi.complete(id, payload),
    onSuccess: () => invalidateFollowUpsAndEnquiries(qc),
  });
};

export const useRescheduleFollowUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RescheduleFollowUpPayload }) =>
      followUpApi.reschedule(id, payload),
    onSuccess: () => invalidateFollowUpsAndEnquiries(qc),
  });
};

export const useDeleteFollowUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => followUpApi.deleteFollowUp(id),
    onSuccess:  () => invalidateFollowUpsAndEnquiries(qc),
  });
};
