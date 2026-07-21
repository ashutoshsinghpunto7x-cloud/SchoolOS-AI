import { staffAttendanceRepository } from './staff-attendance.repository';
import { scanQrSchema, employeeHistoryQuerySchema, manualMarkSchema } from './staff-attendance.validation';
import { IStaffAttendanceRecord, StaffAttendanceStatus } from './staff-attendance.model';
import { employeeService } from '../employees/employee.service';
import { employeeRepository } from '../employees/employee.repository';
import { IEmployee } from '../employees/employee.model';
import { schoolSettingsService } from '../school-settings/school-settings.service';
import { IAttendanceRules } from '../school-settings/school-settings.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';

export type ScanAction = 'check_in' | 'check_out' | 'already_marked';

export interface EmployeeSummary {
  photoUrl?: string;
  fullName: string;
  department?: string;
  designation: string;
}

export interface ScanResult {
  action: ScanAction;
  record: IStaffAttendanceRecord;
  employee: EmployeeSummary;
}

function timeOfDayString(date: Date): string {
  // IST time-of-day HH:mm, matching the IST-based date convention used for `date`.
  return date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
}

// rules.startTime marks the official shift start — check-ins up to
// rules.lateAfter still count as on-time so a minor clock/network lag isn't
// punished. rules.lateAfter and rules.halfDayAfter are the actual status cutoffs.
function statusForCheckIn(time: Date, rules: IAttendanceRules): StaffAttendanceStatus {
  const t = timeOfDayString(time);
  if (t <= rules.startTime || t <= rules.lateAfter) return 'present';
  if (t <= rules.halfDayAfter) return 'late';
  return 'half_day';
}

function toSummary(employee: IEmployee): EmployeeSummary {
  return {
    photoUrl: employee.photoUrl,
    fullName: employee.fullName,
    department: employee.department,
    designation: employee.designation,
  };
}

export const staffAttendanceService = {
  async scanQr(rawInput: unknown, ctx: AuthContext): Promise<ScanResult> {
    const { token, device } = scanQrSchema.parse(rawInput);

    const employee = await employeeService.verifyQrToken(token, ctx.schoolId);

    const date = staffAttendanceRepository.todayString();
    let record = await staffAttendanceRepository.findForEmployeeOnDate(ctx.schoolId, employee.employeeId, date);

    if (!record) {
      record = await staffAttendanceRepository.create({
        employeeId: employee.employeeId,
        employeeObjectId: employee._id.toString(),
        schoolId: ctx.schoolId,
        date,
      });
    }

    const now = new Date();

    if (!record.checkIn) {
      const { attendanceRules } = await schoolSettingsService.getSettings(ctx.schoolId);
      record.checkIn = { time: now, recordedBy: ctx.userId, device: device ?? 'web' };
      record.status = statusForCheckIn(now, attendanceRules);
      await record.save();

      auditService.log({
        userId: ctx.userId, userDisplayName: ctx.displayName,
        action: 'staff_attendance.checked_in', resource: 'staff_attendance',
        resourceId: record._id.toString(),
        details: { employeeId: employee.employeeId, status: record.status },
        ip: ctx.ip, schoolId: ctx.schoolId,
      });

      return { action: 'check_in', record, employee: toSummary(employee) };
    }

    if (!record.checkOut) {
      record.checkOut = { time: now, recordedBy: ctx.userId, device: device ?? 'web' };
      record.workingMinutes = Math.round((now.getTime() - new Date(record.checkIn.time).getTime()) / 60000);
      await record.save();

      auditService.log({
        userId: ctx.userId, userDisplayName: ctx.displayName,
        action: 'staff_attendance.checked_out', resource: 'staff_attendance',
        resourceId: record._id.toString(),
        details: { employeeId: employee.employeeId, workingMinutes: record.workingMinutes },
        ip: ctx.ip, schoolId: ctx.schoolId,
      });

      return { action: 'check_out', record, employee: toSummary(employee) };
    }

    // Both check-in and check-out already exist — idempotent response, not an
    // error, so a duplicate/accidental re-scan renders gracefully in the UI.
    return { action: 'already_marked', record, employee: toSummary(employee) };
  },

  /** Manual present/absent/late/half-day mark — the fallback for when a
   *  staff member's QR isn't handy. Same one-record-per-employee-per-day
   *  model as scanQr, just skipping the check-in/check-out punch clock. */
  async markManual(rawInput: unknown, ctx: AuthContext): Promise<ScanResult> {
    const { employeeId, status } = manualMarkSchema.parse(rawInput);

    const employee = await employeeRepository.findByEmployeeId(employeeId, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');

    const date = staffAttendanceRepository.todayString();
    let record = await staffAttendanceRepository.findForEmployeeOnDate(ctx.schoolId, employee.employeeId, date);

    if (!record) {
      record = await staffAttendanceRepository.create({
        employeeId: employee.employeeId,
        employeeObjectId: employee._id.toString(),
        schoolId: ctx.schoolId,
        date,
      });
    }

    const now = new Date();
    record.status = status;
    if (status !== 'absent' && !record.checkIn) {
      record.checkIn = { time: now, recordedBy: ctx.userId, device: 'manual' };
    }
    await record.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'staff_attendance.marked_manual', resource: 'staff_attendance',
      resourceId: record._id.toString(),
      details: { employeeId: employee.employeeId, status },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { action: 'check_in', record, employee: toSummary(employee) };
  },

  async listToday(ctx: AuthContext): Promise<IStaffAttendanceRecord[]> {
    const date = staffAttendanceRepository.todayString();
    return staffAttendanceRepository.listByDate(ctx.schoolId, date);
  },

  async listForEmployee(employeeId: string, rawQuery: unknown, ctx: AuthContext): Promise<IStaffAttendanceRecord[]> {
    const { from, to } = employeeHistoryQuerySchema.parse(rawQuery);
    if (!employeeId) throw new ValidationError('employeeId is required');
    return staffAttendanceRepository.listForEmployee(ctx.schoolId, employeeId, { from, to });
  },
};
