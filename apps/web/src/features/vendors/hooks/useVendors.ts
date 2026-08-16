import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { vendorsApi } from '../api/vendors.api';
import { accountantWorkspaceKeys } from '@/features/accountant-workspace/hooks/useAccountantWorkspace';
import type {
  VendorListOptions,
  CreateVendorPayload,
  UpdateVendorPayload,
  CreateVendorBillPayload,
  RecordVendorPaymentPayload,
} from '@schoolos/types';

export const vendorKeys = {
  all:     ['vendors'] as const,
  lists:   () => [...vendorKeys.all, 'list'] as const,
  list:    (o: VendorListOptions) => [...vendorKeys.lists(), o] as const,
  detail:  (id: string) => [...vendorKeys.all, 'detail', id] as const,
  ledger:  (id: string) => [...vendorKeys.all, 'ledger', id] as const,
  bills:   (id: string) => [...vendorKeys.all, 'bills', id] as const,
  overdue: () => [...vendorKeys.all, 'overdue'] as const,
};

export const useVendorList = (opts: VendorListOptions = {}) =>
  useQuery({
    queryKey: vendorKeys.list(opts),
    queryFn:  () => vendorsApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useVendorProfile = (id: string) =>
  useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn:  () => vendorsApi.getProfile(id),
    enabled:  !!id,
  });

export const useVendorBills = (id: string) =>
  useQuery({
    queryKey: vendorKeys.bills(id),
    queryFn:  () => vendorsApi.listBills(id),
    enabled:  !!id,
  });

export const useVendorLedger = (id: string) =>
  useQuery({
    queryKey: vendorKeys.ledger(id),
    queryFn:  () => vendorsApi.getLedger(id),
    enabled:  !!id,
  });

export const useCreateVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorPayload) => vendorsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vendorKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useUpdateVendor = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVendorPayload) => vendorsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vendorKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useDeleteVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vendorKeys.all });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useRecordVendorBill = (vendorId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorBillPayload) => vendorsApi.createBill(vendorId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vendorKeys.detail(vendorId) });
      qc.invalidateQueries({ queryKey: vendorKeys.ledger(vendorId) });
      qc.invalidateQueries({ queryKey: vendorKeys.bills(vendorId) });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useRecordVendorPayment = (vendorId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordVendorPaymentPayload) => vendorsApi.recordPayment(vendorId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vendorKeys.detail(vendorId) });
      qc.invalidateQueries({ queryKey: vendorKeys.ledger(vendorId) });
      qc.invalidateQueries({ queryKey: vendorKeys.bills(vendorId) });
      qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.dashboard });
    },
  });
};

export const useOverdueVendorBills = () =>
  useQuery({
    queryKey: vendorKeys.overdue(),
    queryFn:  vendorsApi.getOverdueBills,
  });
