// Custom metrics referenced by thresholds/performance.js and every scenario.
// k6's built-in http_req_duration/http_req_failed cover latency and generic
// errors; these track the SchoolOS-specific correctness failure modes the
// framework spec calls out explicitly (duplicate writes, race conditions),
// which are business-logic bugs, not HTTP-layer ones — a 200 response can
// still represent a duplicate attendance row or a double-charged fee.
import { Trend, Rate, Counter } from 'k6/metrics';

export const loginTrend = new Trend('login_duration', true);
export const authFailures = new Counter('auth_failures');

export const http500Count = new Counter('http_500_count');
export const http429Count = new Counter('http_429_count');

// Business-logic integrity metrics — a scenario increments these when it
// detects the condition itself (e.g. attendance.js re-reads the class roster
// after a bulk mark and finds two rows for the same student+date+class).
// k6 cannot observe server-side DB/CPU/memory directly; those columns in the
// Final Certification report must come from Render/Atlas metrics or APM
// collected during the same run (see README's "Out of k6's reach" section).
export const duplicateAttendanceRate = new Rate('duplicate_attendance_detected');
export const duplicateFeePaymentRate = new Rate('duplicate_fee_payment_detected');
export const raceConditionRate = new Rate('race_condition_detected');
export const dbWriteInconsistencyRate = new Rate('db_write_inconsistency_detected');

// Per-scenario workflow-completion trends, so reports can show "how long does
// a full teacher attendance workflow take" rather than only per-endpoint
// numbers.
export const workflowDuration = new Trend('workflow_duration', true);

// Strict end-to-end pass/fail for the 100-teacher validation
// (scripts/validate-100-teachers.js): 1 only if every step in the literal
// login->...->logout workflow succeeded with no partial/missing/duplicate
// writes. Separate from workflowDuration (a Trend) because the framework
// spec's "every teacher completes the entire workflow successfully" success
// criterion needs a hard rate, not just a timing.
export const teacherWorkflowSuccess = new Rate('teacher_workflow_success');
// Fewer saved records came back on verify than were submitted in the bulk
// mark — a partial save.
export const partialAttendanceSaveRate = new Rate('partial_attendance_save');
// A submitted studentId has no corresponding row at all on verify.
export const missingAttendanceRate = new Rate('missing_attendance');

export function recordHttpStatus(res) {
  if (res.status === 500) http500Count.add(1);
  if (res.status === 429) http429Count.add(1);
}
