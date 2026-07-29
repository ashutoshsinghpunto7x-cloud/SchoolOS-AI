import { attendanceRepository, PaginatedAttendance, AttendanceSummary } from './attendance.repository';
import { IAttendance } from './attendance.model';
import {
  singleAttendanceSchema,
  bulkAttendanceSchema,
  updateAttendanceSchema,
  listAttendanceSchema,
  studentHistorySchema,
  classAttendanceSchema,
  summarySchema,
} from './attendance.validation';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { studentRepository } from '../students/student.repository';
import { User } from '../users/user.model';
import { Teacher } from '../teachers/teacher.model';
import { substituteRepository } from '../timetable/timetable.substitute.repository';
import { classTeacherRepository } from '../classes/class-teacher.repository';
import { schoolSettingsService } from '../school-settings/school-settings.service';
import { attendanceNotificationService } from '../communication/attendance-notification.service';
import { logger } from '../../lib/logger';

// Teachers may only mark/edit attendance for the current day — past dates are
// permanently view-only (no backfilling forgotten days) and future dates are
// not yet in session. Same-day editing additionally closes at the principal's
// configured cutoff time, if one is set. Admins/principals are exempt, same
// as the class-assignment check below.
async function assertAttendanceEditableForTeacher(ctx: AuthContext, date: string): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const today = attendanceRepository.todayString();
  if (date !== today) {
    throw new ValidationError('Attendance can only be marked or edited for today — past attendance is view-only and future dates are not allowed.');
  }

  const settings = await schoolSettingsService.getSettings(ctx.schoolId);
  const cutoffTime = settings.attendanceEditPolicy?.cutoffTime;
  if (cutoffTime) {
    const nowTime = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    if (nowTime > cutoffTime) {
      throw new ValidationError(`Attendance editing is closed for today after ${cutoffTime}. Contact your principal for changes.`);
    }
  }
}

// Only the class teacher assigned to a class/section (by admin/principal) may
// mark its attendance — teaching a subject there is not enough, since a
// subject teacher marking attendance for someone else's class would produce
// attendance no one is accountable for. An active substitute for that class
// on the given date is allowed too, since that's the whole point of a
// substitution. No-op for non-teacher roles (admin/principal already have
// school-wide authority here).
async function assertTeacherCanMarkClass(
  ctx: AuthContext,
  cls: string,
  section: string,
  date: string,
): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class assignment');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean() as { _id: unknown } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  const teacherId = String(teacher._id);

  const assignment = await classTeacherRepository.findOne(ctx.schoolId, cls, section);
  if (assignment && assignment.teacherId === teacherId) return;

  const isSubstitute = await substituteRepository.isActiveSubstitute(ctx.schoolId, teacherId, cls, section, date);
  if (!isSubstitute) throw new ForbiddenError('You are not the class teacher for this class — only the assigned class teacher (or an active substitute) can mark attendance');
}

// ── Service ───────────────────────────────────────────────────────────────────

