import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffAttendanceApi } from '../api/staff-attendance.api';
import type { ScanQrPayload, ManualMarkPayload } from '@schoolos/types';

export const staffAttendanceKeys = {
  all:      ['staff-attendance'] as const,
  today:    () => [...staffAttendanceKeys.all, 'today'] as const,
  employee: (employeeId: string, opts?: { from?: string; to?: string }) =>
    [...staffAttendanceKeys.all, 'employee', employeeId, opts ?? {}] as const,
};

export const useTodayStaffAttendance = () =>
  useQuery({
    queryKey: staffAttendanceKeys.today(),
    queryFn:  () => staffAttendanceApi.today(),
    refetchInterval: 30_000,
  });

export const useEmployeeAttendanceHistory = (employeeId: string, opts: { from?: string; to?: string } = {}) =>
  useQuery({
    queryKey: staffAttendanceKeys.employee(employeeId, opts),
    queryFn:  () => staffAttendanceApi.forEmployee(employeeId, opts),
    enabled:  Boolean(employeeId),
  });

export const useScanQr = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScanQrPayload) => staffAttendanceApi.scan(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffAttendanceKeys.today() }),
  });
};

export const useMarkAttendanceManual = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManualMarkPayload) => staffAttendanceApi.markManual(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffAttendanceKeys.today() }),
  });
};
