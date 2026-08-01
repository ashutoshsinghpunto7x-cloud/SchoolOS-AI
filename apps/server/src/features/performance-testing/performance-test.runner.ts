import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { performance, monitorEventLoopDelay } from 'perf_hooks';
import mongoose from 'mongoose';
import { logger } from '../../lib/logger';
import { env } from '../../config/env';
import { performanceTestRepository } from './performance-test.repository';
import type { PerformanceTestStage, PerformanceTestStatus } from './performance-test.model';

// Spawns `k6 run --out json=<file>` and tails that file once a second to
// build a live dashboard snapshot — this is the real-time hook: k6's
// `--out json=` writes one NDJSON line per metric data point *as the test
// runs*, not just a summary at the end. No WebSocket/SSE — the controller
// exposes getLiveSnapshot() for the frontend to poll every 1s (see plan:
// Bearer-token auth doesn't play well with native EventSource, and there's
// no existing WS/SSE infra in this repo to build on).
//
// Single active run at a time (this is an internal single-operator tool,
// not a multi-tenant test runner) — state lives in one module-level
// variable, not a Map.

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'performance', 'scripts', 'ops-live-test.js');
const REPORTS_DIR = path.join(REPO_ROOT, 'performance', 'reports');
const LATENCY_RESERVOIR_CAP = 3000;
const SERIES_CAP = 900; // 15 minutes at 1s resolution
const TICK_MS = 1000;

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, idx)]);
}

function mean(samples: number[]): number {
  if (samples.length === 0) return 0;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  occurredAt: string;
}

interface ActivityEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
}

export interface LiveSnapshot {
  runId: string;
  label: string;
  status: PerformanceTestStatus;
  stage: PerformanceTestStage;
  targetVUs: number;
  durationMinutes: number;
  currentVUs: number;
  peakVUs: number;
  startedAt: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSec: number;
  avgResponseMs: number;
  medianResponseMs: number;
  p90ResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
  maxResponseMs: number;
  successRatePercent: number;
  errorRatePercent: number;
  http429Count: number;
  http500Count: number;
  http401Count: number;
  authFailures: number;
  duplicateAttendanceRatePercent: number;
  raceConditionRatePercent: number;
  teacherWorkflowSuccessRatePercent: number;
  statusCodeCounts: Record<string, number>;
  topEndpoints: Array<{ name: string; requests: number; avgMs: number }>;
  series: {
    timestamps: string[];
    avgResponseMs: number[];
    p95ResponseMs: number[];
    p99ResponseMs: number[];
    requestsPerSec: number[];
    virtualUsers: number[];
    errorRatePercent: number[];
  };
  infra: {
    cpuPercent: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
    eventLoopDelayMs: number;
    mongoLatencyMs: number;
    mongoHealthy: boolean;
    mongoPoolSize: number;
  };
  alerts: Alert[];
  activity: ActivityEntry[];
}

interface K6Point {
  type: string;
  metric: string;
  data: { time: string; value: number; tags?: Record<string, string> };
}

interface ActiveRun {
  runId: string;
  label: string;
  child: ChildProcess;
  outputPath: string;
  readOffset: number;
  pendingLine: string;
  targetVUs: number;
  durationMinutes: number;
  rampMinutes: number;
  startedAt: number;
  status: PerformanceTestStatus;
  stage: PerformanceTestStage;
  currentVUs: number;
  peakVUs: number;
  totalRequests: number;
  failedRequests: number;
  latencySamples: number[];
  statusCodeCounts: Record<string, number>;
  endpointStats: Map<string, { requests: number; durationSum: number }>;
  http429: number;
  http500: number;
  http401: number;
  authFailures: number;
  duplicateAttendanceHits: number;
  duplicateAttendanceTotal: number;
  raceConditionHits: number;
  raceConditionTotal: number;
  teacherWorkflowHits: number;
  teacherWorkflowTotal: number;
  series: LiveSnapshot['series'];
  alerts: Alert[];
  activity: ActivityEntry[];
  seenAlertKeys: Set<string>;
  tickTimer: NodeJS.Timeout;
  eventLoopMonitor: ReturnType<typeof monitorEventLoopDelay>;
  lastCpuUsage: NodeJS.CpuUsage;
  lastCpuSampleAt: number;
  lastMongoPingAt: number;
  lastMongoLatencyMs: number;
  lastMongoHealthy: boolean;
  stderrTail: string[];
  finished: boolean;
  lastTotalForRps: number;
}

