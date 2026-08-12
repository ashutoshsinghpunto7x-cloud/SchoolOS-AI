import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { moduleAccessApi } from '../api/moduleAccessApi';
import type { BulkSetModuleAccessInput } from '../api/moduleAccessApi';

/** Ops Center management screen — full catalog + current restriction state. */
export const useModuleAccessList = () =>
  useQuery({
    queryKey: ['ops', 'module-access'],
    queryFn: moduleAccessApi.list,
  });

export const useBulkSetModuleAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkSetModuleAccessInput) => moduleAccessApi.bulkSet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'module-access'] });
      queryClient.invalidateQueries({ queryKey: ['module-access', 'status'] });
    },
  });
};

/** Polled by AppLayout to know which modules to block right now — 30s is
 *  frequent enough to notice a restriction/restore without hammering the API. */
export const useModuleAccessStatus = (enabled = true) =>
  useQuery({
    queryKey: ['module-access', 'status'],
    queryFn: moduleAccessApi.getStatus,
    refetchInterval: 30_000,
    enabled,
  });
