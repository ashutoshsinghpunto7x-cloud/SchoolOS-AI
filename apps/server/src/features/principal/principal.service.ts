import { principalRepository } from './principal.repository';
import { feeRepository } from '../fees/fee.repository';
import { attendanceRepository } from '../attendance/attendance.repository';
import { leaveRequestRepository } from '../leave-requests/leave-request.repository';
import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { recordUsage } from '../principal-assistant/intent-router';
import { logger } from '../../lib/logger';
import { AppError } from '../../middlewares/errorHandler';
import type { PrincipalDashboardData, PrincipalAlert, TeachersSummaryData, PrincipalBriefingSummary } from '@schoolos/types';

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
        principalRepository.countTeachersRoster(schoolId),
        attendanceRepository.getSummary(schoolId, { dateFrom: today, dateTo: today }),
        attendanceRepository.getSummary(schoolId, {
          dateFrom: attendanceRepository.daysAgoString(6),
          dateTo: today,
        }),
        feeRepository.getSummary(schoolId),
        principalRepository.getAdmissionStats(schoolId),
        principalRepository.getTimetableStats(schoolId),
        principalRepository.getUpcomingEvents(schoolId),
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

  /** On-demand only (never called on dashboard load) — turns the same
   *  structured dashboard snapshot the stat-row already renders into a
   *  short, descriptive recap. Re-fetches server-side rather than trusting
   *  client-supplied numbers. Never invents a figure that isn't in the data. */
  async getBriefingSummary(schoolId: string): Promise<PrincipalBriefingSummary> {
    if (!openaiProvider.isAvailable()) {
      throw new AppError('AI Assistant is not configured. Please contact your administrator.', 503, 'AI_UNAVAILABLE');
    }

    const [dashboard, teachers] = await Promise.all([
      principalService.getDashboard(schoolId),
      principalService.getTeachersSummary(schoolId),
    ]);

    const snapshot = {
      // Must match the Daily Briefing stat tile's definition (total minus
      // scanner-verified presentCount) — teachers.onLeave.length is a
      // different concept (approved leave requests, not "didn't show up
      // today") and using it here made the AI summary silently disagree
      // with the number displayed right above it.
      teachersAbsent: Math.max(0, teachers.total - teachers.presentCount),
      teachersTotal: teachers.total,
      attendanceRate: dashboard.attendance.today.attendanceRate,
      pendingAdmissionFollowUps: dashboard.admissions.pendingFollowUp,
      newAdmissionsThisMonth: dashboard.admissions.newThisMonth,
      upcomingEvents: dashboard.upcomingEvents.slice(0, 3).map((e) => ({ title: e.title, startDate: e.startDate })),
    };

    const systemPrompt =
      'You are summarizing today\'s school operations for the Principal. Given this JSON snapshot, ' +
      'write 2-3 short sentences in a calm, executive tone. Only use numbers present in the data — ' +
      'never speculate, predict, or invent a figure that is not in the JSON.';
    const userPrompt = `Data (JSON):\n${JSON.stringify(snapshot, null, 2)}`;

    const result = await openaiProvider.complete({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 200,
    });
    recordUsage(result, schoolId);

    logger.info('Principal briefing summary generated', { schoolId });

    return { summary: result.content.trim(), generatedAt: new Date().toISOString() };
  },

  async getTeachersSummary(schoolId: string, date?: string): Promise<TeachersSummaryData> {
    const targetDate = date ?? attendanceRepository.todayString();

    // presentCount comes from real Attendance Scanner check-ins
    // (StaffAttendanceRecord), not from Teacher.employmentStatus — that
    // roster field only tracks employment type (active/on-leave/applicant),
    // it was never meant to answer "did this teacher show up today" and
    // using it for that gave Daily Briefing, the AI Assistant, and School
    // Health three different, all-wrong answers to the same question.
    const [{ total, active }, approvedLeaves, presentCount] = await Promise.all([
      principalRepository.countTeachersRoster(schoolId),
      leaveRequestRepository.findApprovedForDate(schoolId, targetDate),
      principalRepository.countPresentTeachersToday(schoolId, targetDate),
    ]);

    const onLeave = approvedLeaves.map((l) => ({
      leaveRequestId: String((l as unknown as { _id: { toString(): string } })._id),
      teacherId: l.teacherId,
      teacherName: l.teacherName,
      leaveType: l.leaveType,
      dateFrom: l.dateFrom,
      dateTo: l.dateTo,
    }));

    return {
      date: targetDate,
      total,
      active,
      onLeave,
      presentCount,
    };
  },
};
