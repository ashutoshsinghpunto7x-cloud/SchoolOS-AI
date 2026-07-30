# SchoolOS — Ops Center Live Test (50 VUs, run de6f3481-cae8-4bae-a683-0176b19ba331)

Generated: 2026-07-30T05:42:37.867Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 310 |
| Successful Requests | 280 |
| Failed Requests | 30 |
| Average Response (ms) | 227.8 |
| P95 (ms) | 814.9 |
| P99 (ms) | 855.6 |
| Maximum Response (ms) | 892.9 |
| Requests/sec | 2.68 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 0 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 40.00% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `http_req_failed rate<0.01` | FAILED |

## Final Decision

> Can SchoolOS safely support 50 concurrent teachers performing the full attendance workflow?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `http_req_failed` failed `rate<0.01`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.