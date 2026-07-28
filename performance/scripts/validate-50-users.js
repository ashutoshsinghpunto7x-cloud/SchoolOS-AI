// Focused validation run: a clean, isolated steady-state at exactly 50
// concurrent users (not a ramp through it) — added specifically to answer
// the Final Certification's mandatory question ("can SchoolOS reliably
// support 50 concurrent active users?") with an unambiguous data point,
// since load.js's continuous ramp through 10->25->50->100->250->500 makes
// it hard to isolate "just the 50-VU tier" from the summary alone.
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

// Same realistic weights as load.js, scaled to a fixed 50-total ceiling.
const WEIGHTS = {
  login: 0.05, teacher: 0.30, receptionist: 0.15, admin: 0.10, principal: 0.05,
  attendance: 0.10, fee: 0.10, admissions: 0.05, reports: 0.05, notifications: 0.05,
};

const STAGES = [
  { duration: '30s', target: 50 }, // ramp up fast
  { duration: '3m', target: 50 },  // hold steady — this is the window that matters
  { duration: '20s', target: 0 },
];

function scenario(name) {
  const target = Math.max(1, Math.round(50 * WEIGHTS[name]));
  return {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: STAGES.map((s) => ({ duration: s.duration, target: s.target === 0 ? 0 : Math.max(1, Math.round(target * (s.target / 50))) })),
    gracefulRampDown: '10s',
    exec: name,
  };
}

export const options = {
  scenarios: Object.fromEntries(Object.keys(WEIGHTS).map((name) => [name, scenario(name)])),
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
  return buildReportFiles(data, 'validate-50-users');
}
