// ── Attendance arithmetic (pure) ─────────────────────────────────────────────
// Counts come from the underlying day-by-day records. A percentage is always
// derived FROM those counts — never the other way round — so "in days?" can
// report real numbers instead of back-solving from a rounded figure.

export interface AttendanceRow { date: string; status: string }

export interface AttendanceStats {
  markedDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  approvedLeaveDays: number;
  absentDays: number;
  /** present + late + half-day, as a share of marked days (the school's existing "present-like" rule). */
  attendancePercent: number | null;
  absentDates: string[];
}

const PRESENT_LIKE = new Set(['present', 'late', 'half_day']);

export function computeAttendanceStats(rows: AttendanceRow[]): AttendanceStats {
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const presentLike = rows.filter((r) => PRESENT_LIKE.has(r.status)).length;
  return {
    markedDays: rows.length,
    presentDays: count('present'),
    lateDays: count('late'),
    halfDays: count('half_day'),
    approvedLeaveDays: count('leave_approved'),
    absentDays: count('absent'),
    attendancePercent: rows.length ? Math.round((presentLike / rows.length) * 100) : null,
    absentDates: rows.filter((r) => r.status === 'absent').map((r) => r.date).sort(),
  };
}

export interface AttendanceClaim {
  percent: number | null;
  absentDays: number | null;
  presentDays: number | null;
  totalDays: number | null;
}

/** Pulls "88%", "absent for 3 days", "present 22 days", "in 30 days" out of a typed statement. */
export function parseAttendanceClaim(message: string): AttendanceClaim {
  const m = message.toLowerCase();
  const num = (re: RegExp) => {
    const x = m.match(re);
    return x ? Number(x[1]) : null;
  };
  return {
    percent: num(/(\d{1,3}(?:\.\d+)?)\s*%/),
    absentDays: num(/absent(?:\s+for)?\s+(\d{1,3})\s+days?/) ?? num(/(\d{1,3})\s+days?\s+absent/),
    presentDays: num(/present(?:\s+for)?\s+(\d{1,3})\s+days?/) ?? num(/(\d{1,3})\s+days?\s+present/),
    totalDays: num(/(?:in|over|out of|of)\s+(?:the\s+)?(?:last\s+)?(\d{1,3})\s+(?:working\s+)?days?/),
  };
}

export interface ConsistencyIssue { message: string }

/** Returns [] when the numbers agree (or there is not enough to compare). Never "fixes" anything. */
export function checkAttendanceConsistency(c: AttendanceClaim): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  let total = c.totalDays;
  if (total == null && c.presentDays != null && c.absentDays != null) total = c.presentDays + c.absentDays;
  if (c.percent == null || total == null || total <= 0) return issues;

  if (c.absentDays != null) {
    const implied = Math.round(((total - c.absentDays) / total) * 1000) / 10;
    if (Math.abs(implied - c.percent) > 0.6) {
      issues.push({ message: `${c.absentDays} absent day(s) out of ${total} works out to ${implied}% attendance, not ${c.percent}%.` });
    }
  }
  if (c.presentDays != null) {
    const implied = Math.round((c.presentDays / total) * 1000) / 10;
    if (Math.abs(implied - c.percent) > 0.6) {
      issues.push({ message: `${c.presentDays} present day(s) out of ${total} works out to ${implied}%, not ${c.percent}%.` });
    }
  }
  if (c.absentDays != null && c.presentDays != null && c.totalDays != null && c.presentDays + c.absentDays !== c.totalDays) {
    issues.push({ message: `${c.presentDays} present + ${c.absentDays} absent is ${c.presentDays + c.absentDays} days, not ${c.totalDays}.` });
  }
  return issues;
}