let activeRun: ActiveRun | null = null;

function pushActivity(run: ActiveRun, message: string, level: ActivityEntry['level'] = 'info') {
  run.activity.unshift({ timestamp: new Date().toISOString(), message, level });
  if (run.activity.length > 100) run.activity.length = 100;
}

function pushAlertOnce(run: ActiveRun, key: string, severity: Alert['severity'], title: string, message: string) {
  if (run.seenAlertKeys.has(key)) return;
  run.seenAlertKeys.add(key);
  run.alerts.unshift({ id: key, severity, title, message, occurredAt: new Date().toISOString() });
  if (run.alerts.length > 50) run.alerts.length = 50;
  pushActivity(run, message, severity);
}

function computeStage(run: ActiveRun, elapsedSeconds: number): PerformanceTestStage {
  const rampSec = run.rampMinutes * 60;
  const steadySec = run.durationMinutes * 60;
  if (elapsedSeconds < rampSec) return 'ramp-up';
  if (elapsedSeconds < rampSec + steadySec) return 'steady';
  if (elapsedSeconds < rampSec * 2 + steadySec) return 'ramp-down';
  return 'completed';
}

function processLine(run: ActiveRun, line: string) {
  if (!line.trim()) return;
  let point: K6Point;
  try {
    point = JSON.parse(line);
  } catch {
    return;
  }
  if (point.type !== 'Point' || !point.data) return;

  const { metric, data } = point;
  const value = data.value;
  const tags = data.tags ?? {};

  switch (metric) {
    case 'vus': {
      run.currentVUs = Math.round(value);
      run.peakVUs = Math.max(run.peakVUs, run.currentVUs);
      break;
    }
    case 'http_req_duration': {
      run.totalRequests += 1;
      run.latencySamples.push(value);
      if (run.latencySamples.length > LATENCY_RESERVOIR_CAP) run.latencySamples.shift();

      const status = tags.status ?? 'unknown';
      run.statusCodeCounts[status] = (run.statusCodeCounts[status] ?? 0) + 1;

      const name = tags.name ?? 'unnamed';
      const stat = run.endpointStats.get(name) ?? { requests: 0, durationSum: 0 };
      stat.requests += 1;
      stat.durationSum += value;
      run.endpointStats.set(name, stat);
      break;
    }
    case 'http_req_failed': {
      if (value >= 1) run.failedRequests += 1;
      break;
    }
    case 'http_500_count': {
      run.http500 += value;
      pushAlertOnce(run, `500-${Math.floor(Date.now() / 5000)}`, 'critical', '500 Internal Server Error', `${tags.name ?? 'A request'} returned HTTP 500`);
      break;
    }
    case 'http_429_count': {
      run.http429 += value;
      pushAlertOnce(run, `429-${Math.floor(Date.now() / 5000)}`, 'warning', '429 Too Many Requests', `${tags.name ?? 'A request'} was rate-limited`);
      break;
    }
    case 'auth_failures': {
      run.authFailures += value;
      pushAlertOnce(run, `auth-${Math.floor(Date.now() / 5000)}`, 'warning', 'Authentication failure', 'A login attempt failed during the test');
      break;
    }
    case 'duplicate_attendance_detected': {
      run.duplicateAttendanceTotal += 1;
      if (value >= 1) {
        run.duplicateAttendanceHits += 1;
        pushAlertOnce(run, `dup-attendance-${Date.now()}`, 'critical', 'Duplicate attendance detected', 'A teacher\'s attendance save produced a duplicate row');
      }
      break;
    }
    case 'race_condition_detected': {
      run.raceConditionTotal += 1;
      if (value >= 1) {
        run.raceConditionHits += 1;
        pushAlertOnce(run, `race-${Date.now()}`, 'critical', 'Race condition detected', 'A concurrent write produced an inconsistent result');
      }
      break;
    }
    case 'teacher_workflow_success': {
      run.teacherWorkflowTotal += 1;
      if (value >= 1) run.teacherWorkflowHits += 1;
      break;
    }
    default:
      break;
  }

  if (tags.status === '401') run.http401 += 1;
}

