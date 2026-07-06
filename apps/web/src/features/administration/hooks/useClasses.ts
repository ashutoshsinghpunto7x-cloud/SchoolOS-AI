import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '../api/classes.api';
import type { UpsertClassTeacherPayload } from '@schoolos/types';

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
    onSuccess: () => qc.invalidateQueries({ queryKey: classesKeys.all }),
  });
};
