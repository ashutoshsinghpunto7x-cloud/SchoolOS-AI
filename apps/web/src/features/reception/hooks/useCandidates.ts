import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { candidateApi, CreateCandidateFormInput } from '../api/candidate.api';
import type { ForwardCandidatePayload, RejectCandidatePayload, SetCandidateFinalDecisionPayload, CandidateListOptions } from '@schoolos/types';

export const candidateKeys = {
  all:    ['candidates'] as const,
  lists:  () => [...candidateKeys.all, 'list'] as const,
  list:   (o: CandidateListOptions) => [...candidateKeys.lists(), o] as const,
  detail: (id: string) => [...candidateKeys.all, 'detail', id] as const,
};

export const useCandidates = (opts: CandidateListOptions = {}) =>
  useQuery({
    queryKey: candidateKeys.list(opts),
    queryFn:  () => candidateApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useCandidate = (id: string) =>
  useQuery({
    queryKey: candidateKeys.detail(id),
    queryFn:  () => candidateApi.getById(id),
    enabled:  !!id,
  });

export const useCheckCandidateDuplicate = (mobile: string) =>
  useQuery({
    queryKey: [...candidateKeys.all, 'duplicate-check', mobile],
    queryFn:  () => candidateApi.checkDuplicate(mobile),
    enabled:  /^[6-9]\d{9}$/.test(mobile),
  });

export const useCreateCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCandidateFormInput) => candidateApi.create(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: candidateKeys.all }),
  });
};

export const useForwardCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ForwardCandidatePayload }) => candidateApi.forward(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: candidateKeys.all }),
  });
};

export const useRejectCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectCandidatePayload }) => candidateApi.reject(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: candidateKeys.all }),
  });
};

export const useMarkCandidateUnderReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidateApi.markUnderReview(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: candidateKeys.all }),
  });
};

export const useSetCandidateFinalDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SetCandidateFinalDecisionPayload }) =>
      candidateApi.setFinalDecision(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: candidateKeys.all }),
  });
};

export const useDeleteCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => candidateApi.deleteCandidate(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: candidateKeys.all }),
  });
};
