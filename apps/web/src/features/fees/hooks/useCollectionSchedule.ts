import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionScheduleApi } from '../api/collection-schedule.api';
import type { UpsertCollectionSchedulePayload } from '@schoolos/types';

export const collectionScheduleKeys = {
  all: ['collection-schedule'] as const,
  list: (year: string) => [...collectionScheduleKeys.all, 'list', year] as const,
};

export const useCollectionSchedule = (academicYear: string) =>
  useQuery({
    queryKey: collectionScheduleKeys.list(academicYear),
    queryFn: () => collectionScheduleApi.list(academicYear),
    enabled: !!academicYear,
  });

export const useUpsertCollectionSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertCollectionSchedulePayload) => collectionScheduleApi.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionScheduleKeys.all }),
  });
};

export const useDeleteCollectionScheduleEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ academicYear, depositMonth }: { academicYear: string; depositMonth: string }) =>
      collectionScheduleApi.remove(academicYear, depositMonth),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionScheduleKeys.all }),
  });
};

export const useUseDefaultSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (academicYear: string) => collectionScheduleApi.useDefaultSchedule(academicYear),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionScheduleKeys.all }),
  });
};
