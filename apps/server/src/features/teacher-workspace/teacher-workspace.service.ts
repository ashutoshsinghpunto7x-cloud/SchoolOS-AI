import { User } from '../users/user.model';
import { Teacher, ITeacher } from '../teachers/teacher.model';
import { timetableRepository } from '../timetable/timetable.repository';
import { PeriodSlot, IPeriodSlot } from '../timetable/timetable.period.model';
import { Attendance } from '../attendance/attendance.model';
import { Student } from '../students/student.model';
import { ClassTeacherAssignment } from '../classes/class-teacher.model';
import { TimetableSubstitute } from '../timetable/timetable.substitute.model';
import { ForbiddenError, NotFoundError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import type { TeacherWorkspaceData, TodayClass, TeacherWeekEntry } from '@schoolos/types';

const classSectionKey = (cls: string, section: string) => `${cls}||${section}`;

// Resolve User → Teacher via email (JWT has userId = User._id)
async function resolveTeacher(ctx: AuthContext): Promise<ITeacher & { _id: { toString(): string } }> {
  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) {
    throw new ForbiddenError('Your user account has no email — cannot link to a teacher profile');
  }

  const teacher = await Teacher.findOne({
    schoolId: ctx.schoolId,
    email: user.email,
    isDeleted: false,
  }).lean() as unknown as (ITeacher & { _id: { toString(): string } }) | null;

  if (!teacher) {
    throw new NotFoundError(
      'Teacher profile not found. Ask your administrator to set your email on the teacher record.',
    );
  }
  return teacher;
}

