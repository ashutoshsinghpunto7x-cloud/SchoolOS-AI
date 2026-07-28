// Spike test: sudden burst from 10 -> 500 concurrent users in 20s, held
// briefly, then dropped. Weighted toward the write-heavy, correctness-
// sensitive endpoints (attendance, fee payment) since a burst is exactly
// when duplicate-write/race-condition bugs are most likely to surface —
// two teachers' bulk-attendance submits landing in the same tick, two
// parents/receptionists paying the same fee record within milliseconds.
//
// A burst of 429s here is *expected* (see thresholds/performance.js's
// per429Tolerance.spike = null) — the rate limiter throttling under a
// sudden spike is correct behavior, not a bug. What must still be zero:
// 500s, duplicate writes, race conditions.
import { stages, scaleStages } from '../config/base.js';
import { thresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles } from '../helpers/report.js';

import { loginWorkflow } from '../scenarios/login.js';
import { teacherWorkflow } from '../scenarios/teacher.js';
import { attendanceStress } from '../scenarios/attendance.js';
import { feeStress } from '../scenarios/fee.js';
import exec from 'k6/execution';

const WEIGHTS = {
  login: 0.15,
  teacher: 0.20,
  attendance: 0.35,
  fee: 0.30,
};

function scenario(name) {
  return {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: scaleStages(stages.spike, WEIGHTS[name]),
    gracefulRampDown: '5s',
    exec: name,
  };
}

export const options = {
  scenarios: Object.fromEntries(Object.keys(WEIGHTS).map((name) => [name, scenario(name)])),
  thresholds, // no http_429_count entry here — see file header
  summaryTrendStats,
};

export function login() { loginWorkflow(); }
export function teacher() { teacherWorkflow(); }
export function attendance() { attendanceStress(); }
export function fee() { feeStress(exec.vu.idInTest, exec.scenario.iterationInInstance); }

export function handleSummary(data) {
  return buildReportFiles(data, 'spike');
}
