# SchoolOS — 100 Concurrent Teachers Validation

Generated: 2026-07-28T22:03:27.918Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 800 |
| Successful Requests | 800 |
| Failed Requests | 0 |
| Average Response (ms) | 1268.0 |
| P95 (ms) | 3186.6 |
| P99 (ms) | 3593.9 |
| Maximum Response (ms) | 3782.7 |
| Requests/sec | 67.06 |
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
| `http_req_duration{name:POST /auth/login} p(95)<400` | FAILED |
| `login_duration p(95)<1000` | FAILED |
| `http_req_duration avg<300` | FAILED |
| `http_req_duration p(95)<800` | FAILED |
| `http_req_duration p(99)<1000` | FAILED |
| `http_req_duration{name:POST /attendance/bulk} p(95)<500` | FAILED |
| `http_req_duration{name:GET /students (roster)} p(95)<500` | FAILED |
| `http_req_duration{name:GET /teacher-workspace/me} p(95)<500` | FAILED |

## Final Decision

> Can SchoolOS safely support 100 teachers simultaneously performing Login -> Dashboard -> Attendance -> Save Attendance -> Logout in production?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `http_req_duration{name:POST /auth/login}` failed `p(95)<400`
2. `login_duration` failed `p(95)<1000`
3. `http_req_duration` failed `avg<300`
4. `http_req_duration` failed `p(95)<800`
5. `http_req_duration` failed `p(99)<1000`
6. `http_req_duration{name:POST /attendance/bulk}` failed `p(95)<500`
7. `http_req_duration{name:GET /students (roster)}` failed `p(95)<500`
8. `http_req_duration{name:GET /teacher-workspace/me}` failed `p(95)<500`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.