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
import { timetableRepository } from '../timetable/timetable.repository';

// Verify a teacher is assigned to the given class/section in their published timetable.
// No-op for non-teacher roles.
async function assertTeacherCanMarkClass(
  ctx: AuthContext,
  cls: string,
  section: string,
): Promise<void> {
  if (ctx.role !== 'teacher') return;

  const user = await User.findById(ctx.userId).select('email').lean() as { email?: string } | null;
  if (!user?.email) throw new ForbiddenError('Your account has no email — cannot verify class assignment');

  const teacher = await Teacher.findOne({ schoolId: ctx.schoolId, email: user.email, isDeleted: false })
    .select('_id')
    .lean() as { _id: unknown } | null;
  if (!teacher) throw new ForbiddenError('Teacher profile not found');

  const teacherId = String(teacher._id);
  const timetables = await timetableRepository.getTeacherSchedule(ctx.schoolId, teacherId);
  const teachesClass = timetables.some((t) => t.class === cls && t.section === section);
  if (!teachesClass) throw new ForbiddenError('You are not assigned to teach this class');
}

// ── Service ───────────────────────────────────────────────────────────────────

export const attendanceService = {
  async markSingle(rawInput: unknown, ctx: AuthContext): Promise<IAttendance> {
    const data = singleAttendanceSchema.parse(rawInput);

    if (ctx.role === 'teacher' && data.date > attendanceRepository.todayString()) {
      throw new ValidationError('Attendance cannot be marked for future dates');
    }
    await assertTeacherCanMarkClass(ctx, data.class, data.section);

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

    if (ctx.role === 'teacher' && data.date > attendanceRepository.todayString()) {
      throw new ValidationError('Attendance cannot be marked for future dates');
    }
    await assertTeacherCanMarkClass(ctx, data.class, data.section);

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

    return records;
  },

  async getById(id: string, ctx: AuthContext): Promise<IAttendance> {
    const record = await attendanceRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Attendance record');
    return record;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<IAttendance> {
    const data = updateAttendanceSchema.parse(rawInput);
    if (!data.status && data.note === undefined) throw new ValidationError('No fields to update');

    const existing = await attendanceRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Attendance record');

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
    return attendanceRepository.findByClassDate(ctx.schoolId, cls, section, targetDate);
  },

  async getStudentHistory(
    studentId: string,
    rawQuery: unknown,
    ctx: AuthContext,
  ): Promise<PaginatedAttendance> {
    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

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
    return attendanceRepository.findAll(ctx.schoolId, opts);
  },

  async getSummary(rawQuery: unknown, ctx: AuthContext): Promise<AttendanceSummary> {
    const opts = summarySchema.parse(rawQuery);
    return attendanceRepository.getSummary(ctx.schoolId, opts);
  },
};
