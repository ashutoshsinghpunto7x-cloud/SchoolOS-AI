import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../api/classes.api';
import type { UpsertClassTeacherPayload, RemoveClassTeacherPayload } from '@schoolos/types';

export const classesKeys = {
  all: ['classes'] as const,
};

export const useClassSections = () =>
  useQuery({
    queryKey: classesKeys.all,
    queryFn: classesApi.list,
  });

export const useAssignClassTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertClassTeacherPayload) => classesApi.assignTeacher(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classesKeys.all });
      // Defaulter-notification screens (accountant) prefill each class's
      // teacher from this same assignment — keep them in sync too.
      qc.invalidateQueries({ queryKey: ['accountant-workspace', 'defaulters-grouped'] });
    },
  });
};

export const useRemoveClassTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RemoveClassTeacherPayload) => classesApi.removeTeacher(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classesKeys.all });
      qc.invalidateQueries({ queryKey: ['accountant-workspace', 'defaulters-grouped'] });
    },
  });
};
