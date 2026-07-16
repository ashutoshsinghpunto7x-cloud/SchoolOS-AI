import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { employeeApi } from '../api/employee.api';
import type {
  EmployeeListOptions,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  CreateEmployeeLoginPayload,
} from '@schoolos/types';

export const employeeKeys = {
  all:    ['employees'] as const,
  lists:  () => [...employeeKeys.all, 'list'] as const,
  list:   (o: EmployeeListOptions) => [...employeeKeys.lists(), o] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
  qr:     (id: string) => [...employeeKeys.all, 'qr', id] as const,
};

export const useEmployeeList = (opts: EmployeeListOptions = {}) =>
  useQuery({
    queryKey: employeeKeys.list(opts),
    queryFn:  () => employeeApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useEmployee = (id: string) =>
  useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn:  () => employeeApi.getById(id),
    enabled:  Boolean(id),
  });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => employeeApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
};

export const useUpdateEmployee = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEmployeePayload) => employeeApi.update(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.setQueryData(employeeKeys.detail(id), updated);
    },
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  });
};

export const useUploadEmployeePhoto = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => employeeApi.uploadPhoto(id, file),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.setQueryData(employeeKeys.detail(id), updated);
    },
  });
};

export const useUploadEmployeeSignature = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => employeeApi.uploadSignature(id, file),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.setQueryData(employeeKeys.detail(id), updated);
    },
  });
};

export const useCreateEmployeeLogin = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeeLoginPayload) => employeeApi.createLogin(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
};

export const useRegenerateEmployeeQr = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => employeeApi.regenerateQr(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.qr(id) });
      qc.setQueryData(employeeKeys.detail(id), updated);
    },
  });
};

export const useDisableEmployeeQr = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => employeeApi.disableQr(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      qc.invalidateQueries({ queryKey: employeeKeys.qr(id) });
      qc.setQueryData(employeeKeys.detail(id), updated);
    },
  });
};

export const useEmployeeQr = (id: string, enabled = true) =>
  useQuery({
    queryKey: employeeKeys.qr(id),
    queryFn:  () => employeeApi.getQr(id),
    enabled:  Boolean(id) && enabled,
    retry:    false,
  });

/** Self-service: the logged-in user's own linked Employee record, if any
 *  (e.g. a teacher viewing their own ID card/profile). */
export const useMyEmployee = () =>
  useQuery({
    queryKey: [...employeeKeys.all, 'me'] as const,
    queryFn:  () => employeeApi.getMe(),
    retry:    false,
  });

export const useMyEmployeeQr = (enabled = true) =>
  useQuery({
    queryKey: [...employeeKeys.all, 'me', 'qr'] as const,
    queryFn:  () => employeeApi.getMyQr(),
    enabled,
    retry:    false,
  });
