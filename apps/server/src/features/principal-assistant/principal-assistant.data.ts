import { attendanceRepository } from '../attendance/attendance.repository';
import { principalService } from '../principal/principal.service';
import { AuthContext } from '../../lib/auth-context';

// ── Granular data fetchers ────────────────────────────────────────────────────
// Each function fetches only what it needs from the existing attendance/
// principal services — the backend does every calculation here. OpenAI never
// sees anything but the plain JSON these return.

export interface StudentCounts {
  date: string;
  studentsPresent: number;
  studentsAbsent: number;
  studentsOnLeave: number;
  studentsTotal: number;
  attendanceRate: number;
}

export interface TeacherCounts {
  date: string;
  teachersPresent: number;
  teachersAbsent: number;
  teachersTotal: number;
}

export interface ClassExtremes {
  date: string;
  highestAttendanceClass: { class: string; section: string; percentage: number } | null;
  lowestAttendanceClass: { class: string; section: string; percentage: number } | null;
}

export type FullAttendanceSummary = StudentCounts & TeacherCounts & ClassExtremes;

export const principalAssistantData = {
  async getStudentCounts(ctx: AuthContext): Promise<StudentCounts> {
    const today = attendanceRepository.todayString();
    const summary = await attendanceRepository.getSummary(ctx.schoolId, { dateFrom: today, dateTo: today });

    return {
      date: today,
      studentsPresent: summary.present + summary.late + summary.half_day,
      studentsAbsent: summary.absent,
      studentsOnLeave: summary.leave_approved,
      studentsTotal: summary.total,
      attendanceRate: summary.attendanceRate,
    };
  },

  async getTeacherCounts(ctx: AuthContext): Promise<TeacherCounts> {
    const today = attendanceRepository.todayString();
    const teachers = await principalService.getTeachersSummary(ctx.schoolId, today);

    return {
      date: today,
      teachersPresent: teachers.presentCount,
      teachersAbsent: Math.max(0, teachers.active - teachers.presentCount),
      teachersTotal: teachers.total,
    };
  },

  async getClassExtremes(ctx: AuthContext): Promise<ClassExtremes> {
    const today = attendanceRepository.todayString();
    const breakdown = (await attendanceRepository.getClassBreakdown(ctx.schoolId, today)).filter((c) => c.total > 0);

    const highest = breakdown.length ? breakdown.reduce((a, b) => (b.attendanceRate > a.attendanceRate ? b : a)) : null;
    const lowest = breakdown.length ? breakdown.reduce((a, b) => (b.attendanceRate < a.attendanceRate ? b : a)) : null;

    return {
      date: today,
      highestAttendanceClass: highest
        ? { class: highest.class, section: highest.section, percentage: highest.attendanceRate }
        : null,
      lowestAttendanceClass: lowest
        ? { class: lowest.class, section: lowest.section, percentage: lowest.attendanceRate }
        : null,
    };
  },

  /** Used by ATTENDANCE_SUMMARY — the only intent that needs everything at once. */
  async getFullSummary(ctx: AuthContext): Promise<FullAttendanceSummary> {
    const [students, teachers, classes] = await Promise.all([
      principalAssistantData.getStudentCounts(ctx),
      principalAssistantData.getTeacherCounts(ctx),
      principalAssistantData.getClassExtremes(ctx),
    ]);
    return { ...students, ...teachers, ...classes };
  },
};
