import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicYearApi } from '../api/academic-year.api';
import type { UpsertAcademicYearPayload } from '@schoolos/types';

export const academicYearKeys = {
  current: ['academic-year', 'current'] as const,
};

export const useAcademicYear = () =>
  useQuery({
    queryKey: academicYearKeys.current,
    queryFn:  () => academicYearApi.getCurrent(),
    retry:    false, // a 400 ("not configured yet") is an expected first-run state, not a transient failure
  });

export const useUpsertAcademicYear = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertAcademicYearPayload) => academicYearApi.upsert(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: academicYearKeys.current }),
  });
};
