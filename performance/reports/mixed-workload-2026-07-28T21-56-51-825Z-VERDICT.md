# SchoolOS — Mixed Role Workload (60 teachers / 20 receptionists / 10 admins / 10 principals)

Generated: 2026-07-28T21:56:51.825Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 720 |
| Successful Requests | 720 |
| Failed Requests | 0 |
| Average Response (ms) | 1336.0 |
| P95 (ms) | 3410.7 |
| P99 (ms) | 4779.3 |
| Maximum Response (ms) | 5050.5 |
| Requests/sec | 60.21 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 0 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 95.00% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `teacher_workflow_success rate==1` | FAILED |
| `http_req_duration p(99)<1500` | FAILED |
| `http_req_duration avg<500` | FAILED |
| `http_req_duration p(95)<1000` | FAILED |
| `login_duration p(95)<1000` | FAILED |

## Final Decision

> Can SchoolOS safely support a realistic mixed school workload (teachers marking attendance, receptionists handling admissions/fees, admins and principals viewing reports) simultaneously in production?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `teacher_workflow_success` failed `rate==1`
2. `http_req_duration` failed `p(99)<1500`
3. `http_req_duration` failed `avg<500`
4. `http_req_duration` failed `p(95)<1000`
5. `login_duration` failed `p(95)<1000`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.