# SchoolOS — 100 Concurrent Teachers Validation

Generated: 2026-07-28T15:59:37.966Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 800 |
| Successful Requests | 800 |
| Failed Requests | 0 |
| Average Response (ms) | 2082.8 |
| P95 (ms) | 6264.2 |
| P99 (ms) | 9124.2 |
| Maximum Response (ms) | 9644.8 |
| Requests/sec | 39.54 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 0 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 100.00% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `login_duration p(95)<1000` | FAILED |
| `http_req_duration{name:GET /teacher-workspace/me} p(95)<500` | FAILED |
| `http_req_duration{name:POST /attendance/bulk} p(95)<500` | FAILED |
| `http_req_duration{name:GET /students (roster)} p(95)<500` | FAILED |
| `http_req_duration avg<300` | FAILED |
| `http_req_duration p(95)<800` | FAILED |
| `http_req_duration p(99)<1000` | FAILED |
| `http_req_duration{name:POST /auth/login} p(95)<400` | FAILED |

## Final Decision

> Can SchoolOS safely support 100 teachers simultaneously performing Login -> Dashboard -> Attendance -> Save Attendance -> Logout in production?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `login_duration` failed `p(95)<1000`
2. `http_req_duration{name:GET /teacher-workspace/me}` failed `p(95)<500`
3. `http_req_duration{name:POST /attendance/bulk}` failed `p(95)<500`
4. `http_req_duration{name:GET /students (roster)}` failed `p(95)<500`
5. `http_req_duration` failed `avg<300`
6. `http_req_duration` failed `p(95)<800`
7. `http_req_duration` failed `p(99)<1000`
8. `http_req_duration{name:POST /auth/login}` failed `p(95)<400`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.