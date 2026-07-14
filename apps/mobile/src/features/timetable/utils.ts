import type { PeriodSlot, TeacherWeekEntry, Timetable } from '@schoolos/types';

// Mirrors apps/server/src/features/teacher-workspace/teacher-workspace.service.ts's
// weekSchedule builder exactly (filter each timetable's entries by teacherId +
// dayOfWeek, resolve slot name/time via the period-slot map, sort by start time)
// so a teacher's schedule looks identical whether it came from their own
// self-service endpoint or was assembled here for viewing another teacher.
export function buildWeekSchedule(
  timetables: Timetable[],
  periods: PeriodSlot[],
  teacherId: string
): { dayOfWeek: number; entries: TeacherWeekEntry[] }[] {
  const slotMap = new Map(periods.map((slot) => [slot._id, slot]));

  return [1, 2, 3, 4, 5, 6].map((day) => {
    const entries: TeacherWeekEntry[] = timetables.flatMap((timetable) =>
      timetable.entries
        .filter((entry) => entry.dayOfWeek === day && entry.teacherId === teacherId)
        .map((entry) => {
          const slot = slotMap.get(entry.slotId);
          return {
            dayOfWeek: day,
            slotId: entry.slotId,
            slotName: slot?.name ?? '',
            startTime: slot?.startTime ?? '',
            endTime: slot?.endTime ?? '',
            subjectName: entry.subjectName,
            class: timetable.class,
            section: timetable.section,
            roomNumber: entry.roomNumber,
            timetableId: timetable._id,
          };
        })
    );

    entries.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { dayOfWeek: day, entries };
  });
}
