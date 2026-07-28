import { attendanceRepository } from '../attendance/attendance.repository';
import { principalRepository } from '../principal/principal.repository';

// ── Data-consistency checks ──────────────────────────────────────────────────
// A registry of "two numbers that should always agree" cross-checks, run
// alongside the other live Ops Center alert conditions (see
// ops.service.ts `evaluateAlerts`). This exists because of a real incident:
// Daily Briefing, the AI Assistant, and School Health each used to compute
// "teachers present" a different way from Teacher.employmentStatus, silently
// disagreeing until a principal noticed (see principal.repository.ts
// countPresentTeachersToday, and principal.service.ts getTeachersSummary).
// Each check below re-derives the same real-world quantity from two
// independent code paths and flags a school when they disagree — catching
// that class of bug before it reaches a dashboard, not after.
//
// To add a new check: append to CHECKS with a `run` that returns the two
// values being compared, or `null` if there's nothing to compare (e.g. no
// data yet today). Any mismatch becomes an Ops Center alert automatically.

export interface ConsistencyFinding {
  alertKey: string;
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  schoolId: string;
}

interface CheckResult {
  aLabel: string;
  a: number;
  bLabel: string;
  b: number;
}

interface ConsistencyCheck {
  id: string;
  label: string;
  run(schoolId: string, date: string): Promise<CheckResult | null>;
}

const CHECKS: ConsistencyCheck[] = [
  {
    id: 'attendance_totals',
    label: 'Attendance daily total vs. class-breakdown sum',
    // Both figures come from the same Attendance collection and the same
    // match filter (schoolId, date, isDeleted: false), just grouped
    // differently — getSummary groups by status, getClassBreakdown groups
    // by class/section/status. They are mathematically required to be
    // equal; any difference means one of the two aggregation paths has a
    // bug (a missed filter, a status not accounted for, etc).
    async run(schoolId, date) {
      const [summary, breakdown] = await Promise.all([
        attendanceRepository.getSummary(schoolId, { dateFrom: date, dateTo: date }),
        attendanceRepository.getClassBreakdown(schoolId, date),
      ]);
      if (summary.total === 0) return null;

      const breakdownTotal = breakdown.reduce((sum, c) => sum + c.total, 0);
      return {
        aLabel: 'Daily summary total',
        a: summary.total,
        bLabel: 'Class breakdown sum',
        b: breakdownTotal,
      };
    },
  },
  {
    id: 'teachers_present_vs_roster',
    label: 'Present teacher count vs. active roster size',
    // presentCount (scanner check-ins) must be a subset of the active
    // roster — if it exceeds it, the employeeId join in
    // countPresentTeachersToday is matching stale/duplicate records rather
    // than a genuinely independent number that could legitimately differ.
    async run(schoolId, date) {
      const [{ active }, presentCount] = await Promise.all([
        principalRepository.countTeachersRoster(schoolId),
        principalRepository.countPresentTeachersToday(schoolId, date),
      ]);
      if (presentCount <= active) return null;

      return {
        aLabel: 'Present today (scanner)',
        a: presentCount,
        bLabel: 'Active roster size',
        b: active,
      };
    },
  },
];

export async function runConsistencyChecks(schools: { schoolId: string }[]): Promise<ConsistencyFinding[]> {
  const date = attendanceRepository.todayString();
  const findings: ConsistencyFinding[] = [];

  for (const { schoolId } of schools) {
    for (const check of CHECKS) {
      try {
        const result = await check.run(schoolId, date);
        if (!result || result.a === result.b) continue;

        findings.push({
          alertKey: `consistency.${check.id}.${schoolId}`,
          severity: 'warning',
          title: `Data drift — ${check.label}`,
          message: `${result.aLabel} is ${result.a}, but ${result.bLabel} is ${result.b} (school ${schoolId}).`,
          schoolId,
        });
      } catch {
        // One school/check failing to compute shouldn't block the rest.
      }
    }
  }

  return findings;
}
