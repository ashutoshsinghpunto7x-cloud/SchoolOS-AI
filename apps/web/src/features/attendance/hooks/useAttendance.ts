import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { attendanceApi } from '../api/attendance.api';
import type {
  AttendanceListOptions,
  StudentHistoryOptions,
  AttendanceSummaryOptions,
  MarkAttendancePayload,
  BulkAttendancePayload,
  UpdateAttendancePayload,
} from '@schoolos/types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const attendanceKeys = {
  all:           ['attendance']                        as const,
  lists:         ()  => [...attendanceKeys.all, 'list']      as const,
  list:          (o: AttendanceListOptions) => [...attendanceKeys.lists(), o] as const,
  detail:        (id: string) => [...attendanceKeys.all, 'detail', id] as const,
  classDate:     (cls: string, sec: string, date?: string) =>
                   [...attendanceKeys.all, 'class', cls, sec, date ?? 'today'] as const,
  studentHistory:(id: string, o: StudentHistoryOptions) =>
                   [...attendanceKeys.all, 'student', id, o] as const,
  summary:       (o: AttendanceSummaryOptions) => [...attendanceKeys.all, 'summary', o] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export const useAttendanceList = (opts: AttendanceListOptions = {}) =>
  useQuery({
    queryKey: attendanceKeys.list(opts),
    queryFn:  () => attendanceApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useAttendance = (id: string) =>
  useQuery({
    queryKey: attendanceKeys.detail(id),
    queryFn:  () => attendanceApi.getById(id),
    enabled:  !!id,
  });

export const useClassAttendance = (cls: string, section: string, date?: string) =>
  useQuery({
    queryKey: attendanceKeys.classDate(cls, section, date),
    queryFn:  () => attendanceApi.getClassAttendance(cls, section, date),
    enabled:  !!cls && !!section,
  });

export const useStudentAttendanceHistory = (studentId: string, opts: StudentHistoryOptions = {}) =>
  useQuery({
    queryKey: attendanceKeys.studentHistory(studentId, opts),
    queryFn:  () => attendanceApi.getStudentHistory(studentId, opts),
    enabled:  !!studentId,
    placeholderData: keepPreviousData,
  });

export const useAttendanceSummary = (opts: AttendanceSummaryOptions = {}, enabled = true) =>
  useQuery({
    queryKey: attendanceKeys.summary(opts),
    queryFn:  () => attendanceApi.getSummary(opts),
    enabled,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useMarkAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarkAttendancePayload) => attendanceApi.markSingle(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
};

export const useBulkMarkAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkAttendancePayload) => attendanceApi.bulkMark(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
};

export const useUpdateAttendance = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAttendancePayload) => attendanceApi.update(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
};

export const useDeleteAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attendanceApi.deleteRecord(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
};
