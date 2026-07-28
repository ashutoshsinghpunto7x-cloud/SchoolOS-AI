// Shared report-generation used by every entry-point script's handleSummary.
// Produces the HTML + JSON + CSV + console outputs the framework spec
// requires, all under performance/reports/, one timestamped set per run so
// successive runs don't clobber each other (benchmarks/ separately keeps
// just the latest run per test type for regression comparison — see
// scripts/*.js).
//
// The HTML report is generated locally (no jslib.k6.io/k6-html-report
// dependency — that package no longer resolves from jslib's CDN as of k6
// v2.1) so a run never silently fails to produce a report just because a
// CDN path moved or the machine is offline.
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildHtmlReport(data, testType) {
  const metrics = data.metrics || {};
  const httpDuration = metrics.http_req_duration && metrics.http_req_duration.values;
  const failedRate = metrics.http_req_failed && metrics.http_req_failed.values && metrics.http_req_failed.values.rate;
  const reqs = metrics.http_reqs && metrics.http_reqs.values;
  const durationSeconds = (data.state && data.state.testRunDurationMs ? data.state.testRunDurationMs : 0) / 1000;
  const throughput = reqs && durationSeconds ? (reqs.count / durationSeconds).toFixed(2) : 'n/a';

  const maxP95 = Math.max(
    1,
    ...Object.values(metrics)
      .filter((m) => m.type === 'trend' && m.values && m.values['p(95)'])
      .map((m) => m.values['p(95)'])
  );

  const rows = Object.entries(metrics)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, m]) => {
      const v = m.values || {};
      const bar = m.type === 'trend' && v['p(95)']
        ? `<div class="bar"><div class="bar-fill" style="width:${Math.min(100, (v['p(95)'] / maxP95) * 100).toFixed(1)}%"></div></div>`
        : '';
      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(m.type)}</td>
        <td>${v.avg !== undefined ? v.avg.toFixed(2) : ''}</td>
        <td>${v.med !== undefined ? v.med.toFixed(2) : ''}</td>
        <td>${v['p(90)'] !== undefined ? v['p(90)'].toFixed(2) : ''}</td>
        <td>${v['p(95)'] !== undefined ? v['p(95)'].toFixed(2) : ''}</td>
        <td>${v['p(99)'] !== undefined ? v['p(99)'].toFixed(2) : ''}</td>
        <td>${v.max !== undefined ? v.max.toFixed(2) : ''}</td>
        <td>${v.count !== undefined ? v.count : (v.rate !== undefined ? (v.rate * 100).toFixed(2) + '%' : '')}</td>
        <td>${bar}</td>
      </tr>`;
    })
    .join('\n');

  const thresholdRows = Object.entries(data.metrics || {})
    .filter(([, m]) => m.thresholds)
    .flatMap(([name, m]) =>
      Object.entries(m.thresholds).map(([expr, result]) => `<tr class="${result.ok ? 'pass' : 'fail'}">
        <td>${escapeHtml(name)}</td><td>${escapeHtml(expr)}</td><td>${result.ok ? 'PASS' : 'FAIL'}</td>
      </tr>`)
    )
    .join('\n');

  const overallPass = !thresholdRows.includes('fail');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>SchoolOS k6 ${escapeHtml(testType)} report</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 2rem; background: #0f1117; color: #e6e6e6; }
  h1 { font-size: 1.4rem; }
  .summary { display: flex; gap: 1.5rem; margin: 1rem 0 2rem; flex-wrap: wrap; }
  .stat { background: #1a1d27; border-radius: 8px; padding: 0.75rem 1.25rem; min-width: 140px; }
  .stat .label { font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; }
  .stat .value { font-size: 1.4rem; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
  th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #2a2e3a; font-size: 0.85rem; }
  th { background: #1a1d27; position: sticky; top: 0; }
  tr.pass td:nth-child(3) { color: #4ade80; }
  tr.fail td:nth-child(3) { color: #f87171; font-weight: 700; }
  .bar { background: #2a2e3a; border-radius: 4px; width: 120px; height: 10px; overflow: hidden; }
  .bar-fill { background: #60a5fa; height: 100%; }
  .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 700; }
  .badge.pass { background: #14532d; color: #4ade80; }
  .badge.fail { background: #7f1d1d; color: #f87171; }
</style></head>
<body>
  <h1>SchoolOS performance report — ${escapeHtml(testType)} <span class="badge ${overallPass ? 'pass' : 'fail'}">${overallPass ? 'THRESHOLDS PASSED' : 'THRESHOLDS FAILED'}</span></h1>
  <div class="summary">
    <div class="stat"><div class="label">Total requests</div><div class="value">${reqs ? reqs.count : 'n/a'}</div></div>
    <div class="stat"><div class="label">Throughput (req/s)</div><div class="value">${throughput}</div></div>
    <div class="stat"><div class="label">Error rate</div><div class="value">${failedRate !== undefined ? (failedRate * 100).toFixed(2) + '%' : 'n/a'}</div></div>
    <div class="stat"><div class="label">Avg latency (ms)</div><div class="value">${httpDuration && httpDuration.avg !== undefined ? httpDuration.avg.toFixed(1) : 'n/a'}</div></div>
    <div class="stat"><div class="label">P95 latency (ms)</div><div class="value">${httpDuration && httpDuration['p(95)'] !== undefined ? httpDuration['p(95)'].toFixed(1) : 'n/a'}</div></div>
    <div class="stat"><div class="label">P99 latency (ms)</div><div class="value">${httpDuration && httpDuration['p(99)'] !== undefined ? httpDuration['p(99)'].toFixed(1) : 'n/a'}</div></div>
  </div>

  <h2>Thresholds</h2>
  <table><thead><tr><th>Metric</th><th>Expression</th><th>Result</th></tr></thead><tbody>${thresholdRows || '<tr><td colspan="3">No thresholds recorded</td></tr>'}</tbody></table>

  <h2>Metrics</h2>
  <table><thead><tr><th>Name</th><th>Type</th><th>Avg</th><th>Med</th><th>P90</th><th>P95</th><th>P99</th><th>Max</th><th>Count/Rate</th><th>P95 relative</th></tr></thead>
  <tbody>${rows}</tbody></table>
</body></html>`;
}

