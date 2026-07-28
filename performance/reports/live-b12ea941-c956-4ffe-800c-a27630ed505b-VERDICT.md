# SchoolOS — Ops Center Live Test (10 VUs, run b12ea941-c956-4ffe-800c-a27630ed505b)

Generated: 2026-07-28T22:08:22.975Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 1992 |
| Successful Requests | 1992 |
| Failed Requests | 0 |
| Average Response (ms) | 192.5 |
| P95 (ms) | 591.6 |
| P99 (ms) | 776.0 |
| Maximum Response (ms) | 1134.1 |
| Requests/sec | 23.56 |
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

> Can SchoolOS safely support 10 concurrent teachers performing the full attendance workflow?

**YES** — every configured threshold in this run passed. Evidence: see the Final Report table above (0 errors/429s/500s/duplicates/partial-saves, all latency thresholds met).

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.