# SchoolOS — 100 Concurrent Teachers Validation

Generated: 2026-07-28T20:10:33.322Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 100 |
| Successful Requests | 0 |
| Failed Requests | 100 |
| Average Response (ms) | 459.2 |
| P95 (ms) | 592.6 |
| P99 (ms) | 1072.9 |
| Maximum Response (ms) | 1107.7 |
| Requests/sec | 88.03 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 100 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 0.00% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `http_req_failed rate==0` | FAILED |
| `teacher_workflow_success rate==1` | FAILED |
| `http_req_duration avg<300` | FAILED |
| `http_req_duration p(99)<1000` | FAILED |
| `http_req_duration{name:POST /auth/login} p(95)<400` | FAILED |

## Final Decision

> Can SchoolOS safely support 100 teachers simultaneously performing Login -> Dashboard -> Attendance -> Save Attendance -> Logout in production?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `http_req_failed` failed `rate==0`
2. `teacher_workflow_success` failed `rate==1`
3. `http_req_duration` failed `avg<300`
4. `http_req_duration` failed `p(99)<1000`
5. `http_req_duration{name:POST /auth/login}` failed `p(95)<400`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.