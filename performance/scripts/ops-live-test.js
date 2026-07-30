// Parameterized "Teacher Workspace Load Test" driven by the Ops Center
// Performance Testing dashboard (apps/server/src/features/performance-testing),
// not run manually.
//
// Models "N teachers each mark and save attendance once, in the same
// opening-bell window" — NOT a sustained hammering loop. Each of the
// LIVE_TEST_VUS virtual teachers runs the full login -> dashboard ->
// attendance -> mark -> save -> verify -> logout workflow exactly ONCE
// (executor: per-vu-iterations, iterations: 1), all starting together. This
// used to be a ramping-vus executor that looped the workflow continuously
// for the whole duration — that modeled 50 teachers hammering the same
// save endpoint dozens of times a minute (and mostly hitting the app's own
// "already marked today" rejection on every repeat after the first), not
// what "50 teachers marking attendance" actually means. See
// scenarios/teacher-full.js's `pacing` param — LIVE_TEST_DURATION_MIN is
// now "how long one teacher's own workflow takes" (human-paced think-time
// between steps, distributed via computePacing() below), not "how long to
// keep hammering."
//
// LIVE_TEST_VUS          concurrent teachers, each running once (default 10)
// LIVE_TEST_DURATION_MIN target minutes for ONE teacher's full workflow —
//                        think-time is stretched/compressed to roughly fit
//                        (default 2)
// LIVE_TEST_RUN_ID       run id assigned by the backend; used as the
//                        deterministic report filename suffix
//                        (performance/reports/live-<id>.*) so the backend
//                        never has to glob/guess which files belong to
//                        which run.
//
// Deliberately NOT named K6_VUS/K6_DURATION/K6_RUN_ID — those are reserved
// env vars k6 itself reads as shorthand CLI overrides (equivalent to
// --vus/--duration), which silently replaces this script's `scenarios`
// config with an implicit single "default" executor.
import exec from 'k6/execution';
import { thresholds as baseThresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles, buildVerdictReport } from '../helpers/report.js';
import { teacherFullWorkflow } from '../scenarios/teacher-full.js';
import { teacherByIndex } from '../helpers/users.js';

const TARGET_VUS = Number(__ENV.LIVE_TEST_VUS) || 10;
const DURATION_MIN = Number(__ENV.LIVE_TEST_DURATION_MIN) || 2;
const RUN_ID = __ENV.LIVE_TEST_RUN_ID || 'manual';

// A roster is capped at 20 students (teacher-full.js's `students.slice(0,
// 20)`) and there are 7 non-marking pauses (workspace, attendance
// workspace, roster load, save, verify, profile, plus one more before
// logout). Spend 65% of the budget on per-student marking (the dominant
// real-world cost — reading each name) and the rest split across the fixed
// pauses. Floors keep short durations from collapsing to 0s pauses.
const ROSTER_CAP = 20;
const NON_MARKING_PAUSES = 7;
function computePacing(durationMin) {
  const budgetSec = Math.max(5, durationMin * 60);
  const perStudentSeconds = Math.max(0.1, (budgetSec * 0.65) / ROSTER_CAP);
  const stepSeconds = Math.max(0.1, (budgetSec * 0.35) / NON_MARKING_PAUSES);
  return { perStudentSeconds, stepSeconds };
}
const PACING = computePacing(DURATION_MIN);

// Generous ceiling, not a target — per-vu-iterations has no ramp/stage
// concept, so this just guards against a stuck iteration hanging the run
// forever; real completion happens well before this via the pacing budget.
const MAX_DURATION_MIN = Math.ceil(DURATION_MIN * 1.5) + 2;

export const options = {
  scenarios: {
    teacherWorkspace: {
      executor: 'per-vu-iterations',
      vus: TARGET_VUS,
      iterations: 1,
      maxDuration: `${MAX_DURATION_MIN}m`,
      exec: 'teacherWorkspace',
    },
  },
  thresholds: baseThresholds,
  summaryTrendStats,
};

// Optional: when set, each VU sends requests with a distinct synthetic
// X-Forwarded-For (10.<vuId-derived octets>) instead of k6's own single real
// source IP — models "50 teachers each on their own phone/home network"
// rather than "50 teachers behind one shared school router", which matters
// specifically because apps/server/src/middlewares/rateLimiter.ts's
// apiLimiter/authLimiter are keyed per-IP: one shared IP means all VUs fight
// over one IP's request/login budget, distinct IPs mean each VU gets its
// own. The server's `app.set('trust proxy', 1)` makes it honor this header
// even with k6 connecting directly (no real proxy in front) — see
// teacher-full.js's header comment.
const SIMULATE_DISTINCT_IPS = __ENV.LIVE_TEST_DISTINCT_IPS === 'true';

function syntheticIpFor(vuId) {
  const a = 10;
  const b = Math.floor(vuId / 65536) % 256;
  const c = Math.floor(vuId / 256) % 256;
  const d = vuId % 256;
  return `${a}.${b}.${c}.${d}`;
}

export function teacherWorkspace() {
  const vuId = exec.vu.idInTest;
  const teacher = teacherByIndex(vuId - 1);
  const extraHeaders = SIMULATE_DISTINCT_IPS ? { 'X-Forwarded-For': syntheticIpFor(vuId) } : {};
  teacherFullWorkflow(teacher, extraHeaders, PACING);
}

export function handleSummary(data) {
  const files = buildReportFiles(data, `live-${RUN_ID}`);
  // buildReportFiles() also writes a fixed benchmarks/<type>-latest.json
  // keyed off testType — not needed for ad-hoc dashboard runs, drop it so
  // repeated live tests don't clobber the smoke/load suite's benchmark file.
  delete files[`performance/benchmarks/live-${RUN_ID}-latest.json`];
  files[`performance/reports/live-${RUN_ID}-VERDICT.md`] = buildVerdictReport(data, {
    title: `SchoolOS — Ops Center Live Test (${TARGET_VUS} VUs, run ${RUN_ID})`,
    question: `Can SchoolOS safely support ${TARGET_VUS} concurrent teachers performing the full attendance workflow?`,
  });
  return files;
}
