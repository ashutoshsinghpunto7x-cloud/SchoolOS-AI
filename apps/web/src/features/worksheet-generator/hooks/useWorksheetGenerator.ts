import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { worksheetGeneratorApi } from '../api/worksheet-generator.api';
import type { WorksheetListOptions, GenerateWorksheetPayload, SaveWorksheetPayload } from '@schoolos/types';

export const worksheetKeys = {
  all:    ['worksheet-generator']                        as const,
  lists:  () => [...worksheetKeys.all, 'list']            as const,
  list:   (o: WorksheetListOptions) => [...worksheetKeys.lists(), o] as const,
  detail: (id: string) => [...worksheetKeys.all, 'detail', id] as const,
};

export const useWorksheets = (opts: WorksheetListOptions = {}) =>
  useQuery({
    queryKey: worksheetKeys.list(opts),
    queryFn:  () => worksheetGeneratorApi.list(opts),
  });

export const useWorksheet = (id: string) =>
  useQuery({
    queryKey: worksheetKeys.detail(id),
    queryFn:  () => worksheetGeneratorApi.getById(id),
    enabled:  !!id,
  });

// AI generation never saves anything, so no query invalidation on success.
export const useGenerateWorksheet = () =>
  useMutation({ mutationFn: (payload: GenerateWorksheetPayload) => worksheetGeneratorApi.generate(payload) });

function useInvalidatingMutation<TPayload, TResult>(fn: (payload: TPayload) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess:  () => qc.invalidateQueries({ queryKey: worksheetKeys.all }),
  });
}

export const useSaveWorksheet = () => useInvalidatingMutation((payload: SaveWorksheetPayload) => worksheetGeneratorApi.save(payload));
export const useDeleteWorksheet = () => useInvalidatingMutation((id: string) => worksheetGeneratorApi.delete(id));
