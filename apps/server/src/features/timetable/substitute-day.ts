import { Timetable, ITimetable } from './timetable.model';
import { substituteRepository } from './timetable.substitute.repository';
import { ITimetableSubstitute } from './timetable.substitute.model';
import { TeacherTimetable, ITeacherTimetable } from '../teacher-timetable/teacher-timetable.model';
import { leaveRequestRepository } from '../leave-requests/leave-request.repository';
import { StaffAttendanceRecord } from '../staff-attendance/staff-attendance.model';
import { Teacher } from '../teachers/teacher.model';
import { classKey } from './substitute-ranking';

export interface AbsentTeacher {
  teacherId: string;
  teacherName: string;
  reason: 'leave' | 'absent';
  leaveRequestId?: string;
}

export interface ScheduledPeriod {
  teacherId: string;
  class: string;
  section: string;
  slotId: string;
  subjectName: string;
  timetableId: string;
}

export interface SubstituteDay {
  dayOfWeek: number;
  absent: Map<string, AbsentTeacher>;
  /** Every period taught on this weekday, one per class + section + slot + teacher. */
  periods: ScheduledPeriod[];
  /** teacherId → slot ids taken that day (own periods + substitutions). */
  busySlots: Map<string, Set<string>>;
  /** Substitute records for this date, cancelled ones included. */
  substitutes: ITimetableSubstitute[];
}

/** Teachers on approved leave, or marked absent in staff attendance. */
async function findAbsentTeachers(schoolId: string, date: string): Promise<Map<string, AbsentTeacher>> {
  const [leaves, absentRecords] = await Promise.all([
    leaveRequestRepository.findApprovedForDate(schoolId, date),
    StaffAttendanceRecord.find({ schoolId, date, status: 'absent' }).select('employeeId').lean(),
  ]);

  const absent = new Map<string, AbsentTeacher>();
  for (const leave of leaves) {
    absent.set(leave.teacherId, {
      teacherId: leave.teacherId,
      teacherName: leave.teacherName,
      reason: 'leave',
      leaveRequestId: String(leave._id),
    });
  }

  if (absentRecords.length) {
    // Staff attendance is keyed by employeeId, timetables by the Teacher's _id.
    const teachers = await Teacher.find({
      schoolId, isDeleted: false, employeeId: { $in: absentRecords.map((r) => r.employeeId) },
    }).select('_id fullName').lean();
    for (const t of teachers) {
      const teacherId = String(t._id);
      if (!absent.has(teacherId)) absent.set(teacherId, { teacherId, teacherName: t.fullName, reason: 'absent' });
    }
  }
  return absent;
}

/** Everything needed to decide who is away, who is busy and who is free on one date. */
export async function loadSubstituteDay(schoolId: string, date: string): Promise<SubstituteDay> {
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();

  const [absent, timetables, teacherTimetables, existing] = await Promise.all([
    findAbsentTeachers(schoolId, date),
    Timetable.find({ schoolId, isDeleted: false, status: { $in: ['draft', 'published'] } })
      .sort({ updatedAt: -1 }).lean<ITimetable[]>(),
    TeacherTimetable.find({ schoolId, isDeleted: false }).sort({ updatedAt: -1 }).lean<ITeacherTimetable[]>(),
    substituteRepository.findAll(schoolId, { dateFrom: date, dateTo: date, limit: 100 }),
  ]);

  const periods: ScheduledPeriod[] = [];
  const busySlots = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const classSlotsTaken = new Set<string>();
  const timetableIdByClass = new Map<string, string>();

  const markBusy = (teacherId: string, slotId: string) => {
    const slots = busySlots.get(teacherId) ?? new Set<string>();
    busySlots.set(teacherId, slots.add(slotId));
  };
  const addPeriod = (period: ScheduledPeriod) => {
    markBusy(period.teacherId, period.slotId);
    const key = `${classKey(period.class, period.section)}||${period.slotId}||${period.teacherId}`;
    if (seen.has(key)) return;
    seen.add(key);
    periods.push(period);
  };

  for (const tt of timetables) {
    const timetableId = String(tt._id);
    const key = classKey(tt.class, tt.section);
    if (!timetableIdByClass.has(key)) timetableIdByClass.set(key, timetableId);
    for (const e of tt.entries) {
      if (e.dayOfWeek !== dayOfWeek || !e.teacherId) continue;
      classSlotsTaken.add(`${key}||${e.slotId}`);
      addPeriod({
        teacherId: e.teacherId, class: tt.class, section: tt.section,
        slotId: e.slotId, subjectName: e.subjectName, timetableId,
      });
    }
  }

  // Periods that exist only in a teacher's own schedule. The class timetable
  // wins when it names a different teacher for the same slot.
  const latestSeen = new Set<string>();
  for (const own of teacherTimetables) {
    if (latestSeen.has(own.teacherId)) continue;
    latestSeen.add(own.teacherId);
    for (const e of own.entries) {
      if (e.dayOfWeek !== dayOfWeek) continue;
      markBusy(own.teacherId, e.slotId);
      if (!e.class || !e.section) continue;
      const key = classKey(e.class, e.section);
      const timetableId = timetableIdByClass.get(key);
      if (!timetableId || classSlotsTaken.has(`${key}||${e.slotId}`)) continue;
      addPeriod({
        teacherId: own.teacherId, class: e.class, section: e.section,
        slotId: e.slotId, subjectName: e.subjectName, timetableId,
      });
    }
  }

  for (const sub of existing.substitutes) {
    if (sub.status === 'active' && sub.substituteTeacherId) markBusy(sub.substituteTeacherId, sub.slotId);
  }

  return { dayOfWeek, absent, periods, busySlots, substitutes: existing.substitutes };
}