function tailOutputFile(run: ActiveRun) {
  if (!fs.existsSync(run.outputPath)) return;
  const stat = fs.statSync(run.outputPath);
  if (stat.size <= run.readOffset) return;

  const chunk = fs.readFileSync(run.outputPath, { encoding: 'utf8', flag: 'r' }).slice(run.readOffset);
  run.readOffset = stat.size;

  const combined = run.pendingLine + chunk;
  const lines = combined.split('\n');
  run.pendingLine = lines.pop() ?? '';
  for (const line of lines) processLine(run, line);
}

function sampleInfra(run: ActiveRun): LiveSnapshot['infra'] {
  const now = Date.now();
  const cpu = process.cpuUsage(run.lastCpuUsage);
  const elapsedMs = now - run.lastCpuSampleAt || TICK_MS;
  const cpuPercent = Math.min(100, Math.round(((cpu.user + cpu.system) / 1000 / elapsedMs) * 100 / os.cpus().length));
  run.lastCpuUsage = process.cpuUsage();
  run.lastCpuSampleAt = now;

  const mem = process.memoryUsage();

  const eld = run.eventLoopMonitor;
  const eventLoopDelayMs = Math.round(eld.mean / 1e6) || 0;

  // Mongo ping is cheap (single round trip) but still throttled to every 5s
  // to avoid adding self-inflicted load on top of whatever the k6 run itself
  // is generating.
  if (now - run.lastMongoPingAt > 5000) {
    run.lastMongoPingAt = now;
    const pingStart = performance.now();
    mongoose.connection.db
      ?.admin()
      .ping()
      .then(() => {
        run.lastMongoLatencyMs = Math.round(performance.now() - pingStart);
        run.lastMongoHealthy = true;
      })
      .catch(() => {
        run.lastMongoHealthy = false;
      });
  }

  return {
    cpuPercent: Number.isFinite(cpuPercent) ? Math.max(0, cpuPercent) : 0,
    memoryUsedMb: Math.round(mem.rss / 1024 / 1024),
    memoryTotalMb: Math.round(os.totalmem() / 1024 / 1024),
    eventLoopDelayMs,
    mongoLatencyMs: run.lastMongoLatencyMs,
    mongoHealthy: run.lastMongoHealthy,
    mongoPoolSize: mongoose.connection.getClient()?.options?.maxPoolSize ?? 0,
  };
}

