// The literal production-readiness scenario: exactly 100 real teachers,
// each independently performing the full real workflow —
//   Login -> Dashboard -> Teacher Workspace -> Assigned Classes
//   -> Attendance Workspace -> Select Date -> Load Student List
//   -> Mark Attendance -> Save Attendance -> Verify Saved
//   -> Student Profile -> Navigate Back -> Logout
// — simultaneously, exactly once each (a school's opening-bell rush, not a
// sustained loop). See scenarios/teacher-full.js for the step-by-step
// implementation and for why 2 of the 13 named steps map onto an endpoint
// already fetched for an earlier step rather than firing a new request.
//
// Requires: `npm run seed:perf-test-data -w apps/server` run with at least
// 100 teachers, e.g.:
//   PERF_TEACHERS=100 npm run seed:perf-test-data -w apps/server
// (fewer is fine too — helpers/users.js's teacherByIndex() wraps around,
// but then multiple VUs share a class/section, which is not what "100 real
// teachers" is modeling.)
//
// Requires: server running in development mode (`npm run dev -w
// apps/server`). apps/server/src/middlewares/rateLimiter.ts's authLimiter is
// IP-keyed at only 10 login attempts / 15 min in production — since k6
// itself is a single client IP, that would 429 out at the 11th of these 100
// logins regardless of backend capacity. This script logs in fresh once per
// VU (not cached, on purpose — this is a one-shot "100 teachers each log in
// once this morning" scenario, not a sustained-session load profile), so it
// depends on the dev-mode limiter headroom (see README's "Prerequisites").
import exec from 'k6/execution';
import { thresholds as baseThresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles, buildVerdictReport } from '../helpers/report.js';
import { teacherFullWorkflow } from '../scenarios/teacher-full.js';
import { teacherByIndex } from '../helpers/users.js';

const TEACHER_COUNT = 100;

export const options = {
  scenarios: {
    teachers: {
      executor: 'per-vu-iterations',
      vus: TEACHER_COUNT,
      iterations: 1,
      maxDuration: '5m',
      exec: 'teacher',
    },
  },
  thresholds: {
    ...baseThresholds,
    // Stricter, literal bar for this specific scenario (tighter than the
    // general framework thresholds every other script imports as-is):
    http_req_duration: ['avg<300', 'p(95)<800', 'p(99)<1000'],
    'http_req_duration{name:POST /auth/login}': ['p(95)<400'],
    'http_req_duration{name:GET /teacher-workspace/me}': ['p(95)<500'],
    'http_req_duration{name:GET /students (roster)}': ['p(95)<500'],
    'http_req_duration{name:POST /attendance/bulk}': ['p(95)<500'],
    http_req_failed: ['rate==0'],
    http_429_count: ['count==0'],
    http_500_count: ['count==0'],
    duplicate_attendance_detected: ['rate==0'],
    partial_attendance_save: ['rate==0'],
    missing_attendance: ['rate==0'],
    race_condition_detected: ['rate==0'],
    teacher_workflow_success: ['rate==1'],
  },
  summaryTrendStats,
};

export function teacher() {
  // idInTest is 1-based and stable for the life of the VU — exactly one
  // distinct seeded teacher per VU, matching "100 real teachers" rather than
  // random draws that could collide on the same account.
  const teacher = teacherByIndex(exec.vu.idInTest - 1);
  teacherFullWorkflow(teacher);
}

export function handleSummary(data) {
  const files = buildReportFiles(data, 'validate-100-teachers');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  files[`performance/reports/validate-100-teachers-${ts}-VERDICT.md`] = buildVerdictReport(data, {
    title: 'SchoolOS — 100 Concurrent Teachers Validation',
    question:
      'Can SchoolOS safely support 100 teachers simultaneously performing Login -> Dashboard -> Attendance -> Save Attendance -> Logout in production?',
  });
  return files;
}
