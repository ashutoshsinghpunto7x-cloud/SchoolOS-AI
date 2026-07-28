# SchoolOS — Ops Center Live Test (3 VUs, run clitest)

Generated: 2026-07-28T21:51:04.665Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 208 |
| Successful Requests | 182 |
| Failed Requests | 26 |
| Average Response (ms) | 152.2 |
| P95 (ms) | 253.7 |
| P99 (ms) | 1939.1 |
| Maximum Response (ms) | 3925.3 |
| Requests/sec | 8.01 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 100.00% / 100.00% |
| Authentication Failures | 0 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 0.00% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `http_req_duration p(99)<1500` | FAILED |
| `login_duration p(95)<1000` | FAILED |
| `http_req_failed rate<0.01` | FAILED |

## Final Decision

> Can SchoolOS safely support 3 concurrent teachers performing the full attendance workflow?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `http_req_duration` failed `p(99)<1500`
2. `login_duration` failed `p(95)<1000`
3. `http_req_failed` failed `rate<0.01`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.