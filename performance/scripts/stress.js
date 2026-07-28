// Stress test: ramps well past the documented 500-user ceiling (to 750) to
// find where the system actually breaks, not just where it's rated to run.
// Weighted toward the heaviest aggregation queries (reports) and the
// heaviest write paths (attendance, fee) — these are expected to be the
// first things to degrade (see the codebase bottleneck analysis in
// performance/README.md's "Optimization Recommendations" section, e.g. any
// unindexed aggregation or N+1 query will show up here first as p95 climbs
// well before http_req_failed does).
import { stages, scaleStages } from '../config/base.js';
import { thresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles } from '../helpers/report.js';

import { teacherWorkflow } from '../scenarios/teacher.js';
import { attendanceStress } from '../scenarios/attendance.js';
import { feeStress } from '../scenarios/fee.js';
import { reportsStress } from '../scenarios/reports.js';
import { adminWorkflow } from '../scenarios/admin.js';
import exec from 'k6/execution';

const WEIGHTS = {
  teacher: 0.20,
  attendance: 0.20,
  fee: 0.15,
  reports: 0.30,
  admin: 0.15,
};

function scenario(name) {
  return {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: scaleStages(stages.stress, WEIGHTS[name]),
    gracefulRampDown: '10s',
    exec: name,
  };
}

export const options = {
  scenarios: Object.fromEntries(Object.keys(WEIGHTS).map((name) => [name, scenario(name)])),
  // Deliberately exceeding the documented ceiling means 429s are expected
  // above 500 VUs — same reasoning as spike.js. What still must hold: no
  // 500s, no duplicate/race-condition writes even while the system is
  // otherwise degraded or shedding load.
  thresholds,
  summaryTrendStats,
};

export function teacher() { teacherWorkflow(); }
export function attendance() { attendanceStress(); }
export function fee() { feeStress(exec.vu.idInTest, exec.scenario.iterationInInstance); }
export function reports() { reportsStress(); }
export function admin() { adminWorkflow(); }

export function handleSummary(data) {
  return buildReportFiles(data, 'stress');
}
