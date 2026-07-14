import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceSummaryOptions, BulkAttendancePayload } from '@schoolos/types';
import { attendanceApi } from './api';

export const attendanceKeys = {
  summary: (options: AttendanceSummaryOptions) => ['attendance', 'summary', options] as const,
  class: (klass: string, section: string, date?: string) => ['attendance', 'class', klass, section, date] as const,
};

export function useAttendanceSummary(options: AttendanceSummaryOptions = {}) {
  return useQuery({
    queryKey: attendanceKeys.summary(options),
    queryFn: () => attendanceApi.getSummary(options),
  });
}

export function useClassAttendance(klass: string, section: string, date?: string) {
  return useQuery({
    queryKey: attendanceKeys.class(klass, section, date),
    queryFn: () => attendanceApi.getClassAttendance(klass, section, date),
    enabled: !!klass && !!section,
  });
}

export function useBulkMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkAttendancePayload) => attendanceApi.bulkMark(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
