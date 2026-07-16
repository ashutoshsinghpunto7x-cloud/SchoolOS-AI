import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolSettingsApi } from '../api/school-settings.api';
import type { AttendanceRules, PayrollConfig } from '@schoolos/types';

export const schoolSettingsKeys = {
  all: ['school-settings'] as const,
};

export const useSchoolSettings = () =>
  useQuery({
    queryKey: schoolSettingsKeys.all,
    queryFn: schoolSettingsApi.getSettings,
    staleTime: 5 * 60_000,
  });

export const useUploadSchoolLogo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => schoolSettingsApi.uploadLogo(file),
    onSuccess: (data) => qc.setQueryData(schoolSettingsKeys.all, data),
  });
};

export const useRemoveSchoolLogo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => schoolSettingsApi.removeLogo(),
    onSuccess: (data) => qc.setQueryData(schoolSettingsKeys.all, data),
  });
};

export const useUpdateAttendanceRules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttendanceRules) => schoolSettingsApi.updateAttendanceRules(payload),
    onSuccess: (data) => qc.setQueryData(schoolSettingsKeys.all, data),
  });
};

export const useUpdatePayrollConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayrollConfig) => schoolSettingsApi.updatePayrollConfig(payload),
    onSuccess: (data) => qc.setQueryData(schoolSettingsKeys.all, data),
  });
};
