# SchoolOS Performance Engineering Framework

A k6-based performance testing framework for the SchoolOS ERP backend
(`apps/server`). It is meant to run **before every production deployment**,
and eventually on every PR (smoke) and every merge to `main` (load) —
see [CI wiring](#ci-wiring-not-set-up-yet) below for what's actually wired
up today versus what's designed-for.

## Scope of this build (read this first)

This framework was built and validated **against `local` only**, by explicit
project decision:

- **Target environment**: local dev server (`npm run dev -w apps/server`,
  `http://localhost:5050/api/v1`) + whatever MongoDB it's pointed at locally.
  Staging and production are **not** wired up or exercised — see
  [Running against staging or production](#running-against-staging-or-production).
- **Test data**: a dedicated synthetic-seed script
  (`apps/server/src/scripts/seed-perf-test-data.ts`) creates an isolated
  tenant, `schoolId = 'PERF_TEST_SCHOOL'`, so no real school's data is ever
  read, written, or deleted by this suite.
- **CI wiring**: not set up in this pass. See
  [CI wiring](#ci-wiring-not-set-up-yet) for the intended GitHub Actions
  shape to add later.

## Folder structure

```
performance/
├── config/          base.js (env resolution, VU-stage presets), staging.js, production.js
├── scenarios/       one file per role workflow / endpoint-focus
├── helpers/         auth, jwt, randomData, users (fixture loader), assertions, metrics, report
├── thresholds/       performance.js — the pass/fail bar every script imports
├── reports/          timestamped HTML/JSON/CSV output per run (gitignored contents)
├── benchmarks/       *-latest.json / *-previous.json for regression comparison
├── data/             perf-test-context.json + teachers.csv (written by the seed script)
└── scripts/          smoke.js, load.js, spike.js, stress.js, soak.js, compare-benchmark.js
```

## Prerequisites

1. **Install k6** (already done in this environment via
   `winget install -e --id GrafanaLabs.k6`). Confirm with:
   ```bash
   k6 version
   ```
2. **Run the server locally in development mode.** Rate limits are ~50-500x
   stricter in production mode (`apps/server/src/middlewares/rateLimiter.ts`)
   — testing against a non-development server just measures the rate
   limiter, not the application:
   ```bash
   npm run dev -w apps/server
   ```
3. **Seed the isolated perf-test tenant** (safe to re-run any time — it only
   wipes its own `PERF_TEST_SCHOOL` rows):
   ```bash
   npm run seed:perf-test-data -w apps/server
   ```
   Scale it up/down with env vars if you need more or fewer VUs' worth of
   students:
   ```bash
   PERF_TEACHERS=40 PERF_STUDENTS_PER_TEACHER=30 npm run seed:perf-test-data -w apps/server
   ```
   This writes `performance/data/perf-test-context.json` (credentials + real
   Mongo IDs every scenario needs) and `performance/data/teachers.csv`.

## Running a test

All commands assume the repo root as your working directory (k6 resolves
`performance/reports/...` paths in `handleSummary` relative to cwd).

```bash
# Smoke — ~1 minute, 2 VUs through every workflow once. Run this first.
k6 run performance/scripts/smoke.js

# Load — ramps 10 -> 25 -> 50 -> 100 -> 250 -> 500 total concurrent users.
k6 run performance/scripts/load.js

# Spike — sudden 10 -> 500 burst, held briefly, dropped.
k6 run performance/scripts/spike.js

# Stress — ramps past the rated ceiling (to 750) to find the actual break point.
k6 run performance/scripts/stress.js

# Soak — steady 50 VUs for 4 hours by default. For a local sanity check,
# shrink the hold to 10 minutes:
k6 run -e K6_SOAK_MINUTES=10 performance/scripts/soak.js

# 100-teacher validation — exactly 100 real teachers, each running the full
# literal workflow (login -> dashboard -> workspace -> classes -> attendance
# workspace -> select date -> student list -> mark -> save -> verify ->
# profile -> logout) exactly once, all starting together. Needs >=100
# seeded teachers:
PERF_TEACHERS=100 npm run seed:perf-test-data -w apps/server
k6 run performance/scripts/validate-100-teachers.js

# Mixed workload — 60 teachers + 20 receptionists + 10 admins + 10
# principals, each running their real workflow once, concurrently. Needs
# matching seed counts:
PERF_TEACHERS=60 PERF_RECEPTION=20 PERF_ADMIN=10 PERF_PRINCIPAL=10 \
  npm run seed:perf-test-data -w apps/server
k6 run performance/scripts/mixed-workload.js
```

Both of these also write a `*-VERDICT.md` file alongside the usual
HTML/JSON/CSV report — a "Final Report" table plus a mechanically-generated
"Final Decision" (yes/no, with ranked bottlenecks on failure), computed
directly from that run's own thresholds/metrics rather than asserted
separately. See `helpers/report.js`'s `buildVerdictReport`.

`validate-100-teachers.js` and `mixed-workload.js` log in fresh once per VU
(deliberately, not session-cached like the other scripts) since they model
"100 teachers each log in once this morning," not a sustained multi-iteration
session. That means they depend on dev-mode's relaxed `authLimiter` headroom
— see Prerequisites below; do not point either at a production-mode server.

Every run's exit code reflects whether `thresholds/performance.js` passed —
a non-zero exit means **not production-ready**, full stop. That's the
"automatic failure" mechanism; there's no separate manual pass/fail step.

After a run, compare it against the last recorded baseline:
```bash
node performance/scripts/compare-benchmark.js load
```
This flags any metric that regressed >20% vs. the previous run of the same
test type, then promotes the new run to be the new baseline regardless (so
regressions get reported, not silently hidden, but also don't permanently
block future comparisons).

## Reports

Each run writes, under `performance/reports/<testType>-<timestamp>.{html,json,csv}`:
- **HTML** — self-contained visual report (latency, throughput, error %,
  per-metric P90/P95/P99 table with relative-latency bars, threshold
  pass/fail) generated locally in `helpers/report.js` — no CDN dependency.
- **JSON** — the complete k6 summary object, for custom tooling/CI parsing.
- **CSV** — flattened metric table (avg/min/med/max/p90/p95/p99/count/rate)
  for spreadsheet analysis or graphing (throughput, P95, P99, error % —
  build charts from this in Excel/Sheets, or a notebook, per the framework
  spec's "graphs for latency/throughput/..." requirement).
- **Console summary** — printed via `k6-summary`.

`performance/benchmarks/<testType>-latest.json` / `-previous.json` are the
rolling pair `compare-benchmark.js` diffs.

## Out of k6's reach

k6 only observes HTTP responses from outside the server process. These
mandatory checks from the framework spec are **not** — and cannot be —
implemented as k6 thresholds; they must come from Render/Atlas dashboards
(or an APM) for the same time window as the run:
- Memory continuously increasing during soak tests
- CPU exceeding sustainable limits
- Database connection-pool exhaustion
- Database write inconsistencies at the storage layer (as opposed to the
  application-visible duplicate-row inconsistencies `helpers/assertions.js`
  *does* detect by re-reading data after a write)

Treat a soak run that "passes" on `thresholds/performance.js` but shows a
climbing Render memory graph as a failure — the k6 exit code alone is not
the full picture for soak tests specifically.

## Running against staging or production

Nothing above ever targets anything but `localhost:5050`. To point at another
environment:
```bash
k6 run -e K6_ENV=staging -e K6_BASE_URL=https://your-staging-host/api/v1 performance/scripts/smoke.js
k6 run -e K6_ENV=production -e K6_BASE_URL=https://your-render-app.onrender.com/api/v1 performance/scripts/smoke.js
```
`config/base.js` **refuses to run** with `K6_ENV=production` unless
`K6_BASE_URL` is passed explicitly — there is no default production URL to
fall back to.

Before ever doing this against the real backend: get explicit sign-off.
Per project notes, the production backend runs on Render against a
**free-tier MongoDB Atlas cluster** serving real schools — `load`/`spike`/
`stress`/`soak` at the documented VU counts (up to 500-750) risk exhausting
Atlas's connection limit or Render's resources for real users. Start with
`smoke.js` only, and only run heavier profiles against production with
explicit, scoped approval — this is a hard-to-reverse, shared-system action,
not a routine one.

## CI wiring (not set up yet)

Out of scope for this pass — no `.github/workflows` changes were made. The
intended shape, to wire up when ready:
- **Every PR**: `k6 run performance/scripts/smoke.js` — fail the check on
  non-zero exit.
- **Every merge to `main`**: `k6 run performance/scripts/load.js`, then
  `node performance/scripts/compare-benchmark.js load`.
- **Before production deploy**: the full suite (smoke, load, spike, stress,
  a shortened soak), gating the deploy job on all of them passing.

This needs a CI-reachable target (a staging deployment or an ephemeral
server + DB spun up in the workflow) — the framework doesn't assume one
exists.

## Finite fixture pools deplete under sustained runs

`payableFeeRecords` in the seed fixture (~350 records at the default seed
scale) is a **consumable** pool — every successful payment moves a record
from pending/overdue to paid. A short smoke/load run barely dents it, but a
multi-minute sustained run (validate-50-users.js's 3-minute hold, or any
soak run) can exhaust it, after which further payment attempts correctly
get rejected with `400 "This fee record is already fully paid"`. This
showed up in this session's runs as an apparent `http_req_failed` threshold
breach that was actually just this — confirmed via the server's own logs,
not a bug. Re-run `npm run seed:perf-test-data -w apps/server` between long
runs to refresh the pool, or raise `PERF_STUDENTS_PER_TEACHER` so the pool
outlasts the run.

## Known ceiling (local execution)

A laptop dev server plus whatever local MongoDB it's pointed at is not
representative production infrastructure. Expect the 250/500-VU stages of
`load.js`/`stress.js` to reveal *this machine's* ceiling — CPU contention
with everything else running locally, single-instance Node, a non-Atlas
local Mongo's connection defaults — rather than a limit inherent to the
application architecture. The Final Certification conclusions in this
repo's audit notes are scoped accordingly: they answer "does this hold up
locally," not "does this hold up on the real Render+Atlas infra," which
would require the staging/production runs this session explicitly deferred.
