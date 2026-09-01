import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { interviewApi } from '../api/interview.api';
import type {
  ScheduleInterviewPayload, RescheduleInterviewPayload, SetInterviewStatusPayload,
  SubmitInterviewFeedbackPayload, InterviewListOptions,
} from '@schoolos/types';
import { candidateKeys } from './useCandidates';

export const interviewKeys = {
  all:        ['interviews'] as const,
  lists:      () => [...interviewKeys.all, 'list'] as const,
  list:       (o: InterviewListOptions) => [...interviewKeys.lists(), o] as const,
  byCandidate:(candidateId: string) => [...interviewKeys.all, 'by-candidate', candidateId] as const,
};

export const useInterviews = (opts: InterviewListOptions = {}) =>
  useQuery({
    queryKey: interviewKeys.list(opts),
    queryFn:  () => interviewApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useInterviewsByCandidate = (candidateId: string) =>
  useQuery({
    queryKey: interviewKeys.byCandidate(candidateId),
    queryFn:  () => interviewApi.getByCandidate(candidateId),
    enabled:  !!candidateId,
  });

// Scheduling/completing an interview also flips the linked Candidate's
// status (see interview.service.ts server-side) — invalidate both caches.
function invalidateInterviewsAndCandidates(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: interviewKeys.all });
  qc.invalidateQueries({ queryKey: candidateKeys.all });
}

export const useScheduleInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScheduleInterviewPayload) => interviewApi.schedule(payload),
    onSuccess:  () => invalidateInterviewsAndCandidates(qc),
  });
};

export const useSetInterviewStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SetInterviewStatusPayload }) => interviewApi.setStatus(id, payload),
    onSuccess:  () => invalidateInterviewsAndCandidates(qc),
  });
};

export const useRescheduleInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RescheduleInterviewPayload }) => interviewApi.reschedule(id, payload),
    onSuccess:  () => invalidateInterviewsAndCandidates(qc),
  });
};

export const useSubmitInterviewFeedback = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SubmitInterviewFeedbackPayload }) => interviewApi.submitFeedback(id, payload),
    onSuccess:  () => invalidateInterviewsAndCandidates(qc),
  });
};

export const useDeleteInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => interviewApi.deleteInterview(id),
    onSuccess:  () => invalidateInterviewsAndCandidates(qc),
  });
};