// Local time YYYY-MM-DD (avoids UTC midnight shift in IST and similar UTC+ zones)
function todayLocalStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// JS getDay() is 0=Sun. Convert to 1=Mon … 6=Sat, 7=Sun
function jsDayToSchoolDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export const teacherWorkspaceService = {
  async getMe(ctx: AuthContext): Promise<TeacherWorkspaceData> {
    const teacher = await resolveTeacher(ctx);
    const teacherId = String(teacher._id);

    // Step 2: Today metadata
    const todayStr        = todayLocalStr();
    const todayDayOfWeek  = jsDayToSchoolDay(new Date().getDay());

    // Step 3: Parallel — timetables + period slots + who this teacher may mark
    // attendance for today (class-teacher assignments + active substitutions),
    // mirroring attendance.service.ts's assertTeacherCanMarkClass exactly so
    // the dashboard never shows a "Mark Attendance" affordance the save would
    // then reject — teaching a subject period there is not enough on its own.
    const [timetables, rawSlots, classTeacherAssignments, activeSubstitutionsToday] = await Promise.all([
      timetableRepository.getTeacherSchedule(ctx.schoolId, teacherId),
      PeriodSlot.find({ schoolId: ctx.schoolId, isDeleted: false })
        .sort({ orderIndex: 1 })
        .lean<IPeriodSlot[]>(),
      ClassTeacherAssignment.find({ schoolId: ctx.schoolId, teacherId }).lean<{ class: string; section: string }[]>(),
      TimetableSubstitute.find({
        schoolId: ctx.schoolId,
        substituteTeacherId: teacherId,
        status: 'active',
        isDeleted: false,
        date: new Date(todayStr),
      }).lean<{ class: string; section: string }[]>(),
    ]);

    const slots = rawSlots as unknown as (IPeriodSlot & { _id: { toString(): string } })[];
    const slotMap = new Map(slots.map((s) => [String(s._id), s]));

    const classTeacherOf = classTeacherAssignments.map((a) => ({ class: a.class, section: a.section }));
    const canMarkSet = new Set([
      ...classTeacherOf.map((a) => classSectionKey(a.class, a.section)),
      ...activeSubstitutionsToday.map((s) => classSectionKey(s.class, s.section)),
    ]);

    // Step 4: Build today's classes with attendance counts.
    //
    // Previously this fired 2 count queries (Attendance + Student) per
    // *entry* — i.e. per period slot taught today, not per distinct class —
    // so a teacher with 4 periods in the same class/section triggered 8
    // Mongo round trips for what's really only 1 distinct class/section pair
    // worth of counting. Under concurrency (100 teachers each hitting this
    // endpoint) that fan-out was the dominant cost of the whole request (see
    // performance/reports/validate-100-teachers-*, avg 2s+ before this
    // change). Fixed by first collecting the entries, then running exactly
    // 2 grouped aggregations total — one for attendance counts, one for
    // student counts — across every distinct class/section needed, however
    // many entries reference it.
    type EntryContext = {
      timetable: (typeof timetables)[number];
      entry: (typeof timetables)[number]['entries'][number];
    };
    const todayEntryContexts: EntryContext[] = [];
    const distinctPairs = new Map<string, { class: string; section: string }>();
    for (const timetable of timetables) {
      const todayEntries = timetable.entries.filter(
        (e) => e.dayOfWeek === todayDayOfWeek && e.teacherId === teacherId,
      );
      for (const entry of todayEntries) {
        todayEntryContexts.push({ timetable, entry });
        distinctPairs.set(classSectionKey(timetable.class, timetable.section), {
          class: timetable.class,
          section: timetable.section,
        });
      }
    }

    const pairList = Array.from(distinctPairs.values());
    const [attendanceCounts, studentCounts] = pairList.length === 0
      ? [[], []]
      : await Promise.all([
          Attendance.aggregate<{ _id: { class: string; section: string }; count: number }>([
            { $match: { schoolId: ctx.schoolId, date: todayStr, isDeleted: false, $or: pairList.map((p) => ({ class: p.class, section: p.section })) } },
            { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
          ]),
          Student.aggregate<{ _id: { class: string; section: string }; count: number }>([
            { $match: { schoolId: ctx.schoolId, admissionStatus: 'active', isDeleted: false, $or: pairList.map((p) => ({ class: p.class, section: p.section })) } },
            { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
          ]),
        ]);

    const attendanceCountMap = new Map(attendanceCounts.map((r) => [classSectionKey(r._id.class, r._id.section), r.count]));
    const studentCountMap = new Map(studentCounts.map((r) => [classSectionKey(r._id.class, r._id.section), r.count]));

    const todayClasses = todayEntryContexts
      .map(({ timetable, entry }): TodayClass => {
        const slot = slotMap.get(entry.slotId);
        const key = classSectionKey(timetable.class, timetable.section);
        const attendanceCount = attendanceCountMap.get(key) ?? 0;
        const totalStudents = studentCountMap.get(key) ?? 0;

        return {
          timetableId:      String((timetable as unknown as { _id: { toString(): string } })._id),
          class:            timetable.class,
          section:          timetable.section,
          slotId:           entry.slotId,
          slotName:         slot?.name ?? '',
          startTime:        slot?.startTime ?? '',
          endTime:          slot?.endTime ?? '',
          subjectName:      entry.subjectName,
          attendanceMarked: attendanceCount > 0,
          attendanceCount,
          totalStudents,
          canMarkAttendance: canMarkSet.has(key),
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Step 5: Build full week schedule (Mon–Sat, dayOfWeek 1–6)
    const weekSchedule = [1, 2, 3, 4, 5, 6].map((day) => ({
      dayOfWeek: day,
      entries: timetables
        .flatMap((t) =>
          t.entries
            .filter((e) => e.dayOfWeek === day && e.teacherId === teacherId)
            .map((e): TeacherWeekEntry => {
              const slot = slotMap.get(e.slotId);
              return {
                dayOfWeek:   day,
                slotId:      e.slotId,
                slotName:    slot?.name ?? '',
                startTime:   slot?.startTime ?? '',
                endTime:     slot?.endTime ?? '',
                subjectName: e.subjectName,
                class:       t.class,
                section:     t.section,
                roomNumber:  e.roomNumber,
                timetableId: String((t as unknown as { _id: { toString(): string } })._id),
              };
            }),
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));

    return {
      teacher: {
        _id:              teacherId,
        schoolId:         ctx.schoolId,
        fullName:         teacher.fullName,
        employeeId:       teacher.employeeId,
        email:            teacher.email,
        phone:            teacher.phone,
        department:       teacher.department,
        subjects:         teacher.subjects,
        assignedClasses:  teacher.assignedClasses,
        employmentStatus: teacher.employmentStatus,
        createdAt:        (teacher.createdAt as Date).toISOString(),
        updatedAt:        (teacher.updatedAt as Date).toISOString(),
      },
      todayClasses,
      todayDayOfWeek,
      weekSchedule,
      attendanceSummary: {
        classesMarkedToday: todayClasses.filter((c) => c.attendanceMarked).length,
        totalClassesToday:  todayClasses.length,
      },
      classTeacherOf,
      generatedAt: new Date().toISOString(),
    };
  },

};
