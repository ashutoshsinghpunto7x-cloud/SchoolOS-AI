import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { visitorApi } from '../api/visitor.api';
import type {
  CreateVisitorPayload,
  UpdateVisitorStatusPayload,
  CheckOutVisitorPayload,
  VisitorListOptions,
  VisitorIdProofType,
} from '@schoolos/types';

export const visitorKeys = {
  all:     ['visitors'] as const,
  lists:   () => [...visitorKeys.all, 'list'] as const,
  list:    (o: VisitorListOptions) => [...visitorKeys.lists(), o] as const,
  detail:  (id: string) => [...visitorKeys.all, 'detail', id] as const,
  history: (id: string) => [...visitorKeys.all, 'history', id] as const,
};

export const useVisitors = (opts: VisitorListOptions = {}) =>
  useQuery({
    queryKey: visitorKeys.list(opts),
    queryFn:  () => visitorApi.list(opts),
    placeholderData: keepPreviousData,
    // Reception's "waiting" queue needs to feel live without a manual
    // refresh — a visitor approved from another desk shows up within 15s.
    refetchInterval: 15_000,
  });

export const useVisitor = (id: string) =>
  useQuery({
    queryKey: visitorKeys.detail(id),
    queryFn:  () => visitorApi.getById(id),
    enabled:  !!id,
  });

export const useVisitorHistory = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: visitorKeys.history(id),
    queryFn:  () => visitorApi.getHistory(id),
    enabled:  !!id && enabled,
  });

export const useCreateVisitor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVisitorPayload) => visitorApi.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
};

export const useUpdateVisitorStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVisitorStatusPayload }) =>
      visitorApi.updateStatus(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
};

export const useUploadVisitorPhoto = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => visitorApi.uploadPhoto(id, file),
    onSuccess:  () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
};

export const useUploadVisitorIdProof = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idProofType, file }: { id: string; idProofType: VisitorIdProofType; file: File }) =>
      visitorApi.uploadIdProof(id, idProofType, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
};

export const useCheckOutVisitor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CheckOutVisitorPayload }) =>
      visitorApi.checkOut(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
};

export const useDeleteVisitor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorApi.deleteVisitor(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
  });
};

export const useArriveFromAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => visitorApi.arriveFromAppointment(appointmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: visitorKeys.all });
      qc.invalidateQueries({ queryKey: ['visitor-appointments'] });
    },
  });
};
