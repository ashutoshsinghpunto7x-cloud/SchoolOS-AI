import { principalService } from '../principal/principal.service';
import { expenseRepository } from '../expenses/expense.repository';
import { feeService } from '../fees/fee.service';
import { attendanceRepository } from '../attendance/attendance.repository';
import { adminOverviewRepository as repo } from './admin-overview.repository';
import type { AdminOverviewData, AdminMonthlyTrendPoint, PrincipalAlert } from '@schoolos/types';

const TREND_MONTHS = 6;
const LOW_COLLECTION_RATE = 60;
const HIGH_SALARY_SHARE = 70;
const FUNNEL_ORDER = [
  'new_enquiry', 'contacted', 'follow_up_scheduled', 'campus_visit',
  'application_submitted', 'documents_pending', 'admission_approved', 'converted', 'lost',
];

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;
const monthStart = (y: number, m: number): Date => new Date(y, m, 1);

export const adminOverviewService = {
  async getOverview(schoolId: string): Promise<AdminOverviewData> {
    await feeService.ensureOverdueMarked();

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const thisStart = monthStart(y, m);
    const lastStart = monthStart(y, m - 1);
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const today = attendanceRepository.todayString();

    // Trend buckets, oldest → newest (the last bucket is the current month).
    const buckets = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const start = monthStart(y, m - (TREND_MONTHS - 1 - i));
      const end = monthStart(start.getFullYear(), start.getMonth() + 1);
      return { start, end, label: start.toLocaleString('en-US', { month: 'short', year: 'numeric' }) };
    });

    const [
      principal, teachers, trendRows, salaryOwed, expenseSummary, topDefaulterClasses,
      staffTotal, staffPresent, pendingLeaves, pendingPurchaseRequests, collectedLastMonth,
    ] = await Promise.all([
      principalService.getDashboard(schoolId),
      principalService.getTeachersSummary(schoolId),
      Promise.all(buckets.map(async (b) => {
        const [collected, salary, expenses] = await Promise.all([
          repo.feesCollectedBetween(schoolId, b.start, b.end),
          repo.salaryPaidBetween(schoolId, b.start, b.end),
          repo.approvedExpensesBetween(schoolId, b.start, b.end),
        ]);
        return { label: b.label, collected, salary, expenses };
      })),
      repo.salaryOwedForMonth(schoolId, monthName, y),
      expenseRepository.getSummary(schoolId),
      repo.topDefaulterClasses(schoolId, 5),
      repo.activeEmployeeCount(schoolId),
      repo.staffPresentOn(schoolId, today),
      repo.pendingLeaveCount(schoolId),
      repo.pendingPurchaseRequestCount(schoolId),
      repo.feesCollectedBetween(schoolId, lastStart, thisStart),
    ]);

    const trend: AdminMonthlyTrendPoint[] = trendRows.map((r) => ({
      label: r.label, collected: r.collected, spent: r.salary + r.expenses,
    }));
    const current = trendRows[trendRows.length - 1];

    const collectedThisMonth = current.collected;
    const salaryPaidThisMonth = current.salary;
    const expensesThisMonth = current.expenses;
    const salaryShare = collectedThisMonth > 0
      ? Math.round(((salaryPaidThisMonth + salaryOwed) / collectedThisMonth) * 100)
      : null;
    const collectionRate = pct(principal.fees.totalCollected, principal.fees.totalCharged);

    const funnel = FUNNEL_ORDER.map((stage) => ({ stage, count: principal.admissions.byStage[stage] ?? 0 }));

    // Owner-level alerts: only things worth an owner's attention.
    const alerts: PrincipalAlert[] = [];
    if (principal.fees.totalCharged > 0 && collectionRate < LOW_COLLECTION_RATE) {
      alerts.push({
        id: 'owner_low_collection', type: 'overdue_fees', severity: 'warning',
        title: 'Fee collection is low',
        message: `Only ${collectionRate}% of charged fees are collected — ${inr(principal.fees.totalOutstanding)} still outstanding.`,
      });
    }
    if (principal.fees.overdueCount > 0) {
      alerts.push({
        id: 'owner_overdue', type: 'overdue_fees', severity: 'warning',
        title: `${principal.fees.overdueCount} overdue fee${principal.fees.overdueCount > 1 ? 's' : ''}`,
        message: 'Parents have passed the due date. A reminder from the accountant can recover this.',
      });
    }
    if (salaryShare !== null && salaryShare > HIGH_SALARY_SHARE) {
      alerts.push({
        id: 'owner_salary_share', type: 'overdue_fees', severity: 'warning',
        title: "Salaries are high against this month's collection",
        message: `Salaries are ${salaryShare}% of what was collected this month.`,
        actionUrl: '/admin/payroll',
      });
    }
    alerts.push(...principal.alerts.filter((a) => a.type === 'low_attendance'));

    return {
      generatedAt: new Date().toISOString(),
      money: {
        collectedThisMonth,
        collectedLastMonth,
        totalCharged: principal.fees.totalCharged,
        totalCollected: principal.fees.totalCollected,
        totalOutstanding: principal.fees.totalOutstanding,
        overdueCount: principal.fees.overdueCount,
        collectionRate,
        salaryPaidThisMonth,
        salaryPendingThisMonth: salaryOwed,
        expensesThisMonth,
        netThisMonth: collectedThisMonth - salaryPaidThisMonth - expensesThisMonth,
        salaryShareOfCollection: salaryShare,
        trend,
        topDefaulterClasses,
      },
      growth: {
        totalStudents: principal.students.total,
        activeStudents: principal.students.active,
        newStudentsThisMonth: principal.students.newThisMonth,
        enquiriesTotal: principal.admissions.total,
        enquiriesThisMonth: principal.admissions.newThisMonth,
        convertedThisMonth: principal.admissions.convertedThisMonth,
        pendingFollowUps: principal.admissions.pendingFollowUp,
        funnel,
      },
      people: {
        teachersTotal: teachers.total,
        teachersPresentToday: teachers.presentCount,
        staffTotal,
        staffPresentToday: staffPresent,
        attendanceTodayRate: principal.attendance.today.attendanceRate,
        attendanceWeeklyRate: principal.attendance.weeklyAvgRate,
        attendanceMarkedToday: principal.attendance.today.total > 0,
      },
      attention: {
        pendingLeaves,
        pendingExpenses: expenseSummary.pendingCount,
        pendingExpenseAmount: expenseSummary.totalPending,
        pendingPurchaseRequests,
      },
      alerts,
    };
  },
};
