import { payrollRepository, PaginatedPayroll, PayrollSummary, CreatePayrollData } from './payroll.repository';
import { IPayrollRecord } from './payroll.model';
import {
  generatePayrollSchema,
  generateAllPayrollSchema,
  markPayrollPaidSchema,
  listPayrollSchema,
  payrollSummarySchema,
} from './payroll.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { Employee, IEmployee } from '../employees/employee.model';
import { employeeRepository } from '../employees/employee.repository';
import { employeeService } from '../employees/employee.service';
import { staffAttendanceRepository } from '../staff-attendance/staff-attendance.repository';
import { schoolSettingsService } from '../school-settings/school-settings.service';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface GenerateAllResult {
  succeeded: string[];
  failed: { employeeId: string; error: string }[];
}

/** Shared calculation + upsert core, used by both the single-employee and
 *  batch generation entry points. Does not audit-log — callers do that. */
async function generateForEmployeeCore(
  employee: IEmployee,
  month: number,
  year: number,
  ctx: AuthContext,
): Promise<IPayrollRecord> {
  if (!employee.monthlySalary) {
    throw new ValidationError('Set a monthly salary for this employee before generating payroll');
  }

  const settings = await schoolSettingsService.getSettings(ctx.schoolId);
  const workingDaysPerMonth = settings.payrollConfig.workingDaysPerMonth;

  const existing = await payrollRepository.findByEmployeeMonthYear(
    ctx.schoolId, employee._id.toString(), month, year,
  );
  if (existing && existing.status === 'paid') {
    throw new ValidationError('Cannot regenerate a payroll record that has already been marked paid');
  }

  const paddedMonth = String(month).padStart(2, '0');
  const from = `${year}-${paddedMonth}-01`;
  const to   = `${year}-${paddedMonth}-31`;

  const attendance = await staffAttendanceRepository.listForEmployee(ctx.schoolId, employee.employeeId, { from, to });

  let presentDays = 0, lateDays = 0, halfDays = 0, absentDays = 0;
  for (const record of attendance) {
    if (record.status === 'present') presentDays += 1;
    else if (record.status === 'late') lateDays += 1;
    else if (record.status === 'half_day') halfDays += 1;
    else if (record.status === 'absent') absentDays += 1;
  }

  const monthlySalary = employee.monthlySalary;
  const dailyRate = monthlySalary / workingDaysPerMonth;
  const deductions = round2(absentDays * dailyRate + halfDays * (dailyRate / 2));
  const grossSalary = round2(monthlySalary);
  const netSalary = round2(grossSalary - deductions);

  const data: CreatePayrollData = {
    employeeObjectId: employee._id.toString(),
    employeeId: employee.employeeId,
    employeeName: employee.fullName,
    designation: employee.designation,
    department: employee.department,
    schoolId: ctx.schoolId,
    month,
    year,
    workingDaysPerMonth,
    dailyRate: round2(dailyRate),
    presentDays,
    lateDays,
    halfDays,
    absentDays,
    grossSalary,
    deductions,
    netSalary,
    status: 'generated',
    generatedAt: new Date(),
    createdBy: ctx.displayName,
  };

  if (existing) {
    const updated = await payrollRepository.update(existing._id.toString(), ctx.schoolId, {
      ...data,
      updatedBy: ctx.displayName,
    });
    if (!updated) throw new NotFoundError('Payroll record');
    return updated;
  }

  return payrollRepository.create(data);
}

export const payrollService = {
  async generateForEmployee(rawInput: unknown, ctx: AuthContext): Promise<IPayrollRecord> {
    const data = generatePayrollSchema.parse(rawInput);

    const employee = await employeeRepository.findById(data.employeeObjectId, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee');

    const record = await generateForEmployeeCore(employee, data.month, data.year, ctx);

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'payroll.generated', resource: 'payroll', resourceId: record._id.toString(),
      details: { employeeName: employee.fullName, month: data.month, year: data.year, netSalary: record.netSalary },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  /** Generates payroll for every active employee with a monthly salary set.
   *  Each employee is processed independently so one failure doesn't abort
   *  the batch. One summary audit entry is logged for the whole run rather
   *  than per-record, mirroring salary.service.ts's bulkCreateSalaryRecords. */
  async generateForAllEmployees(rawInput: unknown, ctx: AuthContext): Promise<GenerateAllResult> {
    const data = generateAllPayrollSchema.parse(rawInput);

    const employees = await Employee.find({
      schoolId: ctx.schoolId,
      status: 'active',
      monthlySalary: { $exists: true, $ne: null },
      isDeleted: false,
    }).lean<IEmployee[]>();

    const succeeded: string[] = [];
    const failed: { employeeId: string; error: string }[] = [];

    for (const employee of employees) {
      try {
        await generateForEmployeeCore(employee, data.month, data.year, ctx);
        succeeded.push(employee.employeeId);
      } catch (err) {
        failed.push({ employeeId: employee.employeeId, error: err instanceof Error ? err.message : 'unknown error' });
      }
    }

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'payroll.generate_all', resource: 'payroll', resourceId: 'bulk',
      details: { month: data.month, year: data.year, succeededCount: succeeded.length, failedCount: failed.length },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return { succeeded, failed };
  },

  async listPayroll(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedPayroll> {
    const opts = listPayrollSchema.parse(rawQuery);
    return payrollRepository.findAll(ctx.schoolId, opts);
  },

  async getPayrollRecord(id: string, ctx: AuthContext): Promise<IPayrollRecord> {
    const record = await payrollRepository.findById(id, ctx.schoolId);
    if (!record) throw new NotFoundError('Payroll record');
    return record;
  },

  async markPaid(id: string, rawInput: unknown, ctx: AuthContext): Promise<IPayrollRecord> {
    const data = markPayrollPaidSchema.parse(rawInput);

    const existing = await payrollRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Payroll record');
    if (existing.status === 'paid') {
      throw new ValidationError('This payroll record is already marked as paid');
    }

    const record = await payrollRepository.markPaid(
      id, ctx.schoolId, new Date(data.paidDate), data.paymentMode, ctx.displayName, data.notes,
    );
    if (!record) throw new NotFoundError('Payroll record');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'payroll.marked_paid', resource: 'payroll', resourceId: id,
      details: { employeeName: existing.employeeName, netSalary: existing.netSalary, paymentMode: data.paymentMode },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return record;
  },

  async getSummary(rawQuery: unknown, ctx: AuthContext): Promise<PayrollSummary> {
    const opts = payrollSummarySchema.parse(rawQuery);
    return payrollRepository.getSummary(ctx.schoolId, opts);
  },

  /** Self-service: the logged-in user's own payslip history, resolved via
   *  their linked Employee record — never another employee's records. */
  async listForMe(ctx: AuthContext): Promise<IPayrollRecord[]> {
    const employee = await employeeService.getEmployeeByUserId(ctx.userId, ctx.schoolId);
    if (!employee) throw new NotFoundError('Employee record for this account');
    return payrollRepository.findAllForEmployee(ctx.schoolId, employee._id.toString());
  },
};
