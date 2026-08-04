# SchoolOS — Ops Center Live Test (100 VUs, run 0741dbbb-eed1-4355-b934-894660ed0c7b)

Generated: 2026-08-04T05:41:25.519Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 800 |
| Successful Requests | 800 |
| Failed Requests | 0 |
| Average Response (ms) | 2442.2 |
| P95 (ms) | 8289.8 |
| P99 (ms) | 8897.7 |
| Maximum Response (ms) | 9650.8 |
| Requests/sec | 10.18 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 0 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 54.00% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `http_req_duration avg<500` | FAILED |
| `http_req_duration p(95)<1000` | FAILED |
| `http_req_duration p(99)<1500` | FAILED |
| `login_duration p(95)<1000` | FAILED |

## Final Decision

> Can SchoolOS safely support 100 concurrent teachers performing the full attendance workflow?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `http_req_duration` failed `avg<500`
2. `http_req_duration` failed `p(95)<1000`
3. `http_req_duration` failed `p(99)<1500`
4. `login_duration` failed `p(95)<1000`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.