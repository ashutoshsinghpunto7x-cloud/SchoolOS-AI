import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { visitorApi } from '../api/visitor.api';
import type { CreateVisitorPayload, CheckOutVisitorPayload, VisitorListOptions } from '@schoolos/types';

export const visitorKeys = {
  all:   ['visitors'] as const,
  lists: () => [...visitorKeys.all, 'list'] as const,
  list:  (o: VisitorListOptions) => [...visitorKeys.lists(), o] as const,
  detail:(id: string) => [...visitorKeys.all, 'detail', id] as const,
};

export const useVisitors = (opts: VisitorListOptions = {}) =>
  useQuery({
    queryKey: visitorKeys.list(opts),
    queryFn:  () => visitorApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useVisitor = (id: string) =>
  useQuery({
    queryKey: visitorKeys.detail(id),
    queryFn:  () => visitorApi.getById(id),
    enabled:  !!id,
  });

export const useCreateVisitor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVisitorPayload) => visitorApi.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: visitorKeys.all }),
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
