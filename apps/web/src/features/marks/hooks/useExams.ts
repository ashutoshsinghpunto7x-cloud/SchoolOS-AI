import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { examsApi } from '../api/exams.api';
import type { ExamListOptions, CreateExamPayload, UpdateExamPayload, ExamStatus } from '@schoolos/types';

export const examKeys = {
  all:     ['exams']                              as const,
  lists:   () => [...examKeys.all, 'list']         as const,
  list:    (o: ExamListOptions) => [...examKeys.lists(), o] as const,
  forClass:(cls: string) => [...examKeys.all, 'class', cls] as const,
  detail:  (id: string) => [...examKeys.all, 'detail', id] as const,
};

export const useExamList = (opts: ExamListOptions = {}) =>
  useQuery({
    queryKey: examKeys.list(opts),
    queryFn:  () => examsApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useExamsForClass = (cls?: string) =>
  useQuery({
    queryKey: examKeys.forClass(cls ?? ''),
    queryFn:  () => examsApi.listForClass(cls!),
    enabled:  !!cls,
  });

export const useExam = (id?: string) =>
  useQuery({
    queryKey: examKeys.detail(id ?? ''),
    queryFn:  () => examsApi.getById(id!),
    enabled:  !!id,
  });

export const useCreateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExamPayload) => examsApi.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: examKeys.all }),
  });
};

export const useUpdateExam = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateExamPayload) => examsApi.update(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: examKeys.all }),
  });
};

export const useUpdateExamStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: ExamStatus) => examsApi.updateStatus(id, status),
    onSuccess:  () => qc.invalidateQueries({ queryKey: examKeys.all }),
  });
};

export const useDeleteExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examsApi.deleteExam(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: examKeys.all }),
  });
};
