import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { visitorAppointmentApi } from '../api/visitor-appointment.api';
import type { CreateVisitorAppointmentPayload, VisitorAppointmentListOptions } from '@schoolos/types';

export const visitorAppointmentKeys = {
  all:   ['visitor-appointments'] as const,
  lists: () => [...visitorAppointmentKeys.all, 'list'] as const,
  list:  (o: VisitorAppointmentListOptions) => [...visitorAppointmentKeys.lists(), o] as const,
};

export const useVisitorAppointments = (opts: VisitorAppointmentListOptions = {}) =>
  useQuery({
    queryKey: visitorAppointmentKeys.list(opts),
    queryFn:  () => visitorAppointmentApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useCreateVisitorAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVisitorAppointmentPayload) => visitorAppointmentApi.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: visitorAppointmentKeys.all }),
  });
};

export const useCancelVisitorAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => visitorAppointmentApi.cancel(id, reason),
    onSuccess:  () => qc.invalidateQueries({ queryKey: visitorAppointmentKeys.all }),
  });
};

export const useMarkAppointmentNoShow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorAppointmentApi.markNoShow(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: visitorAppointmentKeys.all }),
  });
};
