# SchoolOS — Ops Center Live Test (50 VUs, run 2129f104-aff0-4855-a295-9fabf772a4cb)

Generated: 2026-08-04T05:39:47.974Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 400 |
| Successful Requests | 400 |
| Failed Requests | 0 |
| Average Response (ms) | 1013.0 |
| P95 (ms) | 4781.7 |
| P99 (ms) | 5031.7 |
| Maximum Response (ms) | 5698.0 |
| Requests/sec | 3.24 |
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
| `http_req_duration avg<500` | FAILED |
| `http_req_duration p(95)<1000` | FAILED |
| `http_req_duration p(99)<1500` | FAILED |

## Final Decision

> Can SchoolOS safely support 50 concurrent teachers performing the full attendance workflow?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `login_duration` failed `p(95)<1000`
2. `http_req_duration` failed `avg<500`
3. `http_req_duration` failed `p(95)<1000`
4. `http_req_duration` failed `p(99)<1500`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.