import { FeePayment } from '../fees/fee.payment.model';
import { FeeRecord } from '../fees/fee.model';
import { ExpenseRecord } from '../expenses/expense.model';
import { SalaryRecord } from '../salary/salary.model';
import { Employee } from '../employees/employee.model';
import { StaffAttendanceRecord } from '../staff-attendance/staff-attendance.model';
import { LeaveRequest } from '../leave-requests/leave-request.model';
import { PurchaseRequest } from '../purchases/purchase-request.model';
import type { AdminDefaulterClass } from '@schoolos/types';

export const adminOverviewRepository = {
  /** Fee money received in [start, end) — by createdAt, same convention as the accountant dashboard. */
  async feesCollectedBetween(schoolId: string, start: Date, end: Date): Promise<number> {
    const agg = await FeePayment.aggregate<{ total: number }>([
      { $match: { schoolId, isDeleted: false, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return agg[0]?.total ?? 0;
  },

  async approvedExpensesBetween(schoolId: string, start: Date, end: Date): Promise<number> {
    const agg = await ExpenseRecord.aggregate<{ total: number }>([
      { $match: { schoolId, isDeleted: false, status: 'approved', date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return agg[0]?.total ?? 0;
  },

  async salaryPaidBetween(schoolId: string, start: Date, end: Date): Promise<number> {
    const agg = await SalaryRecord.aggregate<{ total: number }>([
      { $match: { schoolId, isDeleted: false, status: 'paid', paidDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return agg[0]?.total ?? 0;
  },

  /** Salary still owed for a payroll month: scheduled + pending records. */
  async salaryOwedForMonth(schoolId: string, month: string, year: number): Promise<number> {
    const agg = await SalaryRecord.aggregate<{ total: number }>([
      { $match: { schoolId, isDeleted: false, month, year, status: { $in: ['scheduled', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return agg[0]?.total ?? 0;
  },

  /** Classes owing the most, counting only fees whose due date has arrived. */
  async topDefaulterClasses(schoolId: string, limit: number): Promise<AdminDefaulterClass[]> {
    const rows = await FeeRecord.aggregate<{ _id: { class: string; section: string }; balance: number; students: string[] }>([
      {
        $match: {
          schoolId,
          isDeleted: false,
          status: { $in: ['pending', 'partially_paid', 'overdue'] },
          dueDate: { $lte: new Date() },
        },
      },
      {
        $group: {
          _id: { class: '$class', section: '$section' },
          balance: { $sum: '$balance' },
          students: { $addToSet: '$studentId' },
        },
      },
      { $match: { balance: { $gt: 0 } } },
      { $sort: { balance: -1 } },
      { $limit: limit },
    ]);
    return rows.map((r) => ({ class: r._id.class, section: r._id.section, students: r.students.length, balance: r.balance }));
  },

  async activeEmployeeCount(schoolId: string): Promise<number> {
    return Employee.countDocuments({ schoolId, isDeleted: false, status: 'active' });
  },

  async staffPresentOn(schoolId: string, date: string): Promise<number> {
    return StaffAttendanceRecord.countDocuments({
      schoolId,
      date,
      status: { $in: ['present', 'late', 'half_day'] },
    });
  },

  async pendingLeaveCount(schoolId: string): Promise<number> {
    return LeaveRequest.countDocuments({ schoolId, status: 'pending' });
  },

  async pendingPurchaseRequestCount(schoolId: string): Promise<number> {
    return PurchaseRequest.countDocuments({ schoolId, isDeleted: false, status: 'pending' });
  },
};
