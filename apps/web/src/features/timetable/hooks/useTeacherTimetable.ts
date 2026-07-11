import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherTimetableApi } from '../api/teacher-timetable.api';
import type {
  GetOrCreateTeacherTimetablePayload,
  BulkUpdateTeacherTimetableEntriesPayload,
  UpdateTeacherTimetableStatusPayload,
} from '@schoolos/types';

export const teacherTimetableKeys = {
  all:     ['teacher-timetable'] as const,
  teacher: (teacherId: string) => [...teacherTimetableKeys.all, 'teacher', teacherId] as const,
  mine:    () => [...teacherTimetableKeys.all, 'me'] as const,
};

export const useTeacherTimetableFor = (teacherId: string) =>
  useQuery({
    queryKey: teacherTimetableKeys.teacher(teacherId),
    queryFn:  () => teacherTimetableApi.getForTeacher(teacherId),
    enabled:  !!teacherId,
  });

export const useMyTeacherTimetable = () =>
  useQuery({
    queryKey: teacherTimetableKeys.mine(),
    queryFn:  teacherTimetableApi.getMine,
  });

export const useGetOrCreateTeacherTimetable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GetOrCreateTeacherTimetablePayload) => teacherTimetableApi.getOrCreate(payload),
    onSuccess: (tt) => qc.setQueryData(teacherTimetableKeys.teacher(tt.teacherId), tt),
  });
};

export const useBulkUpdateTeacherTimetableEntries = (id: string, teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkUpdateTeacherTimetableEntriesPayload) => teacherTimetableApi.bulkUpdateEntries(id, payload),
    onSuccess: (result) => {
      qc.setQueryData(teacherTimetableKeys.teacher(teacherId), result.timetable);
    },
  });
};

export const useUpdateTeacherTimetableStatus = (id: string, teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTeacherTimetableStatusPayload) => teacherTimetableApi.updateStatus(id, payload),
    onSuccess: (tt) => qc.setQueryData(teacherTimetableKeys.teacher(teacherId), tt),
  });
};
