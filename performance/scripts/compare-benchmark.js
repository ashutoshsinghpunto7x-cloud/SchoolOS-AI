#!/usr/bin/env node
// Benchmark comparison — plain Node (not k6; runs after a k6 run, reading
// the JSON summaries handleSummary already wrote). Compares the just-run
// report against the previously stored "latest" benchmark for the same test
// type, flags regressions, then promotes the new run to be the new
// baseline.
//
// Usage: node performance/scripts/compare-benchmark.js <smoke|load|spike|stress|soak>
//
// Regression thresholds are deliberately conservative (20%) — this is meant
// to catch "this PR made things meaningfully worse", not chase run-to-run
// noise on a shared dev machine.
const fs = require('fs');
const path = require('path');

const testType = process.argv[2];
if (!testType) {
  console.error('Usage: node performance/scripts/compare-benchmark.js <smoke|load|spike|stress|soak>');
  process.exit(1);
}

const benchmarksDir = path.resolve(__dirname, '../benchmarks');
const latestPath = path.join(benchmarksDir, `${testType}-latest.json`);
const previousPath = path.join(benchmarksDir, `${testType}-previous.json`);

if (!fs.existsSync(latestPath)) {
  console.error(`No benchmark found at ${latestPath} — run the ${testType} test first (its handleSummary writes this file).`);
  process.exit(1);
}

const REGRESSION_THRESHOLD = 0.20; // 20% slower/worse counts as a regression

function metricValue(data, name, field) {
  const m = data.metrics && data.metrics[name];
  return m && m.values ? m.values[field] : undefined;
}

function compare(prev, curr) {
  const checks = [
    { label: 'http_req_duration avg (ms)', metric: 'http_req_duration', field: 'avg', higherIsWorse: true },
    { label: 'http_req_duration p95 (ms)', metric: 'http_req_duration', field: 'p(95)', higherIsWorse: true },
    { label: 'http_req_duration p99 (ms)', metric: 'http_req_duration', field: 'p(99)', higherIsWorse: true },
    { label: 'http_req_failed rate', metric: 'http_req_failed', field: 'rate', higherIsWorse: true },
    { label: 'http_500_count', metric: 'http_500_count', field: 'count', higherIsWorse: true },
  ];

  const regressions = [];
  const report = [];

  for (const c of checks) {
    const prevVal = metricValue(prev, c.metric, c.field);
    const currVal = metricValue(curr, c.metric, c.field);
    if (prevVal === undefined || currVal === undefined) continue;

    const delta = prevVal === 0 ? (currVal > 0 ? Infinity : 0) : (currVal - prevVal) / prevVal;
    const isRegression = c.higherIsWorse && delta > REGRESSION_THRESHOLD;
    report.push({ label: c.label, previous: prevVal, current: currVal, deltaPct: (delta * 100).toFixed(1) });
    if (isRegression) regressions.push(c.label);
  }

  return { report, regressions };
}

let prev = null;
if (fs.existsSync(previousPath)) {
  prev = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
}
const curr = JSON.parse(fs.readFileSync(latestPath, 'utf8'));

if (!prev) {
  console.log(`No previous ${testType} benchmark to compare against — this run becomes the baseline.`);
  fs.copyFileSync(latestPath, previousPath);
  process.exit(0);
}

const { report, regressions } = compare(prev, curr);

console.log(`\n=== Benchmark comparison: ${testType} ===`);
for (const row of report) {
  console.log(`${row.label}: ${row.previous} -> ${row.current} (${row.deltaPct >= 0 ? '+' : ''}${row.deltaPct}%)`);
}

// Promote this run to be the new baseline regardless of outcome — the
// caller (CI, or a human) decides whether a regression blocks the build;
// this script's job is only to report it.
fs.copyFileSync(latestPath, previousPath);

if (regressions.length > 0) {
  console.error(`\nREGRESSION DETECTED in: ${regressions.join(', ')} (>${REGRESSION_THRESHOLD * 100}% worse than previous ${testType} run)`);
  process.exit(1);
}

console.log('\nNo regressions detected.');
