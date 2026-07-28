// Load test: ramps total concurrent users through the levels the framework
// spec requires — 10 -> 25 -> 50 -> 100 -> 250 -> 500 — split across role
// scenarios by realistic usage weight (`stages.load`'s targets are *totals*,
// scaled per scenario via scaleStages). Meant to run on every merge to main.
//
// KNOWN LOCAL CEILING (see performance/README.md "Known ceiling" section):
// this suite was authored and executed against a single local dev server +
// whatever MongoDB it's pointed at (per project decision: local only, no
// staging/production run performed). Expect the 250/500-VU stages to reveal
// the local machine's or free-tier DB's limits rather than the application
// architecture's — that's expected and is exactly the "next scaling
// bottleneck" the Final Certification report is required to name.
import { stages, scaleStages } from '../config/base.js';
import { thresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles } from '../helpers/report.js';

import { loginWorkflow } from '../scenarios/login.js';
import { teacherWorkflow } from '../scenarios/teacher.js';
import { receptionistWorkflow } from '../scenarios/receptionist.js';
import { adminWorkflow } from '../scenarios/admin.js';
import { principalWorkflow } from '../scenarios/principal.js';
import { attendanceStress } from '../scenarios/attendance.js';
import { feeStress } from '../scenarios/fee.js';
import { admissionsStress } from '../scenarios/admissions.js';
import { reportsStress } from '../scenarios/reports.js';
import { notificationsStress } from '../scenarios/notifications.js';
import exec from 'k6/execution';

// Fractions of total concurrent users, sum to 1.0.
const WEIGHTS = {
  login: 0.05,
  teacher: 0.30,
  receptionist: 0.15,
  admin: 0.10,
  principal: 0.05,
  attendance: 0.10,
  fee: 0.10,
  admissions: 0.05,
  reports: 0.05,
  notifications: 0.05,
};

function scenario(name) {
  return {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: scaleStages(stages.load, WEIGHTS[name]),
    gracefulRampDown: '10s',
    exec: name,
  };
}

export const options = {
  scenarios: Object.fromEntries(Object.keys(WEIGHTS).map((name) => [name, scenario(name)])),
  // At documented load levels (up to 500 total concurrent, matched to
  // env.RATE_LIMIT_MAX in apps/server/src/config/env.ts), a 429 means the
  // rate limiter is under-provisioned for real usage, not that load-testing
  // itself is abusive traffic.
  thresholds: { ...thresholds, http_429_count: ['count==0'] },
  summaryTrendStats,
};

export function login() { loginWorkflow(); }
export function teacher() { teacherWorkflow(); }
export function receptionist() { receptionistWorkflow(exec.vu.idInTest, exec.scenario.iterationInInstance); }
export function admin() { adminWorkflow(); }
export function principal() { principalWorkflow(); }
export function attendance() { attendanceStress(); }
export function fee() { feeStress(exec.vu.idInTest, exec.scenario.iterationInInstance); }
export function admissions() { admissionsStress(); }
export function reports() { reportsStress(); }
export function notifications() { notificationsStress(); }

export function handleSummary(data) {
  return buildReportFiles(data, 'load');
}
