# SchoolOS — Mixed Role Workload (60 teachers / 20 receptionists / 10 admins / 10 principals)

Generated: 2026-07-28T21:54:03.264Z

## Final Report

| Metric | Value |
|---|---|
| Total Requests | 700 |
| Successful Requests | 680 |
| Failed Requests | 20 |
| Average Response (ms) | 1175.5 |
| P95 (ms) | 3680.6 |
| P99 (ms) | 3905.1 |
| Maximum Response (ms) | 4057.0 |
| Requests/sec | 63.97 |
| 429 Count | 0 |
| 500 Count | 0 |
| Database/Duplicate Errors (duplicate attendance) | 0.00% |
| Duplicate Saves (fee payment) | 0.00% |
| Missing / Partial Attendance Saves | 0.00% / 0.00% |
| Authentication Failures | 0 |
| Race Conditions Detected | 0.00% |
| Per-teacher workflow success rate | 18.33% |
| Memory / CPU Usage | Not observable from k6 — read from Render/Atlas dashboards for this run's time window, see performance/README.md "Out of k6's reach" |
| Breaking Point | Not determined by this script — see stress.js for the dedicated ramp-to-failure test |

## Automatic Assertions

| Threshold | Result |
|---|---|
| `http_req_failed rate<0.01` | FAILED |
| `teacher_workflow_success rate==1` | FAILED |
| `http_req_duration avg<500` | FAILED |
| `http_req_duration p(95)<1000` | FAILED |
| `http_req_duration p(99)<1500` | FAILED |
| `login_duration p(95)<1000` | FAILED |

## Final Decision

> Can SchoolOS safely support a realistic mixed school workload (teachers marking attendance, receptionists handling admissions/fees, admins and principals viewing reports) simultaneously in production?

**NO** — one or more thresholds failed this run. Bottlenecks, ranked by what failed:

1. `http_req_failed` failed `rate<0.01`
2. `teacher_workflow_success` failed `rate==1`
3. `http_req_duration` failed `avg<500`
4. `http_req_duration` failed `p(95)<1000`
5. `http_req_duration` failed `p(99)<1500`
6. `login_duration` failed `p(95)<1000`

This verdict is generated mechanically from this run's own k6 thresholds/metrics — not asserted independently of the data above.