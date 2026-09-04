import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { purchasesApi } from '../api/purchases.api';
import { operationsKeys } from '@/features/operations/hooks/useOperations';
import type {
  PurchaseRequestListOptions,
  CreatePurchaseRequestPayload,
  PurchaseOrderListOptions,
  CreatePurchaseOrderPayload,
  ReceivePurchaseOrderPayload,
} from '@schoolos/types';

export const purchaseKeys = {
  all: ['purchases'] as const,
  requestLists: () => [...purchaseKeys.all, 'requests', 'list'] as const,
  requestList: (o: PurchaseRequestListOptions) => [...purchaseKeys.requestLists(), o] as const,
  requestDetail: (id: string) => [...purchaseKeys.all, 'requests', 'detail', id] as const,
  orderLists: () => [...purchaseKeys.all, 'orders', 'list'] as const,
  orderList: (o: PurchaseOrderListOptions) => [...purchaseKeys.orderLists(), o] as const,
  orderDetail: (id: string) => [...purchaseKeys.all, 'orders', 'detail', id] as const,
};

export const usePurchaseRequests = (opts: PurchaseRequestListOptions = {}) =>
  useQuery({
    queryKey: purchaseKeys.requestList(opts),
    queryFn: () => purchasesApi.listRequests(opts),
    placeholderData: keepPreviousData,
  });

export const useCreatePurchaseRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseRequestPayload) => purchasesApi.createRequest(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.requestLists() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};

export const useApprovePurchaseRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.approveRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.requestLists() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};

export const useRejectPurchaseRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason?: string }) =>
      purchasesApi.rejectRequest(id, rejectionReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.requestLists() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};

export const usePurchaseOrders = (opts: PurchaseOrderListOptions = {}) =>
  useQuery({
    queryKey: purchaseKeys.orderList(opts),
    queryFn: () => purchasesApi.listOrders(opts),
    placeholderData: keepPreviousData,
  });

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => purchasesApi.createOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.orderLists() });
      qc.invalidateQueries({ queryKey: purchaseKeys.requestLists() });
    },
  });
};

export const useReceivePurchaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ReceivePurchaseOrderPayload }) =>
      purchasesApi.receiveOrder(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.orderLists() });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
    },
  });
};
