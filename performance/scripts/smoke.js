// Smoke test: 2 VUs, one pass through every workflow. The cheapest possible
// signal that the API is up, auth works, and every scenario's endpoints
// still return 2xx against current fixture data — meant to run on every
// pull request (see README's CI section for how this wires into GitHub
// Actions once that's set up; not wired in this session per project scope).
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

const smokeExecutor = { executor: 'per-vu-iterations', vus: 2, iterations: 1, maxDuration: '1m' };

export const options = {
  scenarios: {
    login: { ...smokeExecutor, exec: 'login' },
    teacher: { ...smokeExecutor, exec: 'teacher' },
    receptionist: { ...smokeExecutor, exec: 'receptionist' },
    admin: { ...smokeExecutor, exec: 'admin' },
    principal: { ...smokeExecutor, exec: 'principal' },
    attendance: { ...smokeExecutor, exec: 'attendance' },
    fee: { ...smokeExecutor, exec: 'fee' },
    admissions: { ...smokeExecutor, exec: 'admissions' },
    reports: { ...smokeExecutor, exec: 'reports' },
    notifications: { ...smokeExecutor, exec: 'notifications' },
  },
  // Smoke traffic is far below any rate limit, so any 429 here is a real bug
  // (misconfigured limiter, shared IP contention), not expected throttling.
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
  return buildReportFiles(data, 'smoke');
}
