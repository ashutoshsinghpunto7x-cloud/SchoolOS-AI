import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { assetsApi } from '../api/assets.api';
import { operationsKeys } from '@/features/operations/hooks/useOperations';
import type { AssetListOptions, CreateAssetPayload, UpdateAssetPayload } from '@schoolos/types';

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (o: AssetListOptions) => [...assetKeys.lists(), o] as const,
};

export const useAssets = (opts: AssetListOptions = {}) =>
  useQuery({
    queryKey: assetKeys.list(opts),
    queryFn: () => assetsApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => assetsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetPayload }) => assetsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};
