// Realistic mixed school workload — several roles hitting the system at
// once, not one feature in isolation. Per the framework's own
// recommendation (see README): after validate-100-teachers.js passes on its
// own, this is the scenario that actually approximates a real opening-bell
// rush —
//   60 teachers   marking attendance (full workflow, see scenarios/teacher-full.js)
//   20 receptionists handling admissions + fee collection (scenarios/receptionist.js)
//   10 admins     managing users/settings/reports (scenarios/admin.js)
//   10 principals viewing dashboards/reports (scenarios/principal.js)
// = 120 total concurrent users, each running their real workflow exactly
// once, all starting together.
//
// Requires the fixture seeded with enough distinct accounts per role so VUs
// don't collide on the same login:
//   PERF_TEACHERS=60 PERF_RECEPTION=20 PERF_ADMIN=10 PERF_PRINCIPAL=10 \
//     npm run seed:perf-test-data -w apps/server
// (Under-seeding degrades to wrapped/shared accounts rather than crashing —
// see helpers/users.js's teacherByIndex/fromRoleByIndex — but then it's not
// truly modeling 20 distinct receptionists.)
//
// Same dev-mode-server requirement as validate-100-teachers.js — see that
// script's header for why (IP-keyed authLimiter in production).
import exec from 'k6/execution';
import { thresholds as baseThresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles, buildVerdictReport } from '../helpers/report.js';
import { teacherFullWorkflow } from '../scenarios/teacher-full.js';
import { receptionistWorkflow } from '../scenarios/receptionist.js';
import { adminWorkflow } from '../scenarios/admin.js';
import { principalWorkflow } from '../scenarios/principal.js';
import { teacherByIndex, fromRoleByIndex } from '../helpers/users.js';

const COUNTS = { teacher: 60, receptionist: 20, admin: 10, principal: 10 };

function scenario(vus, exec) {
  return { executor: 'per-vu-iterations', vus, iterations: 1, maxDuration: '5m', exec };
}

export const options = {
  scenarios: {
    teachers: scenario(COUNTS.teacher, 'teacher'),
    receptionists: scenario(COUNTS.receptionist, 'receptionist'),
    admins: scenario(COUNTS.admin, 'admin'),
    principals: scenario(COUNTS.principal, 'principal'),
  },
  thresholds: {
    ...baseThresholds,
    http_req_failed: ['rate<0.01'],
    http_429_count: ['count==0'],
    http_500_count: ['count==0'],
    duplicate_attendance_detected: ['rate==0'],
    duplicate_fee_payment_detected: ['rate==0'],
    partial_attendance_save: ['rate==0'],
    missing_attendance: ['rate==0'],
    race_condition_detected: ['rate==0'],
    teacher_workflow_success: ['rate==1'],
  },
  summaryTrendStats,
};

// exec.vu.idInTest is unique across the WHOLE test run, not scenario-local — when
// several scenarios run concurrently (as here), k6 interleaves VU-ID allocation
// across them, so a scenario's ids are NOT a clean contiguous 1..vus block (e.g. the
// teachers scenario here actually got ids like {1..51, 53..58, 61..63}, not 1..60).
// `% list.length` on that scattered set collides — two different VUs computed the
// same index, both logged in as the SAME seeded teacher, and raced each other
// marking the SAME class's attendance, which looked exactly like a server-side
// status-corruption bug (two genuinely different submissions to the same class,
// last write wins) until traced back to this. exec.scenario.iterationInTest is
// scoped to the scenario's own name and is confirmed unique/dense per scenario
// (0..vus-1), so it's the correct, collision-free per-scenario VU index.
export function teacher() {
  teacherFullWorkflow(teacherByIndex(exec.scenario.iterationInTest));
}
export function receptionist() {
  receptionistWorkflow(exec.vu.idInTest, exec.scenario.iterationInInstance, fromRoleByIndex('reception', exec.scenario.iterationInTest));
}
export function admin() {
  adminWorkflow(fromRoleByIndex('admin', exec.scenario.iterationInTest));
}
export function principal() {
  principalWorkflow(fromRoleByIndex('principal', exec.scenario.iterationInTest));
}

export function handleSummary(data) {
  const files = buildReportFiles(data, 'mixed-workload');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  files[`performance/reports/mixed-workload-${ts}-VERDICT.md`] = buildVerdictReport(data, {
    title: 'SchoolOS — Mixed Role Workload (60 teachers / 20 receptionists / 10 admins / 10 principals)',
    question:
      'Can SchoolOS safely support a realistic mixed school workload (teachers marking attendance, receptionists handling admissions/fees, admins and principals viewing reports) simultaneously in production?',
  });
  return files;
}
