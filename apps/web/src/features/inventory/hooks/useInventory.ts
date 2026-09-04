import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventory.api';
import { operationsKeys } from '@/features/operations/hooks/useOperations';
import type { InventoryItemListOptions, CreateInventoryItemPayload, CreateStockMovementPayload } from '@schoolos/types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (o: InventoryItemListOptions) => [...inventoryKeys.lists(), o] as const,
  movements: (id: string) => [...inventoryKeys.all, 'movements', id] as const,
};

export const useInventoryItems = (opts: InventoryItemListOptions = {}) =>
  useQuery({
    queryKey: inventoryKeys.list(opts),
    queryFn: () => inventoryApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useInventoryMovements = (id: string) =>
  useQuery({
    queryKey: inventoryKeys.movements(id),
    queryFn: () => inventoryApi.listMovements(id),
    enabled: !!id,
  });

export const useCreateInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryItemPayload) => inventoryApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};

export const useCreateStockMovement = (itemId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStockMovementPayload) => inventoryApi.createMovement(itemId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryKeys.movements(itemId) });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};
