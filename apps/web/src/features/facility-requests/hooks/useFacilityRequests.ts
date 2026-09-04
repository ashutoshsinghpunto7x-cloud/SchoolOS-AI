import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { facilityRequestsApi } from '../api/facility-requests.api';
import { operationsKeys } from '@/features/operations/hooks/useOperations';
import { assetKeys } from '@/features/assets/hooks/useAssets';
import type {
  FacilityRequestListOptions,
  CreateFacilityRequestPayload,
  AssignFacilityRequestPayload,
  UpdateFacilityRequestStatusPayload,
} from '@schoolos/types';

export const facilityRequestKeys = {
  all: ['facility-requests'] as const,
  lists: () => [...facilityRequestKeys.all, 'list'] as const,
  list: (o: FacilityRequestListOptions) => [...facilityRequestKeys.lists(), o] as const,
  sla: () => [...facilityRequestKeys.all, 'sla'] as const,
};

export const useFacilityRequests = (opts: FacilityRequestListOptions = {}) =>
  useQuery({
    queryKey: facilityRequestKeys.list(opts),
    queryFn: () => facilityRequestsApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useFacilityRequestSla = (enabled: boolean) =>
  useQuery({
    queryKey: facilityRequestKeys.sla(),
    queryFn: facilityRequestsApi.slaReport,
    enabled,
  });

export const useCreateFacilityRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFacilityRequestPayload) => facilityRequestsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilityRequestKeys.lists() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
      // A ticket linked to an asset may have just flipped it to 'under_repair'.
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
};

export const useAssignFacilityRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignFacilityRequestPayload }) =>
      facilityRequestsApi.assign(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilityRequestKeys.lists() });
    },
  });
};

export const useUpdateFacilityRequestStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFacilityRequestStatusPayload }) =>
      facilityRequestsApi.updateStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilityRequestKeys.lists() });
      qc.invalidateQueries({ queryKey: facilityRequestKeys.sla() });
      qc.invalidateQueries({ queryKey: operationsKeys.summary });
      // 'completed'/'cancelled' may have just reverted the linked asset to 'active'.
      qc.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
};
