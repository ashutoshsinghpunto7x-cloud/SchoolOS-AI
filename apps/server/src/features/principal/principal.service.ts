import { principalRepository } from './principal.repository';
import { feeRepository } from '../fees/fee.repository';
import { attendanceRepository } from '../attendance/attendance.repository';
import { logger } from '../../lib/logger';
import type { PrincipalDashboardData, PrincipalAlert } from '@schoolos/types';

// ── Thresholds ────────────────────────────────────────────────────────────────

const ATTENDANCE_WARN_THRESHOLD  = 85;
const ATTENDANCE_CRIT_THRESHOLD  = 75;
const UPCOMING_EVENT_ALERT_DAYS  = 2;

// ── Alert generation ──────────────────────────────────────────────────────────

function buildAlerts(data: Omit<PrincipalDashboardData, 'alerts' | 'generatedAt'>): PrincipalAlert[] {
  const alerts: PrincipalAlert[] = [];

  // Attendance
  const rate = data.attendance.today.attendanceRate;
  if (data.attendance.today.total > 0) {
    if (rate < ATTENDANCE_CRIT_THRESHOLD) {
      alerts.push({
        id: 'alert_low_attendance_crit',
        type: 'low_attendance',
        severity: 'critical',
        title: 'Critically Low Attendance',
        message: `Today's attendance is ${rate}%, well below the ${ATTENDANCE_CRIT_THRESHOLD}% threshold.`,
        actionUrl: '/attendance',
      });
    } else if (rate < ATTENDANCE_WARN_THRESHOLD) {
      alerts.push({
        id: 'alert_low_attendance_warn',
        type: 'low_attendance',
        severity: 'warning',
        title: 'Low Attendance Today',
        message: `Today's attendance is ${rate}%, below the ${ATTENDANCE_WARN_THRESHOLD}% target.`,
        actionUrl: '/attendance',
      });
    }
  }

  // Overdue fees
  if (data.fees.overdueCount > 0) {
    alerts.push({
      id: 'alert_overdue_fees',
      type: 'overdue_fees',
      severity: data.fees.overdueCount >= 10 ? 'critical' : 'warning',
      title: 'Overdue Fee Payments',
      message: `${data.fees.overdueCount} fee record${data.fees.overdueCount > 1 ? 's are' : ' is'} overdue.`,
      actionUrl: '/fees',
    });
  }

  // Pending follow-ups in admissions
  if (data.admissions.pendingFollowUp > 0) {
    alerts.push({
      id: 'alert_pending_followup',
      type: 'pending_followup',
      severity: 'warning',
      title: 'Pending Admission Follow-ups',
      message: `${data.admissions.pendingFollowUp} enquir${data.admissions.pendingFollowUp > 1 ? 'ies require' : 'y requires'} follow-up today.`,
      actionUrl: '/enquiries',
    });
  }

  // Upcoming events within 2 days
  const soonEvents = data.upcomingEvents.filter((e) => {
    const diff = (new Date(e.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= UPCOMING_EVENT_ALERT_DAYS;
  });
  for (const ev of soonEvents) {
    alerts.push({
      id: `alert_event_${ev.id}`,
      type: 'upcoming_event',
      severity: 'info',
      title: `Upcoming: ${ev.title}`,
      message: `Scheduled on ${ev.startDate}.`,
      actionUrl: `/calendar`,
    });
  }

  return alerts;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const principalService = {
  async getDashboard(schoolId: string): Promise<PrincipalDashboardData> {
    const today = attendanceRepository.todayString();

    // Run all aggregations in parallel for performance
    const [students, teachers, todayAttendance, weeklyAttendance, fees, admissions, timetable, upcomingEvents] =
      await Promise.all([
        principalRepository.getStudentStats(schoolId),
        principalRepository.getTeacherStats(schoolId),
        attendanceRepository.getSummary(schoolId, { dateFrom: today, dateTo: today }),
        attendanceRepository.getSummary(schoolId, {
          dateFrom: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 6);
            return d.toISOString().split('T')[0];
          })(),
          dateTo: today,
        }),
        feeRepository.getSummary(schoolId),
        principalRepository.getAdmissionStats(schoolId),
        principalRepository.getTimetableStats(schoolId),
        principalRepository.getUpcomingEvents(schoolId, 14),
      ]);

    logger.info('Principal dashboard aggregated', { schoolId });

    const partial = {
      students,
      teachers,
      attendance: { today: todayAttendance, weeklyAvgRate: weeklyAttendance.attendanceRate },
      fees,
      admissions,
      timetable,
      upcomingEvents,
    };

    return {
      ...partial,
      alerts: buildAlerts(partial),
      generatedAt: new Date().toISOString(),
    };
  },
};
