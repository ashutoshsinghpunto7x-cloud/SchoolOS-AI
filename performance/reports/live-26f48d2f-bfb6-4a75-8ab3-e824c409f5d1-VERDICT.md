# SchoolOS — Ops Center Live Test (50 VUs, run 26f48d2f-bfb6-4a75-8ab3-e824c409f5d1)

Generated: 2026-07-30T05:47:50.397Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 400 |
| Successful Requests | 400 |
| Failed Requests | 0 |
| Average Response (ms) | 158.2 |
| P95 (ms) | 701.9 |
| P99 (ms) | 779.0 |
| Maximum Response (ms) | 825.6 |
| Requests/sec | 3.46 |
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

All configured thresholds passed.

## Final Decision

> Can SchoolOS safely support 50 concurrent teachers performing the full attendance workflow?

**YES** — every configured threshold in this run passed. Evidence: see the Final Report table above (0 errors/429s/500s/duplicates/partial-saves, all latency thresholds met).

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.