# SchoolOS — Ops Center Live Test (50 VUs, run d1098a18-aeb1-4c47-b726-15b9fea8e692)

Generated: 2026-07-30T05:18:20.925Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 58223 |
| Successful Requests | 5776 |
| Failed Requests | 52447 |
| Average Response (ms) | 99.6 |
| P95 (ms) | 545.5 |
| P99 (ms) | 927.4 |
| Maximum Response (ms) | 1658.9 |
| Requests/sec | 344.43 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 51891 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 0.84% |
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