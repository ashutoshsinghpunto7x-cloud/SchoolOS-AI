// Soak / endurance test: steady 50 concurrent users held for hours, mixed
// across the full realistic role distribution — this is what catches memory
// leaks, slowly-growing response times, and connection-pool exhaustion that
// only appear after sustained load, not in a few-minute load test.
//
// k6 cannot see server-side memory/CPU/connection-pool state — it only sees
// HTTP responses. During any real soak run, watch Render's memory graph and
// Atlas's connection-count graph for the same time window and record them
// alongside this run's report (see performance/README.md "Out of k6's
// reach"). A soak run whose http metrics look flat but whose Render memory
// graph climbs steadily for 4 hours is still a soak-test failure.
//
// Default duration matches the framework's 4h endurance profile
// (config/base.js's stages.soak). For a local sanity run, override with
// K6_SOAK_MINUTES (e.g. `k6 run -e K6_SOAK_MINUTES=10 performance/scripts/soak.js`)
// — the ramp-up/ramp-down proportions stay the same, only the hold shrinks.
import { thresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles } from '../helpers/report.js';

import { loginWorkflow } from '../scenarios/login.js';
import { teacherWorkflow } from '../scenarios/teacher.js';
import { receptionistWorkflow } from '../scenarios/receptionist.js';
import { adminWorkflow } from '../scenarios/admin.js';
import { principalWorkflow } from '../scenarios/principal.js';
import { reportsStress } from '../scenarios/reports.js';
import { notificationsStress } from '../scenarios/notifications.js';
import exec from 'k6/execution';

const holdMinutes = parseInt(__ENV.K6_SOAK_MINUTES || '240', 10);
const soakStages = [
  { duration: '2m', target: 50 },
  { duration: `${holdMinutes}m`, target: 50 },
  { duration: '2m', target: 0 },
];

// Fractions of the steady 50 VUs, sum to 1.0.
const WEIGHTS = {
  login: 0.05,
  teacher: 0.35,
  receptionist: 0.15,
  admin: 0.10,
  principal: 0.05,
  reports: 0.20,
  notifications: 0.10,
};

function scaledStages(fraction) {
  return soakStages.map((s) => ({ duration: s.duration, target: s.target === 0 ? 0 : Math.max(1, Math.round(s.target * fraction)) }));
}

function scenario(name) {
  return { executor: 'ramping-vus', startVUs: 0, stages: scaledStages(WEIGHTS[name]), gracefulRampDown: '10s', exec: name };
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
export function reports() { reportsStress(); }
export function notifications() { notificationsStress(); }

export function handleSummary(data) {
  return buildReportFiles(data, 'soak');
}
