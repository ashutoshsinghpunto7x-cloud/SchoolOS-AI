// Parameterized "Teacher Workspace Load Test" driven by the Ops Center
// Performance Testing dashboard (apps/server/src/features/performance-testing),
// not run manually. Unlike scripts/validate-100-teachers.js (fixed 100 VUs,
// exactly one iteration each), this script takes its VU count and duration
// from env vars set by the backend when it spawns k6, and ramps through three
// named stages — ramp-up / steady / ramp-down — so the live dashboard's stage
// indicator reflects real k6 stage data instead of being guessed client-side.
//
// LIVE_TEST_VUS          target concurrent virtual users (default 10)
// LIVE_TEST_DURATION_MIN total steady-load minutes, ramp-up/down are fixed
//                        at 20% of this each, capped at 1 minute (default 2)
// LIVE_TEST_RUN_ID       run id assigned by the backend; used as the
//                        deterministic report filename suffix
//                        (performance/reports/live-<id>.*) so the backend
//                        never has to glob/guess which files belong to
//                        which run.
//
// Deliberately NOT named K6_VUS/K6_DURATION/K6_RUN_ID — those are reserved
// env vars k6 itself reads as shorthand CLI overrides (equivalent to
// --vus/--duration), which silently replaces this script's `scenarios`
// config with an implicit single "default" executor and breaks the 3-stage
// ramp-up/steady/ramp-down profile entirely.
import exec from 'k6/execution';
import { thresholds as baseThresholds, summaryTrendStats } from '../thresholds/performance.js';
import { buildReportFiles, buildVerdictReport } from '../helpers/report.js';
import { teacherFullWorkflow } from '../scenarios/teacher-full.js';
import { teacherByIndex } from '../helpers/users.js';

const TARGET_VUS = Number(__ENV.LIVE_TEST_VUS) || 10;
const DURATION_MIN = Number(__ENV.LIVE_TEST_DURATION_MIN) || 2;
const RUN_ID = __ENV.LIVE_TEST_RUN_ID || 'manual';

const rampMin = Math.min(1, DURATION_MIN * 0.2) || 0.25;

export const options = {
  scenarios: {
    teacherWorkspace: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: `${rampMin}m`, target: TARGET_VUS },
        { duration: `${DURATION_MIN}m`, target: TARGET_VUS },
        { duration: `${rampMin}m`, target: 0 },
      ],
      gracefulRampDown: '10s',
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
  teacherFullWorkflow(teacher, extraHeaders);
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
