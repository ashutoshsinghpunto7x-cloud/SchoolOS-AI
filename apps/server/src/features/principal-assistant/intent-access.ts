import { ForbiddenError } from '../../middlewares/errorHandler';

// ── Per-intent role policy (default-deny) ────────────────────────────────────
// The HTTP route already limits the assistant to admin/principal (and the
// 'incharge' alias). This is the second, independent gate: every intent must be
// listed here with the roles allowed to use it, and an intent that is NOT
// listed is refused. So if the route is ever widened (say, to teachers or
// accountants), nothing leaks until someone consciously grants each intent.
// Enforced in the service BEFORE any data is fetched; a unit test fails the
// build if a registered intent has no entry here.

const LEADERSHIP: readonly string[] = ['admin', 'principal', 'incharge'];
/** Money: kept as its own constant so finance access can be widened (e.g. to accountant) deliberately, one list. */
const FINANCIAL: readonly string[] = ['admin', 'principal', 'incharge'];

export const INTENT_ROLE_POLICY: Record<string, readonly string[]> = {
  // Attendance
  ATTENDANCE_SUMMARY: LEADERSHIP, STUDENT_PRESENT_COUNT: LEADERSHIP, STUDENT_ABSENT_COUNT: LEADERSHIP,
  ATTENDANCE_PERCENTAGE: LEADERSHIP, TEACHER_ATTENDANCE: LEADERSHIP, TEACHER_ABSENT_COUNT: LEADERSHIP,
  HIGHEST_ATTENDANCE_CLASS: LEADERSHIP, LOWEST_ATTENDANCE_CLASS: LEADERSHIP,
  ABSENT_TEACHERS_LIST: LEADERSHIP, ABSENT_STUDENTS_LIST: LEADERSHIP, LATE_STAFF: LEADERSHIP,
  CLASS_ATTENDANCE_PERIOD: LEADERSHIP, LOW_ATTENDANCE_STUDENTS: LEADERSHIP, ATTENDANCE_TREND: LEADERSHIP,
  // Student records (marks, attendance, fees, parent details of a named student)
  STUDENT_LOOKUP: LEADERSHIP, TOP_BOTTOM_STUDENTS: LEADERSHIP, FAILED_STUDENTS: LEADERSHIP,
  RESULTS_ANALYSIS: LEADERSHIP, CLASS_STRENGTH_ROSTER: LEADERSHIP, BIRTHDAYS_TODAY: LEADERSHIP,
  BEHAVIOR_SUMMARY: LEADERSHIP, TRANSPORT_SUMMARY: LEADERSHIP,
  // Money
  FEE_SUMMARY: FINANCIAL, TOTAL_FEES_COLLECTED: FINANCIAL, TOTAL_FEES_OUTSTANDING: FINANCIAL,
  FEE_COLLECTION_PERCENTAGE: FINANCIAL, OVERDUE_FEES_COUNT: FINANCIAL, HIGHEST_FEE_COLLECTION_CLASS: FINANCIAL,
  LOWEST_FEE_COLLECTION_CLASS: FINANCIAL, FEE_DEFAULTERS: FINANCIAL, FEE_COLLECTION_PERIOD: FINANCIAL,
  FEE_TREND: FINANCIAL, PAYROLL_SUMMARY: FINANCIAL, EXPENSE_SUMMARY: FINANCIAL, PENDING_PURCHASES_EXPENSES: FINANCIAL,
  // Staff & HR
  TEACHERS_ON_LEAVE: LEADERSHIP, PENDING_LEAVE_REQUESTS: LEADERSHIP, TEACHER_SCHEDULE: LEADERSHIP,
  FREE_TEACHERS_IN_PERIOD: LEADERSHIP, SUBSTITUTE_LEADERBOARD: LEADERSHIP, TEACHER_PROFILE: LEADERSHIP,
  INTERVIEWS_SCHEDULED: LEADERSHIP, HIRING_POSITIONS: LEADERSHIP, PLAN_COMPLIANCE: LEADERSHIP,
  // Academics, admissions, front office, operations
  SYLLABUS_PROGRESS: LEADERSHIP, UPCOMING_EXAMS: LEADERSHIP, EXAMS_MISSING_MARKS: LEADERSHIP,
  PENDING_TEST_APPROVALS: LEADERSHIP, VISITORS_TODAY: LEADERSHIP, PENDING_FOLLOW_UPS: LEADERSHIP,
  PENDING_ADMISSION_FORMS: LEADERSHIP, HOMEWORK_STATUS: LEADERSHIP, ATTENTION_ALERTS: LEADERSHIP,
  DAILY_BRIEFING: LEADERSHIP, OPEN_MAINTENANCE: LEADERSHIP, STOCK_AND_ASSETS: LEADERSHIP, UPCOMING_EVENTS: LEADERSHIP,
  TODAYS_ENQUIRIES: LEADERSHIP, PENDING_FOLLOWUPS: LEADERSHIP, DOCUMENTS_PENDING: LEADERSHIP, ADMISSION_STATUS: LEADERSHIP,
};

/** Intents whose answers contain individual student / staff / financial records — every use is audit-logged. */
export const SENSITIVE_INTENTS: ReadonlySet<string> = new Set([
  'STUDENT_LOOKUP', 'FEE_DEFAULTERS', 'FAILED_STUDENTS', 'TOP_BOTTOM_STUDENTS', 'BEHAVIOR_SUMMARY',
  'PAYROLL_SUMMARY', 'EXPENSE_SUMMARY', 'TEACHER_PROFILE', 'ABSENT_STUDENTS_LIST', 'LOW_ATTENDANCE_STUDENTS',
  'CLASS_ATTENDANCE_PERIOD', 'ABSENT_TEACHERS_LIST', 'TEACHER_SCHEDULE',
]);

export function isIntentAllowed(intentId: string, role: string): boolean {
  const roles = INTENT_ROLE_POLICY[intentId];
  return !!roles && roles.includes(role);
}

export function assertIntentAllowed(intentId: string, role: string): void {
  if (!isIntentAllowed(intentId, role)) {
    throw new ForbiddenError('You do not have access to that information.');
  }
}