export const attendanceService = {
  async markSingle(rawInput: unknown, ctx: AuthContext): Promise<IAttendance> {
    const data = singleAttendanceSchema.parse(rawInput);

    await assertAttendanceEditableForTeacher(ctx, data.date);
    await assertTeacherCanMarkClass(ctx, data.class, data.section, data.date);

    const student = await studentRepository.findById(data.studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const record = await attendanceRepository.upsert({
      studentId:    data.studentId,
      class:        data.class,
      section:      data.section,
      date:         data.date,
      status:       data.status,
      note:         data.note,
      schoolId:     ctx.schoolId,
      markedById:   ctx.userId,
      markedByName: ctx.displayName,
      markedAt:     new Date(),
    });

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'attendance.marked',
      resource:        'attendance',
      resourceId:      record._id.toString(),
      details:         { studentId: data.studentId, date: data.date, status: data.status },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return record;
  },

  async bulkMark(rawInput: unknown, ctx: AuthContext): Promise<IAttendance[]> {
    const data = bulkAttendanceSchema.parse(rawInput);

    await assertAttendanceEditableForTeacher(ctx, data.date);
    await assertTeacherCanMarkClass(ctx, data.class, data.section, data.date);

    const records = await attendanceRepository.bulkUpsert(
      data.records.map((r) => ({
        studentId:    r.studentId,
        schoolId:     ctx.schoolId,
        class:        data.class,
        section:      data.section,
        date:         data.date,
        status:       r.status,
        note:         r.note,
        markedById:   ctx.userId,
        markedByName: ctx.displayName,
        markedAt:     new Date(),
      }))
    );

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'attendance.bulk_marked',
      resource:        'attendance',
      resourceId:      `${data.class}-${data.section}-${data.date}`,
      details:         { class: data.class, section: data.section, date: data.date, count: records.length },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    // Auto Send (Communication Settings) — fire-and-forget so a slow/failed
    // notification run never delays or fails the attendance submission itself.
    schoolSettingsService.getSettings(ctx.schoolId)
      .then((settings) => {
        if (!settings.communicationSettings.attendanceAutoNotify) return;
        return attendanceNotificationService.sendAbsentNotifications(
          { date: data.date, class: data.class, section: data.section },
          ctx,
        );
      })
      .catch((err) => {
        logger.error('Attendance auto-notify failed', { class: data.class, section: data.section, date: data.date, err });
      });

    return records;
  },

  async getById(id: string, ctx: AuthContext): Promise<IAttendance> {
    const record = await attendanceRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Attendance record');
    await assertTeacherCanMarkClass(ctx, record.class, record.section, record.date);
    return record;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<IAttendance> {
    const data = updateAttendanceSchema.parse(rawInput);
    if (!data.status && data.note === undefined) throw new ValidationError('No fields to update');

    const existing = await attendanceRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Attendance record');

    // Same rules as marking: only the assigned class teacher/substitute may
    // edit, and only for today's (still-open) attendance — without this, any
    // teacher could PATCH another class's record by guessing/enumerating ids.
    await assertAttendanceEditableForTeacher(ctx, existing.date);
    await assertTeacherCanMarkClass(ctx, existing.class, existing.section, existing.date);

    const record = await attendanceRepository.update(id, ctx.schoolId, data);
    if (!record) throw new NotFoundError('Attendance record');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'attendance.updated',
      resource:        'attendance',
      resourceId:      id,
      details:         { from: existing.status, to: data.status ?? existing.status },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return record;
  },

  async deleteRecord(id: string, ctx: AuthContext): Promise<void> {
    const existing = await attendanceRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Attendance record');

    const deleted = await attendanceRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Attendance record');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'attendance.deleted',
      resource:        'attendance',
      resourceId:      id,
      details:         { studentId: existing.studentId, date: existing.date },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },

  async getClassAttendance(
    cls: string,
    section: string,
    rawQuery: unknown,
    ctx: AuthContext,
  ): Promise<IAttendance[]> {
    const { date } = classAttendanceSchema.parse(rawQuery);
    const targetDate = date ?? attendanceRepository.todayString();
    await assertTeacherCanMarkClass(ctx, cls, section, targetDate);
    return attendanceRepository.findByClassDate(ctx.schoolId, cls, section, targetDate);
  },

  async getStudentHistory(
    studentId: string,
    rawQuery: unknown,
    ctx: AuthContext,
  ): Promise<PaginatedAttendance> {
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    // Approximated on the student's current class/section — a teacher may
    // view history for a student in their assigned class, same as they can
    // mark attendance for them today.
    await assertTeacherCanMarkClass(ctx, student.class, student.section, attendanceRepository.todayString());

    const opts = studentHistorySchema.parse(rawQuery);
    return attendanceRepository.findByStudent(ctx.schoolId, studentId, {
      page:     opts.page,
      limit:    opts.limit,
      dateFrom: opts.dateFrom,
      dateTo:   opts.dateTo,
      status:   opts.status,
    });
  },

  async listAll(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedAttendance> {
    const opts = listAttendanceSchema.parse(rawQuery);
    // Unlike getClassAttendance/getStudentHistory, this endpoint has no
    // required class/section in the URL — a teacher could otherwise omit or
    // swap the class/section query params to pull every class's records.
    if (ctx.role === 'teacher') {
      if (!opts.class || !opts.section) {
        throw new ForbiddenError('Specify a class and section to view attendance — use the class-scoped view.');
      }
      await assertTeacherCanMarkClass(ctx, opts.class, opts.section, opts.date ?? attendanceRepository.todayString());
    }
    return attendanceRepository.findAll(ctx.schoolId, opts);
  },

  async getSummary(rawQuery: unknown, ctx: AuthContext): Promise<AttendanceSummary> {
    const opts = summarySchema.parse(rawQuery);
    if (ctx.role === 'teacher') {
      if (!opts.class || !opts.section) {
        throw new ForbiddenError('Specify a class and section to view attendance summary — use the class-scoped view.');
      }
      await assertTeacherCanMarkClass(ctx, opts.class, opts.section, attendanceRepository.todayString());
    }
    return attendanceRepository.getSummary(ctx.schoolId, opts);
  },
};
