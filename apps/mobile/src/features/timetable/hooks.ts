import { useQuery } from '@tanstack/react-query';
import { timetableApi } from './api';
import { buildWeekSchedule } from './utils';

// Combines the two calls a teacher's schedule needs (timetable entries +
// period-slot names/times) into the same week-schedule shape the backend's
// teacher-workspace/me endpoint returns for self, so any teacher's timetable
// can be viewed through one shared component.
export function useTeacherWeekSchedule(teacherId: string) {
  return useQuery({
    queryKey: ['timetable', 'teacher-week', teacherId],
    queryFn: async () => {
      const [timetables, periods] = await Promise.all([
        timetableApi.getTeacherSchedule(teacherId),
        timetableApi.getPeriods(),
      ]);
      return buildWeekSchedule(timetables, periods, teacherId);
    },
    enabled: !!teacherId,
  });
}