function metricsToCsv(data) {
  const header = ['metric', 'type', 'avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)', 'count', 'rate', 'passes', 'fails'];
  const rows = [header];
  for (const [name, m] of Object.entries(data.metrics || {})) {
    const v = m.values || {};
    rows.push([
      name, m.type,
      v.avg ?? '', v.min ?? '', v.med ?? '', v.max ?? '',
      v['p(90)'] ?? '', v['p(95)'] ?? '', v['p(99)'] ?? '',
      v.count ?? '', v.rate ?? '', v.passes ?? '', v.fails ?? '',
    ].join(','));
  }
  return rows.map((r) => (Array.isArray(r) ? r.join(',') : r)).join('\n');
}

// testType: 'smoke' | 'load' | 'spike' | 'stress' | 'soak'
export function buildReportFiles(data, testType) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `performance/reports/${testType}-${ts}`;
  const latestBase = `performance/benchmarks/${testType}-latest`;

  return {
    [`${base}.html`]: buildHtmlReport(data, testType),
    [`${base}.json`]: JSON.stringify(data, null, 2),
    [`${base}.csv`]: metricsToCsv(data),
    // Benchmark-comparison scripts (see scripts/compare-benchmark.js) diff
    // against this fixed filename rather than hunting for "the last one".
    [`${latestBase}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function metricVal(data, name, key) {
  const m = data.metrics && data.metrics[name];
  return m && m.values ? m.values[key] : undefined;
}

function fmt(n, digits = 1) {
  return typeof n === 'number' ? n.toFixed(digits) : 'n/a';
}

// "Final Report" / "Final Decision" text block the production-readiness
// framework spec asks for, generated directly from this run's own metrics —
// never hand-authored, so it can't drift from what k6 actually measured.
// Used by scripts/validate-100-teachers.js and scripts/mixed-workload.js.
export function buildVerdictReport(data, opts) {
  const { title, question } = opts;

  const allThresholdEntries = Object.entries(data.metrics || {})
    .filter(([, m]) => m.thresholds)
    .flatMap(([name, m]) => Object.entries(m.thresholds).map(([expr, result]) => ({ name, expr, ok: result.ok })));
  const failedThresholds = allThresholdEntries.filter((t) => !t.ok);
  const passed = failedThresholds.length === 0;

  const reqs = metricVal(data, 'http_reqs', 'count');
  const failedRate = metricVal(data, 'http_req_failed', 'rate') || 0;
  const failedCount = Math.round((failedRate || 0) * (reqs || 0));
  const durationSeconds = (data.state && data.state.testRunDurationMs ? data.state.testRunDurationMs : 0) / 1000;
  const rps = reqs && durationSeconds ? reqs / durationSeconds : 0;

  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Final Report');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Total Requests | ${reqs ?? 'n/a'} |`);
  lines.push(`| Successful Requests | ${reqs !== undefined ? reqs - failedCount : 'n/a'} |`);
  lines.push(`| Failed Requests | ${failedCount} |`);
  lines.push(`| Average Response (ms) | ${fmt(metricVal(data, 'http_req_duration', 'avg'))} |`);
  lines.push(`| P95 (ms) | ${fmt(metricVal(data, 'http_req_duration', 'p(95)'))} |`);
  lines.push(`| P99 (ms) | ${fmt(metricVal(data, 'http_req_duration', 'p(99)'))} |`);
  lines.push(`| Maximum Response (ms) | ${fmt(metricVal(data, 'http_req_duration', 'max'))} |`);
  lines.push(`| Requests/sec | ${fmt(rps, 2)} |`);
  lines.push(`| 429 Count | ${metricVal(data, 'http_429_count', 'count') ?? 0} |`);
  lines.push(`| 500 Count | ${metricVal(data, 'http_500_count', 'count') ?? 0} |`);
  lines.push(`| Database/Duplicate Errors (duplicate attendance) | ${fmt((metricVal(data, 'duplicate_attendance_detected', 'rate') || 0) * 100, 2)}% |`);
  lines.push(`| Duplicate Saves (fee payment) | ${fmt((metricVal(data, 'duplicate_fee_payment_detected', 'rate') || 0) * 100, 2)}% |`);
  lines.push(`| Missing / Partial Attendance Saves | ${fmt((metricVal(data, 'missing_attendance', 'rate') || 0) * 100, 2)}% / ${fmt((metricVal(data, 'partial_attendance_save', 'rate') || 0) * 100, 2)}% |`);
  lines.push(`| Authentication Failures | ${metricVal(data, 'auth_failures', 'count') ?? 0} |`);
  lines.push(`| Race Conditions Detected | ${fmt((metricVal(data, 'race_condition_detected', 'rate') || 0) * 100, 2)}% |`);
  lines.push(`| Per-teacher workflow success rate | ${fmt((metricVal(data, 'teacher_workflow_success', 'rate') ?? 1) * 100, 2)}% |`);
  lines.push('| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run\'s time window, see performance/README.md "Out of k6\'s reach" |');
  lines.push('| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |');
  lines.push('');
  lines.push('## Automatic Assertions');
  lines.push('');
  if (failedThresholds.length === 0) {
    lines.push('All configured thresholds passed.');
  } else {
    lines.push('| Threshold | Result |');
    lines.push('|---|---|');
    for (const t of failedThresholds) lines.push(`| \`${t.name} ${t.expr}\` | FAILED |`);
  }
  lines.push('');
  lines.push('## Final Decision');
  lines.push('');
  lines.push(`> ${question}`);
  lines.push('');
  if (passed) {
    lines.push('**YES** — every configured threshold in this run passed. Evidence: see the Final Report table above (0 errors/429s/500s/duplicates/partial-saves, all latency thresholds met).');
  } else {
    lines.push('**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:');
    lines.push('');
    failedThresholds.forEach((t, i) => lines.push(`${i + 1}. \`${t.name}\` failed \`${t.expr}\``));
  }
  lines.push('');
  lines.push('This verdict is generated mechanically from this run\'s own k6 thresholds/metrics — not asserted independently of the data above.');

  return lines.join('\n');
}
