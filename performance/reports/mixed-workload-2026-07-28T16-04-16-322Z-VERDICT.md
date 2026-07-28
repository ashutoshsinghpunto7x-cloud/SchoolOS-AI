# SchoolOS — Mixed Role Workload (60 teachers / 20 receptionists / 10 admins / 10 principals)

Generated: 2026-07-28T16:04:16.322Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 719 |
| Successful Requests | 718 |
| Failed Requests | 1 |
| Average Response (ms) | 2018.5 |
| P95 (ms) | 7913.1 |
| P99 (ms) | 8967.7 |
| Maximum Response (ms) | 9396.3 |
| Requests/sec | 36.30 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 0 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 96.67% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `http_req_duration avg<500` | FAILED |
| `http_req_duration p(95)<1000` | FAILED |
| `http_req_duration p(99)<1500` | FAILED |
| `login_duration p(95)<1000` | FAILED |
| `teacher_workflow_success rate==1` | FAILED |

## Final Decision

> Can SchoolOS safely support a realistic mixed school workload (teachers marking attendance, receptionists handling admissions/fees, admins and principals viewing reports) simultaneously in production?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `http_req_duration` failed `avg<500`
2. `http_req_duration` failed `p(95)<1000`
3. `http_req_duration` failed `p(99)<1500`
4. `login_duration` failed `p(95)<1000`
5. `teacher_workflow_success` failed `rate==1`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.