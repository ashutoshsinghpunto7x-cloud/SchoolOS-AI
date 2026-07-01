import { User } from '../users/user.model';
import { Teacher, ITeacher } from '../teachers/teacher.model';
import { timetableRepository } from '../timetable/timetable.repository';
import { PeriodSlot, IPeriodSlot } from '../timetable/timetable.period.model';
import { ITimetable } from '../timetable/timetable.model';
import { Attendance } from '../attendance/attendance.model';
import { Student } from '../students/student.model';
import { ForbiddenError, NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { upsertOwnEntrySchema, removeOwnEntrySchema } from './teacher-workspace.validation';
import type { TeacherWorkspaceData, TodayClass, TeacherWeekEntry } from '@schoolos/types';

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

    // Step 3: Parallel — timetables + period slots
    const [timetables, rawSlots] = await Promise.all([
      timetableRepository.getTeacherSchedule(ctx.schoolId, teacherId),
      PeriodSlot.find({ schoolId: ctx.schoolId, isDeleted: false })
        .sort({ orderIndex: 1 })
        .lean<IPeriodSlot[]>(),
    ]);

    const slots = rawSlots as unknown as (IPeriodSlot & { _id: { toString(): string } })[];
    const slotMap = new Map(slots.map((s) => [String(s._id), s]));

    // Step 4: Build today's classes with attendance counts
    const todayClassPromises: Promise<TodayClass>[] = [];

    for (const timetable of timetables) {
      const todayEntries = timetable.entries.filter(
        (e) => e.dayOfWeek === todayDayOfWeek && e.teacherId === teacherId,
      );

      for (const entry of todayEntries) {
        const slot = slotMap.get(entry.slotId);

        const promise = Promise.all([
          Attendance.countDocuments({
            schoolId: ctx.schoolId,
            class:    timetable.class,
            section:  timetable.section,
            date:     todayStr,
            isDeleted: false,
          }),
          Student.countDocuments({
            schoolId:        ctx.schoolId,
            class:           timetable.class,
            section:         timetable.section,
            admissionStatus: 'active',
            isDeleted:       false,
          }),
        ]).then(([attendanceCount, totalStudents]): TodayClass => ({
          timetableId:      String((timetable as unknown as { _id: { toString(): string } })._id),
          class:            timetable.class,
          section:          timetable.section,
          slotId:           entry.slotId,
          slotName:         slot?.name ?? entry.slotId,
          startTime:        slot?.startTime ?? '',
          endTime:          slot?.endTime ?? '',
          subjectName:      entry.subjectName,
          attendanceMarked: attendanceCount > 0,
          attendanceCount,
          totalStudents,
        }));

        todayClassPromises.push(promise);
      }
    }

    const todayClasses = (await Promise.all(todayClassPromises)).sort(
      (a, b) => a.startTime.localeCompare(b.startTime),
    );

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
                slotName:    slot?.name ?? e.slotId,
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
      generatedAt: new Date().toISOString(),
    };
  },

  // ── Self-service timetable ────────────────────────────────────────────────
  // A teacher may add/edit/remove their own periods only — never another
  // teacher's entries. Reuses the same Timetable documents the admin module
  // manages; conflict-checked against the teacher's own existing slots.

  async upsertOwnTimetableEntry(rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const input = upsertOwnEntrySchema.parse(rawInput);
    const teacher = await resolveTeacher(ctx);
    const teacherId = String(teacher._id);
    const academicYear = String(new Date().getFullYear());

    let tt = await timetableRepository.findByClassSection(ctx.schoolId, input.class, input.section, academicYear);
    if (!tt) {
      tt = await timetableRepository.create({
        schoolId: ctx.schoolId,
        class: input.class,
        section: input.section,
        academicYear,
        createdBy: ctx.displayName,
      });
    }
    const timetableId = String((tt as unknown as { _id: { toString(): string } })._id);

    // Block overwriting a slot another teacher already owns at this class/section.
    const existingEntry = tt.entries.find((e) => e.dayOfWeek === input.dayOfWeek && e.slotId === input.slotId);
    if (existingEntry && existingEntry.teacherId && existingEntry.teacherId !== teacherId) {
      throw new ValidationError(
        `${existingEntry.teacherName ?? 'Another teacher'} already has this period for Class ${input.class}-${input.section}.`,
      );
    }

    // Block double-booking the teacher into two classes at the same slot.
    const clash = await timetableRepository.findConflictingTeacher(
      ctx.schoolId, timetableId, input.dayOfWeek, input.slotId, teacherId,
    );
    if (clash) {
      throw new ValidationError(
        `You already have a class scheduled at this time (Class ${clash.class}-${clash.section}).`,
      );
    }

    const updated = await timetableRepository.upsertEntry(timetableId, ctx.schoolId, {
      dayOfWeek:   input.dayOfWeek,
      slotId:      input.slotId,
      subjectName: input.subjectName,
      teacherId,
      teacherName: teacher.fullName,
      roomNumber:  input.roomNumber,
      updatedBy:   ctx.displayName,
    });
    if (!updated) throw new NotFoundError('Timetable');
    return updated;
  },

  async removeOwnTimetableEntry(rawInput: unknown, ctx: AuthContext): Promise<ITimetable> {
    const input = removeOwnEntrySchema.parse(rawInput);
    const teacher = await resolveTeacher(ctx);
    const teacherId = String(teacher._id);
    const academicYear = String(new Date().getFullYear());

    const tt = await timetableRepository.findByClassSection(ctx.schoolId, input.class, input.section, academicYear);
    if (!tt) throw new NotFoundError('Timetable');
    const timetableId = String((tt as unknown as { _id: { toString(): string } })._id);

    const entry = tt.entries.find((e) => e.dayOfWeek === input.dayOfWeek && e.slotId === input.slotId);
    if (!entry) throw new NotFoundError('Timetable entry');
    if (entry.teacherId !== teacherId) {
      throw new ForbiddenError('You can only remove your own periods.');
    }

    const updated = await timetableRepository.removeEntry(timetableId, ctx.schoolId, input.dayOfWeek, input.slotId, ctx.displayName);
    if (!updated) throw new NotFoundError('Timetable');
    return updated;
  },
};