function buildSnapshot(run: ActiveRun): LiveSnapshot {
  const elapsedSeconds = Math.round((Date.now() - run.startedAt) / 1000);
  const totalPlannedSeconds = run.rampMinutes * 2 * 60 + run.durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalPlannedSeconds - elapsedSeconds);

  if (run.status === 'running') {
    run.stage = computeStage(run, elapsedSeconds);
  }

  const avgResponseMs = mean(run.latencySamples);
  const p95 = percentile(run.latencySamples, 95);
  const p99 = percentile(run.latencySamples, 99);
  const successRequests = run.totalRequests - run.failedRequests;
  const successRatePercent = run.totalRequests > 0 ? Number(((successRequests / run.totalRequests) * 100).toFixed(2)) : 100;
  const errorRatePercent = run.totalRequests > 0 ? Number(((run.failedRequests / run.totalRequests) * 100).toFixed(2)) : 0;

  const infra = sampleInfra(run);

  const lastTickRequests = run.totalRequests - run.lastTotalForRps;
  run.lastTotalForRps = run.totalRequests;

  const nowIso = new Date().toISOString();
  run.series.timestamps.push(nowIso);
  run.series.avgResponseMs.push(avgResponseMs);
  run.series.p95ResponseMs.push(p95);
  run.series.p99ResponseMs.push(p99);
  run.series.requestsPerSec.push(Math.max(0, lastTickRequests));
  run.series.virtualUsers.push(run.currentVUs);
  run.series.errorRatePercent.push(errorRatePercent);
  for (const key of Object.keys(run.series) as (keyof LiveSnapshot['series'])[]) {
    if (run.series[key].length > SERIES_CAP) run.series[key].shift();
  }

  if (infra.cpuPercent > 80) pushAlertOnce(run, `cpu-${Math.floor(Date.now() / 15000)}`, 'warning', 'CPU above 80%', `CPU usage at ${infra.cpuPercent}%`);
  if (infra.memoryUsedMb / infra.memoryTotalMb > 0.8) pushAlertOnce(run, `mem-${Math.floor(Date.now() / 15000)}`, 'warning', 'Memory above 80%', `Memory usage at ${Math.round((infra.memoryUsedMb / infra.memoryTotalMb) * 100)}%`);
  if (!infra.mongoHealthy) pushAlertOnce(run, `mongo-${Math.floor(Date.now() / 15000)}`, 'critical', 'MongoDB disconnected', 'The last MongoDB ping failed');
  if (p95 > 1000) pushAlertOnce(run, `p95-${Math.floor(Date.now() / 15000)}`, 'warning', 'High response time', `P95 response time at ${p95}ms`);

  const topEndpoints = Array.from(run.endpointStats.entries())
    .map(([name, stat]) => ({ name, requests: stat.requests, avgMs: Math.round(stat.durationSum / stat.requests) }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  return {
    runId: run.runId,
    label: run.label,
    status: run.status,
    stage: run.stage,
    targetVUs: run.targetVUs,
    durationMinutes: run.durationMinutes,
    currentVUs: run.currentVUs,
    peakVUs: run.peakVUs,
    startedAt: new Date(run.startedAt).toISOString(),
    elapsedSeconds,
    remainingSeconds,
    totalRequests: run.totalRequests,
    successfulRequests: successRequests,
    failedRequests: run.failedRequests,
    requestsPerSec: lastTickRequests,
    avgResponseMs,
    medianResponseMs: percentile(run.latencySamples, 50),
    p90ResponseMs: percentile(run.latencySamples, 90),
    p95ResponseMs: p95,
    p99ResponseMs: p99,
    maxResponseMs: run.latencySamples.length ? Math.round(Math.max(...run.latencySamples)) : 0,
    successRatePercent,
    errorRatePercent,
    http429Count: run.http429,
    http500Count: run.http500,
    http401Count: run.http401,
    authFailures: run.authFailures,
    duplicateAttendanceRatePercent: run.duplicateAttendanceTotal > 0 ? Number(((run.duplicateAttendanceHits / run.duplicateAttendanceTotal) * 100).toFixed(2)) : 0,
    raceConditionRatePercent: run.raceConditionTotal > 0 ? Number(((run.raceConditionHits / run.raceConditionTotal) * 100).toFixed(2)) : 0,
    teacherWorkflowSuccessRatePercent: run.teacherWorkflowTotal > 0 ? Number(((run.teacherWorkflowHits / run.teacherWorkflowTotal) * 100).toFixed(2)) : 100,
    statusCodeCounts: run.statusCodeCounts,
    topEndpoints,
    series: run.series,
    infra,
    alerts: run.alerts.slice(0, 20),
    activity: run.activity.slice(0, 30),
  };
}

async function finalizeRun(run: ActiveRun, status: 'completed' | 'stopped' | 'failed', failureReason?: string) {
  if (run.finished) return;
  run.finished = true;
  run.status = status;
  run.stage = 'completed';
  clearInterval(run.tickTimer);
  run.eventLoopMonitor.disable();
  tailOutputFile(run);

  const snapshot = buildSnapshot(run);
  pushActivity(run, `Test ${status}`, status === 'failed' ? 'critical' : 'info');

  await performanceTestRepository.updateByRunId(run.runId, {
    status,
    stage: 'completed',
    endedAt: new Date(),
    failureReason,
    summary: {
      totalRequests: snapshot.totalRequests,
      successfulRequests: snapshot.successfulRequests,
      failedRequests: snapshot.failedRequests,
      requestsPerSec: snapshot.totalRequests > 0 ? Number((snapshot.totalRequests / Math.max(1, snapshot.elapsedSeconds)).toFixed(2)) : 0,
      avgResponseMs: snapshot.avgResponseMs,
      medianResponseMs: snapshot.medianResponseMs,
      p90ResponseMs: snapshot.p90ResponseMs,
      p95ResponseMs: snapshot.p95ResponseMs,
      p99ResponseMs: snapshot.p99ResponseMs,
      maxResponseMs: snapshot.maxResponseMs,
      successRatePercent: snapshot.successRatePercent,
      errorRatePercent: snapshot.errorRatePercent,
      http429Count: snapshot.http429Count,
      http500Count: snapshot.http500Count,
      http401Count: snapshot.http401Count,
      authFailures: snapshot.authFailures,
      duplicateAttendanceRatePercent: snapshot.duplicateAttendanceRatePercent,
      raceConditionRatePercent: snapshot.raceConditionRatePercent,
      teacherWorkflowSuccessRatePercent: snapshot.teacherWorkflowSuccessRatePercent,
      peakVUs: snapshot.peakVUs,
    },
  }).catch((err: Error) => logger.error('Failed to persist performance test summary', { message: err.message }));

  // Keep the finished run's snapshot available for a short grace period so
  // the frontend's last poll (which may land just after exit) still gets a
  // final frame instead of a sudden null.
  setTimeout(() => {
    if (activeRun === run) activeRun = null;
  }, 5000);
}

export interface StartOptions {
  runId: string;
  label: string;
  targetVUs: number;
  durationMinutes: number;
}

function startedByEnv() {
  return {
    K6_BASE_URL: process.env.K6_BASE_URL || `http://localhost:${env.PORT}/api/v1`,
  };
}

export const performanceTestRunner = {
  isRunning(): boolean {
    return activeRun !== null && !activeRun.finished;
  },

  start(opts: StartOptions): void {
    if (this.isRunning()) {
      throw new Error('A performance test is already running');
    }

    const rampMinutes = Math.min(1, opts.durationMinutes * 0.2) || 0.25;
    const outputPath = path.join(os.tmpdir(), `k6-live-${opts.runId}.ndjson`);
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const child = spawn(
      env.K6_BIN_PATH,
      ['run', '--quiet', '--out', `json=${outputPath}`, SCRIPT_PATH],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ...startedByEnv(),
          // Not K6_VUS/K6_DURATION/K6_RUN_ID — those are reserved names k6
          // itself interprets as CLI-flag overrides and would silently
          // replace ops-live-test.js's scripted scenarios config. See that
          // script's header comment.
          LIVE_TEST_VUS: String(opts.targetVUs),
          LIVE_TEST_DURATION_MIN: String(opts.durationMinutes),
          LIVE_TEST_RUN_ID: opts.runId,
        },
      },
    );

    const run: ActiveRun = {
      runId: opts.runId,
      label: opts.label,
      child,
      outputPath,
      readOffset: 0,
      pendingLine: '',
      targetVUs: opts.targetVUs,
      durationMinutes: opts.durationMinutes,
      rampMinutes,
      startedAt: Date.now(),
      status: 'running',
      stage: 'ramp-up',
      currentVUs: 0,
      peakVUs: 0,
      totalRequests: 0,
      failedRequests: 0,
      latencySamples: [],
      statusCodeCounts: {},
      endpointStats: new Map(),
      http429: 0,
      http500: 0,
      http401: 0,
      authFailures: 0,
      duplicateAttendanceHits: 0,
      duplicateAttendanceTotal: 0,
      raceConditionHits: 0,
      raceConditionTotal: 0,
      teacherWorkflowHits: 0,
      teacherWorkflowTotal: 0,
      series: { timestamps: [], avgResponseMs: [], p95ResponseMs: [], p99ResponseMs: [], requestsPerSec: [], virtualUsers: [], errorRatePercent: [] },
      alerts: [],
      activity: [],
      seenAlertKeys: new Set(),
      tickTimer: setInterval(() => {}, TICK_MS), // replaced below
      eventLoopMonitor: monitorEventLoopDelay({ resolution: 20 }),
      lastCpuUsage: process.cpuUsage(),
      lastCpuSampleAt: Date.now(),
      lastMongoPingAt: 0,
      lastMongoLatencyMs: 0,
      lastMongoHealthy: true,
      stderrTail: [],
      finished: false,
      lastTotalForRps: 0,
    };

    clearInterval(run.tickTimer);
    run.eventLoopMonitor.enable();
    pushActivity(run, `Test started — ${opts.targetVUs} VUs target, ${opts.durationMinutes}m steady load`);

    run.tickTimer = setInterval(() => {
      tailOutputFile(run);
      buildSnapshot(run);
    }, TICK_MS);

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      run.stderrTail.push(text);
      if (run.stderrTail.length > 20) run.stderrTail.shift();
    });

    child.on('error', (err) => {
      // Spawn itself failed (e.g. the `k6` binary isn't installed / not on
      // PATH) — this fires instead of 'exit', and without a listener Node
      // treats it as an uncaught exception and crashes the whole process.
      if (run.finished) return;
      void finalizeRun(run, 'failed', `Could not start k6: ${err.message}. Is k6 installed and on PATH (K6_BIN_PATH=${env.K6_BIN_PATH})?`);
      try {
        fs.unlinkSync(outputPath);
      } catch {
        // best-effort cleanup
      }
    });

    child.on('exit', (code) => {
      tailOutputFile(run);
      if (run.finished) return;
      if (code === 0) {
        void finalizeRun(run, 'completed');
      } else if (run.status === 'running') {
        // Non-zero can mean either a failed threshold (k6's own pass/fail
        // signal — still a completed run with real data) or a real crash.
        // Distinguish using whether we captured any requests at all.
        if (run.totalRequests > 0) {
          void finalizeRun(run, 'completed');
        } else {
          void finalizeRun(run, 'failed', run.stderrTail.join('').slice(-2000) || `k6 exited with code ${code}`);
        }
      }
      try {
        fs.unlinkSync(outputPath);
      } catch {
        // best-effort cleanup
      }
    });

    activeRun = run;
  },

  stop(runId: string): void {
    if (!activeRun || activeRun.runId !== runId || activeRun.finished) {
      throw new Error('No matching active test to stop');
    }
    pushActivity(activeRun, 'Stop requested by operator', 'warning');
    void finalizeRun(activeRun, 'stopped');
    // On Windows this force-terminates (no graceful SIGINT support), so the
    // snapshot frozen by finalizeRun() above — not k6's own handleSummary —
    // is treated as the source of truth. See plan's "Windows note".
    activeRun.child.kill();
  },

  getLiveSnapshot(): LiveSnapshot | null {
    if (!activeRun) return null;
    return buildSnapshot(activeRun);
  },
};
