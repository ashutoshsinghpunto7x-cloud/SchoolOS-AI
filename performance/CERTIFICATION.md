# SchoolOS ERP — Performance & Production Readiness Certification

**Date:** 2026-07-28
**Scope:** Local execution only (`http://localhost:5050`, Docker-hosted single-node MongoDB replica set standing in for Atlas), against an isolated `PERF_TEST_SCHOOL` tenant. No staging or production environment was exercised — see [performance/README.md](README.md) for why, and for what a staging/production run would still need to confirm.
**Tests run:** `smoke.js` (×2), `load.js` full 10→500 VU ramp (×2), a focused fixed-50-VU validation (`validate-50-users.js`, ×2 to get a clean measurement after removing a test-harness confound). Reports and raw JSON are in `performance/reports/` and `performance/benchmarks/`.

---

## 1. What was actually measured

### 1.1 Smoke test (20 VUs, one pass through all 10 workflows)
- **Correctness:** 100% of functional checks passed after fixes (98.91% including the login-focused scenario's intentionally repeated logins). Zero HTTP 500s, zero duplicate attendance rows, zero duplicate fee payments, zero detected race conditions.
- **Latency:** `http_req_duration` avg 530ms / p95 1.45s / p99 ~1.5–2.0s — **fails** the framework's own <500ms avg / <1000ms p95 bar, even at trivially low concurrency (20 VUs).
- **Login specifically:** p95 1.3–2.06s across runs — consistently the single slowest endpoint measured.

### 1.2 Full load ramp — 10 → 25 → 50 → 100 → 250 → 500 total concurrent users (20 min)
First run surfaced a **test-harness confound**, not a backend bug: every VU logged in fresh every iteration against only 27 seeded accounts, exhausting the per-account login rate limiter (`authAccountLimiter`) — 676,305 of 684,293 requests were legitimate `429`s, correctly rejecting excess login attempts. Fixed by caching tokens per VU (`helpers/auth.js`'s `loginCached`), matching how real users actually behave (log in once, stay logged in), not by loosening any server-side limit.

After the fix, re-running the full ramp still showed severe degradation at the higher tiers (250–500 VUs): `http_req_failed` 77.27%, successful-request tail latency (`expected_response:true`) climbing to p95 5.71s / p99 14.18s / max 22.84s, some iterations exceeding the 30s per-request timeout. **Zero 500s, zero 429s, zero duplicate-write or race-condition detections** even under this collapse — the system fails by getting slow/unavailable under extreme concurrency, not by corrupting data. This level (250–500 concurrent) is well beyond what this session was scoped to validate as a real target; see §4.

### 1.3 Focused, clean measurement: exactly 50 concurrent users, held 3 minutes
This is the run that directly answers the mandatory question. Server was restarted immediately before the run to clear any residual in-memory rate-limiter state from prior runs.

| Metric | Result | Threshold | Pass? |
|---|---|---|---|
| `http_req_duration` avg | 206.7ms | <500ms | ✅ |
| `http_req_duration` p95 | 513.9ms | <1000ms | ✅ |
| `http_req_duration` p99 | 1.02s | <1500ms | ✅ |
| `http_500_count` | 0 | ==0 | ✅ |
| `http_429_count` | 0 | ==0 | ✅ |
| `duplicate_attendance_detected` | 0.00% | ==0 | ✅ |
| `duplicate_fee_payment_detected` | 0.00% | ==0 | ✅ |
| `race_condition_detected` | 0.00% | ==0 | ✅ |
| `db_write_inconsistency_detected` | 0.00% | ==0 | ✅ |
| `login_duration` p95 | **1.3s** | <1000ms | ❌ |
| `login_duration` p99 | **1.5s** | <1500ms | borderline |
| `http_req_failed` | 14.06% | <1% | ❌ (see below) |

**The `http_req_failed` line is not a scalability failure.** Cross-checked against the live server log for the exact run window: all 3,984 failed requests are `POST /fees/payment` returning `400 "This fee record is already fully paid"` — the app correctly refusing to double-charge a fee record once the test fixture's finite pool of ~350 payable records was exhausted by 3 minutes of sustained concurrent payment attempts. This is a **test-fixture capacity limit**, confirmed via server logs, not an application defect — and it's evidence *for* correctness (the anti-double-payment check held), not against it.

**The one real, reproducible finding: login p95 (1.3s) breaches its own 1s target at exactly 50 concurrent users**, consistent across every run in this session regardless of the rate-limiter confound. Root cause (confirmed by reading `auth.service.ts`): `bcrypt.compare()` at `SALT_ROUNDS=12`, on a single Node process with no clustering, serializes CPU-bound hashing work under concurrent login load.

---

## 2. Codebase scalability findings (full detail: agent audit earlier this session)

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Unanchored regex `$or` search (Students/Employees/Fees list & search) forces full collection scans on every list-page load | **Critical** | Confirmed by code read, not yet load-isolated |
| 2 | Fee receipt numbering uses count-then-increment inside a retry loop — serializes/aborts under concurrent payment writes | **Critical** | Confirmed by code read; consistent with payment-path being the first thing to show contention in this session's tests |
| 3 | `bcrypt` at cost 12 on a single Node process — CPU-bound, not horizontally spread | **High** | **Fixed in Session 2 (2026-07-29)** — cost lowered to 10, see §6 |
| 4 | Principal dashboard fans out to ~15–20 Mongo ops per request; `getBriefingSummary` duplicates the whole fan-out | **High** | Confirmed by code read; not yet fixed. The teacher-workspace dashboard had the same N+1 shape and was fixed in Session 2 (§6) — the same pattern (per-item `Promise.all` counts instead of one grouped aggregation) likely applies here too |
| 5 | Attendance bulk-mark issues one `findOneAndUpdate` per student via `Promise.all` instead of one `bulkWrite` | **Medium** | **Fixed in Session 2 (2026-07-29)** — converted to a single `bulkWrite`, see §6 |
| 6 | Rate limiter tuning/`NODE_ENV` interaction can confound load-test readings if not accounted for | **Medium (process risk, not a code bug)** | Directly encountered and fixed in this session's own test harness |
| 7 | `GET /students?class=&section=` used as the class roster returned wrong data in two k6 scenarios (`teacher.js`, `attendance.js`) — they were reading `GET /attendance/class/:class/:section` instead, which returns already-*marked* records, not the roster, so it read empty before anything was marked that day | **Test-harness bug, not an app bug** | **Fixed in Session 2 (2026-07-29)**, see §6 |
| 8 | `seed-perf-test-data.ts` hardcoded 4 sections × 6 classes = 24 class/section slots; seeding more than 24 teachers hit a duplicate-key crash on `ClassTeacherAssignment`'s unique index | **Test-harness bug, not an app bug** | **Fixed in Session 2 (2026-07-29)** — sections now generated to fit `TEACHER_COUNT`, see §6 |

Mongo connection pool (`maxPoolSize: 50`), compression/helmet middleware, and per-collection compound indexes for filtered (non-search) queries were all reviewed and found adequately configured — not bottlenecks in themselves, though the pool size (50) is worth revisiting once concurrency needs are validated beyond what this session covered.

---

## 3. Scores (0–100)

Scoring reflects **evidence gathered this session only**. Where no real evidence exists (frontend, staging/production infrastructure, most of security), the score is capped at a conservative mid-range with an explicit "unassessed" caveat rather than invented.

| Category | Score | Basis |
|---|---|---|
| **Backend (API layer)** | 62 | Real k6 evidence: correct under concurrency (zero 500s/duplicates/races up to 500 VUs), but login latency measurably breaches its own SLA at 50 VUs, and codebase audit found two Critical, unremediated bottlenecks (search scans, receipt-counter contention) not yet independently load-isolated. |
| **Database** | 58 | Connection pool and indexes reviewed and reasonable for filtered queries; the regex-search full-scan pattern and count-then-increment receipt logic are real, described defects. Replica-set transaction behavior (fee payments) confirmed correct and defect-free under load. |
| **Scalability** | 45 | 50 concurrent users: mostly fine, with one confirmed regression (login). 250–500 concurrent users: confirmed severe degradation (77% failure, multi-second tail latency) on this local single-process/single-container setup — unknown how much of that is inherent-to-the-app vs. inherent-to-this-laptop-as-a-load-test-rig (see §4). |
| **Reliability** | 70 | Zero data-corruption signals (duplicate writes, race conditions) across every test, including the worst-case 500-VU collapse — the system fails safe (slow/unavailable) rather than fails wrong (double-charges, double-marks-attendance). This is the strongest result in this report. |
| **Frontend** | Not assessed | Out of scope this session — no frontend load/rendering testing was performed. Do not treat any score here as evidence one way or the other. |
| **Infrastructure** | Not assessed (informed guess: 40) | Production runs on Render + a **free-tier MongoDB Atlas cluster** (per project notes) — this session deliberately never touched that environment. The local single-node Docker Mongo used here is not a stand-in for Atlas's actual connection limits, latency, or failover behavior. Treat the 250–500 VU collapse as informative about *a* ceiling, not necessarily *Atlas's* ceiling. |
| **Security** | Not scored | Out of scope — this was a performance audit, not a security review. `/code-review` or a dedicated security pass should assess auth/authz, input validation, and secrets handling separately. |
| **Maintainability** | 65 | Codebase was easy to navigate for this audit (clear service/repository/validation layering, informative comments); the two Critical findings are both narrow, well-isolated fixes (swap a query pattern, swap a counter strategy) rather than architectural rewrites. |
| **Overall Performance** | 55 | Weighted toward the concrete, reproducible findings: correct-but-slow at low concurrency, correct-but-collapsing at high concurrency. |
| **Production Readiness** | 48 | Not ready as-is for unconstrained traffic. Ready enough for a controlled pilot at low concurrency (see §4) once the login-latency fix lands, contingent on validating against the real Atlas-backed environment before any broader rollout. |

---

## 4. The mandatory question

> **Can SchoolOS reliably support 50 concurrent active users performing real-world operations simultaneously?**

**Qualified yes, with one confirmed exception, based on measured results — not assumption.**

At a clean, isolated, sustained 50 concurrent users:
- **Zero data-correctness failures** — no duplicate attendance marks, no duplicate fee payments, no detected race conditions, across every test in this session including the far more aggressive 500-VU run.
- **General workflow latency is good**: avg 207ms, p95 514ms, p99 1.02s — all within the framework's own thresholds.
- **Zero server errors (500s)** and **zero rate-limit rejections (429s)** at this concurrency level.
- **One confirmed regression: login is slow under load.** p95 1.3s / p99 1.5s, breaching the 1s p95 target — root-caused to synchronous-per-request `bcrypt` hashing (cost factor 12) on a single, non-clustered Node process (`auth.service.ts`, `server.ts`). Every other endpoint tested comfortably meets its latency bar; only the auth path does not.

So: **the system will not corrupt data or fall over at 50 concurrent users, but users will experience login taking over a second at that concurrency** — annoying, not catastrophic, and precisely diagnosed with a known fix (see Optimization Recommendations below).

**Next scaling bottleneck, in order encountered as concurrency rises further:**
1. **~50 users, right now:** login latency (bcrypt/single-process), as above.
2. **~100–250 users (this local rig):** general request latency starts climbing (p99 into multi-second territory) — consistent with the Mongo connection pool (`maxPoolSize: 50`) becoming a real constraint once concurrent in-flight DB operations approach that ceiling, compounded by the regex full-scan search endpoints (Critical finding #1) and the principal-dashboard 15–20-operation fan-out (finding #4).
3. **250–500 users (this local rig):** full collapse — 77% failure rate, tail latency in the tens of seconds. **This session cannot say how much of this ceiling is the application versus this specific laptop-as-a-load-generator-and-server-simultaneously setup and a single-node local Mongo container** standing in for a real Atlas cluster. That distinction requires a dedicated staging environment — explicitly out of scope this session per project decision (see README).

**Recommended immediate fixes, in priority order, with expected impact:**
1. Fix the regex `$or` search scans → biggest, broadest latency win across Students/Employees/Fees list pages; likely double-digit percentage reduction in DB load from list/search traffic. **Not yet fixed.**
2. Replace count-then-increment receipt numbering with an atomic counter → removes transaction contention/aborted-payment risk entirely under concurrent fee collection. **Not yet fixed.**
3. ~~Cluster the Node process (or reduce `bcrypt` cost factor)~~ → **Reduced `bcrypt` cost factor, Session 2 (2026-07-29).** Measured result: login p95 9.14s → 914ms at 100 concurrent teachers (see §6). Clustering the Node process (for true multi-core horizontal scale, not just faster hashing) is still an open infra recommendation — code-level fix alone doesn't add cores.
4. ~~Convert attendance bulk-mark to a single `bulkWrite`~~ → **Done, Session 2 (2026-07-29).** Measured result: save p95 4.64s → 995ms at 100 concurrent teachers (see §6).

---

## 5. What this certification does not cover

- **Frontend rendering/bundle performance** — not tested.
- **Real production infrastructure** (Render + Atlas free tier) — not tested; this session's local Docker Mongo is a stand-in with different connection-limit and latency characteristics.
- **Security** (authz boundaries, injection, secrets) — out of scope for a performance audit.
- **CI integration** — designed and documented (see README) but not wired up, per project decision this session.
- **Soak/endurance (multi-hour) behavior** — `soak.js` exists and is documented but was not run this session (would require re-seeding the fixture partway through per §"Finite fixture pools" in the README).

Before any production rollout, the load/spike/stress/soak suite should be re-run against a real staging environment backed by the actual Atlas tier the app will use, with explicit sign-off given production is a shared, real-schools-serving system on a free-tier database (see README's "Running against staging or production").

---

## 6. Session 2 (2026-07-29): 100-teacher validation, fixes applied

**Scope:** Same as Session 1 — local execution only (`http://localhost:5050`, Docker-hosted single-node MongoDB replica set), isolated `PERF_TEST_SCHOOL` tenant, no staging/production traffic. `.env` was temporarily pointed at the isolated local Mongo for every run and restored to the real Atlas connection string immediately after.

**New deliverables:** `scenarios/teacher-full.js` (the literal login→dashboard→...→logout workflow, one-shot per VU, with an explicit per-teacher pass/fail metric and post-save integrity checks), `scripts/validate-100-teachers.js` (exactly 100 distinct seeded teachers, one workflow each, simultaneously), `scripts/mixed-workload.js` (60 teachers + 20 receptionists + 10 admins + 10 principals concurrently). Both new scripts write a mechanically-generated `*-VERDICT.md` alongside the usual HTML/JSON/CSV report (see `helpers/report.js`'s `buildVerdictReport`) — see README for usage.

### 6.1 Test-harness bugs found and fixed before any real measurement was possible

- **Roster bug**: `scenarios/teacher.js` and `scenarios/attendance.js` were treating `GET /attendance/class/:class/:section`'s response as the class roster. That endpoint actually returns already-*marked* attendance records for the date — empty before anyone has marked anything that day — so the mark-attendance step had nothing to submit on a fresh day. Fixed to load the roster from `GET /students?class=&section=`.
- **Seed script scaling bug**: `seed-perf-test-data.ts` had a fixed pool of 4 sections × 6 class levels = 24 class/section slots. `ClassTeacherAssignment` has a unique index on `{schoolId, class, section}`, so seeding more than 24 teachers (e.g. `PERF_TEACHERS=100`) crashed with an `E11000` duplicate-key error on every attempt. Fixed to generate as many sections (`A`, `B`, ..., `Z`, `AA`, ...) as `TEACHER_COUNT` needs. Also added `PERF_RECEPTION`/`PERF_ACCOUNTANT`/`PERF_ADMIN`/`PERF_PRINCIPAL` env vars (previously hardcoded at 2/2/2/1) so `mixed-workload.js` could seed distinct accounts per role instead of many VUs sharing one login.

Both were harness defects, not application bugs — but they meant Session 1 never actually validated a 100-teacher (or any >24-teacher) scenario; the fixture couldn't be seeded at that scale until this session.

### 6.2 100 concurrent teachers, full literal workflow, before any code fix

First clean run against the fixed harness, 100 distinct teachers, each running login → dashboard → workspace → classes → attendance workspace → select date → student list → mark → save → verify → profile → logout exactly once, simultaneously:

- **Correctness: 100/100 teachers completed successfully, 2700/2700 checks passed.** Zero 500s, zero 429s, zero duplicate/missing/partial attendance saves, zero detected race conditions.
- **Latency thresholds failed badly**: login avg 5.61s / p95 9.14s / p99 9.63s; `teacher-workspace/me` avg 3.43s; `attendance/bulk` avg 3.37s / p95 4.64s; overall `http_req_duration` avg 2.08s / p95 6.26s / p99 9.12s. Whole-suite wall-clock: 20.2s for all 100 teachers to finish.
- This is the same `bcrypt`-under-concurrency mechanism Session 1 found at 50 VUs, now measured directly at 100 truly-simultaneous fresh logins (Session 1's cached-session scripts never exercised 100 concurrent *fresh* logins in one instant — this one does, since each teacher logs in exactly once).

### 6.3 Fixes applied and re-measured, same 100-teacher scenario

| Fix | File | What changed |
|---|---|---|
| `bcrypt` cost 12 → 10 | `auth.service.ts` | Still above OWASP's minimum recommendation. Existing cost-12 hashes keep verifying — bcrypt encodes cost in the hash string. Applied with explicit user sign-off given the security/performance trade-off. |
| Attendance bulk-mark: N `findOneAndUpdate` calls → 1 `bulkWrite` | `attendance.repository.ts` | N was up to 200 (roster size) separate driver operations per save request; now one batched wire call plus one re-fetch (2 round trips total, was N+1). |
| `teacher-workspace/me`: per-entry `Promise.all(count, count)` → 2 grouped aggregations | `teacher-workspace.service.ts` | The old loop fired 2 count queries per *timetable entry* (period slot), not per distinct class — a teacher with 4 periods in one class/section fired 8 redundant count queries for what's really 1 distinct pair. Now: collect all distinct class/section pairs first, run exactly 2 aggregations total across all of them. |

**Before → after, same test, same 100 teachers, same machine:**

| Metric | Before | After | Change |
|---|---|---|---|
| `login_duration` p95 | 9.14s | **914ms** | ~10x — now passes the framework's own `<1000ms` bar |
| `POST /auth/login` avg | 5.61s | 869ms | ~6.5x |
| `GET /teacher-workspace/me` avg | 3.43s | 813ms | ~4.2x |
| `POST /attendance/bulk` avg | 3.37s | 722ms | ~4.7x |
| `POST /attendance/bulk` p95 | 4.64s | 995ms | ~4.7x |
| Overall `http_req_duration` avg | 2.08s | 342ms | ~6.1x |
| Overall `http_req_duration` p95 | 6.26s | 912ms | ~6.9x |
| Overall `http_req_duration` p99 | 9.12s | 980ms | ~9.3x — now under 1000ms |
| Whole-suite wall-clock (100 teachers) | 20.2s | 4.4s | ~4.6x |
| Correctness (workflow success rate) | 100% | 100% | unchanged |

Full reports: `performance/reports/validate-100-teachers-2026-07-28T15-59-37*` (before) vs. the run immediately following the `teacher-workspace.service.ts` fix (after) in the same directory.

**Still short of this validation script's stricter, literal per-endpoint bars** (login p95 <400ms, dashboard/roster/save p95 <500ms — see `scripts/validate-100-teachers.js`'s thresholds, tighter than this framework's general `thresholds/performance.js`). The residual gap is Mongo connection-pool queuing (`maxPoolSize: 50` in `config/database.ts`) and single-Node-process throughput under 100 truly-simultaneous requests — neither is a query-shape bug fixable by another code change; closing it needs either a larger connection pool (Atlas tier upgrade) or horizontal scaling (Node clustering / multiple Render instances). Not attempted this session — an infra/deploy decision, not a code change.

### 6.4 Open finding: not yet root-caused

A `mixed-workload.js` run (60 teachers + 20 receptionists + 10 admins + 10 principals, before the fixes in §6.3) showed 2–10% of teachers per run with a verify-step status mismatch: the right *count* of attendance rows came back (no missing/partial/duplicate rows), but a handful had the opposite status (`present`/`absent`) from what was submitted. Investigated and ruled out: cross-teacher class/section collisions (seed assigns each teacher a unique pair, confirmed), duplicate student IDs within one teacher's own roster (would show as a saved-count mismatch, which was not observed), and an obvious async bug in `attendanceService.bulkMark`/`attendanceRepository.upsert` (fully awaited, no shared mutable state). Not reproduced in the pure 100-teacher run (§6.2) — only appeared under the *mixed* role load. **Not re-tested after the §6.3 fixes; needs a dedicated follow-up** with correlated server-side request logging before being classified as a real data-integrity bug versus a load-test-harness artifact (e.g. k6 client-side response correlation under extreme queuing).

### 6.5 Updated mandatory question

> **Can SchoolOS safely support 100 teachers simultaneously performing Login → Dashboard → Attendance → Save Attendance → Logout in production?**

**No, not yet, but materially closer after this session's fixes — and still zero evidence of data corruption at any point.**

- **Correctness held at 100/100 teachers, 0 errors, across every run this session** — before the fixes, after the fixes, and at the higher 20-VU smoke concurrency. This is the strongest, most consistent result across both sessions.
- **Latency improved 4–10x across every measured endpoint** after three targeted fixes (bcrypt cost, attendance bulkWrite, teacher-workspace aggregation), cutting the time for 100 teachers to complete the full real workflow from 20.2s to 4.4s wall-clock.
- **Still failing this script's strict literal per-endpoint thresholds** (bars tighter than the general framework's), and the one open, unresolved finding (§6.4) needs to be run down before a clean sign-off — a status mismatch under load is exactly the class of bug this framework exists to catch, even though it wasn't reproduced in the cleanest (pure-teacher) scenario.
- **Still local-only.** Everything in this session, like Session 1, ran against a laptop dev server and a local single-node Mongo container standing in for Render + Atlas free tier. None of these numbers are a substitute for a staging run against the real infrastructure.

**Recommended next steps, in order:**
1. ~~Re-run `mixed-workload.js` after the §6.3 fixes~~ → **Done, Session 3 (2026-07-29)** — see §7. The §6.4 finding was root-caused: not a data bug.
2. ~~Fix the regex `$or` search scans and receipt-numbering contention~~ → **Receipt-numbering fixed, search scans investigated, Session 3 (2026-07-29)**, see §7.
3. Decide on connection-pool sizing vs. Node clustering to close the remaining gap to the strict per-endpoint thresholds — an infra decision, not a code fix. Still open.
4. Run the full suite (this scenario plus `mixed-workload.js`, `stress.js`, `soak.js`) against a real staging environment backed by the actual Atlas tier before any production sign-off — still not done, per all three sessions' scope decisions.

---

## 7. Session 3 (2026-07-29): remaining Critical fixes, security pass, §6.4 root-caused

**Scope:** Same as Sessions 1-2 — local only, isolated `PERF_TEST_SCHOOL` tenant, local Docker Mongo, no staging/production traffic.

### 7.1 Fee receipt numbering — fixed

Session 1 finding #2 (`fee.payment.repository.ts`'s `generateReceiptNumber` used `countDocuments()+1`, a classic read-then-write race under concurrent payments). Replaced with the codebase's existing atomic `Counter` model (`$inc`, already used elsewhere for employee IDs) — see `nextSequence()` in `apps/server/src/lib/counter.model.ts`. Seeded from the prior `countDocuments()` total on first use so already-issued numbers are never reused. The retry-loop that used to wrap this in `fee.service.ts`'s `recordPayment` was removed — it was inside a `session.withTransaction()` callback, so an E11000 mid-transaction poisoned the rest of the callback and a "retry" was guaranteed to fail again anyway; the atomic counter makes the whole retry unnecessary.

### 7.2 Regex full-scan search — investigated, not further changed

Confirmed via `.explain("executionStats")` against a 10,000-student seeded tenant: the existing `{schoolId, isDeleted, createdAt}` compound index **is** used (`IXSCAN`, not `COLLSCAN`) — Session 1's "Critical, full collection scan" framing was not quite right. The real cost is a full **per-school** scan (`totalDocsExamined` == that school's entire non-deleted row count) to apply the unanchored substring regex, since no index can satisfy arbitrary-substring matching. Given the product requirement to preserve exact current search behavior (any substring, anywhere in the field — a deliberate choice made this session over switching to a text index or anchoring ID-like fields, which would have changed user-visible search results), this is close to the practical ceiling without changing search semantics or adding paid infra (Atlas Search / trigram indexes). Cost is proportional to each school's own row count (264ms at 10k students in this local test), not the whole database — a real concern only for an unusually large single school, not a silent global scan.

### 7.3 Security pass — one IDOR fixed, one hardening fix, rest verified clean

Ran a targeted audit (BOLA/IDOR, mass assignment, CSRF, injection, JWT/session abuse, recovery-flow enumeration) across the repository/service layers. Findings:
- **Fixed (High):** `recovery.service.ts`'s `forgetDevice` deleted a remembered-device record by `deviceId` alone, no ownership check — any authenticated user who learned another user's `deviceId` could forget their device. Now scoped to `{deviceId, userId}`.
- **Fixed (Medium, defense-in-depth):** `token.service.ts`'s `jwt.verify` calls didn't pin `algorithms: ['HS256']`. Not currently exploitable (only symmetric secrets exist anywhere in this codebase) but now explicit.
- **Verified clean:** BOLA/IDOR across students/fees/employees/attendance/marks/enquiries/integrations/webhooks/API-keys repositories (all scope by `schoolId` from verified JWT, never from request body); mass assignment (Zod `.strict()` schemas, no raw `req.body` spreads into Mongoose updates); injection (no `$where`/`eval`/string-built aggregations; the one `child_process.spawn` call uses an argument array, not a shell); recovery-request submission correctly avoids account enumeration (generic response regardless of match).
- **Noted, not changed:** `tokenVersion` revocation (logout-everywhere, password reset) is only checked on `/auth/refresh`, not on every access-token request — a still-valid 15-minute access token survives forced revocation for its remaining lifetime. This is a reasonable, common tradeoff for a short-lived access token, not a bug, but worth knowing.

### 7.4 §6.4 root-caused: the mixed-workload "status mismatch" was a test-harness bug, not a data-integrity bug

This was the most important finding this session. Re-running `mixed-workload.js` surfaced (after fixing two unrelated harness bugs first — see below) a severe, cleanly-reproducible 82% rate of teachers seeing attendance statuses on verify-read that didn't match what they submitted, with the *exact* two-way swap pattern (student A's submitted status ends up on student B's record and vice versa).

**Investigation, in order:**
1. A sequential, single-request, non-concurrent reproduction of the exact same write+verify produced **zero** mismatches — proving the bug requires real concurrency.
2. A pure-100-teacher concurrent run (`validate-100-teachers.js`, no other roles) produced **zero** mismatches — proving it's specific to the *mixed*-role scenario, not concurrent attendance-writing in general.
3. Direct MongoDB queries (bypassing the API entirely) confirmed the stored documents themselves held the "swapped" values — ruling out a stale-read/cache artifact on the verify step.
4. Temporary server-side debug logging of every `bulkMark` request body, cross-referenced against a k6 diagnostic script dumping `exec.vu`/`exec.scenario`, revealed the actual mechanism: **`mixed-workload.js`'s `teacher()`/`receptionist()`/`admin()`/`principal()` functions computed each VU's assigned seeded account via `exec.vu.idInTest % list.length`.** `idInTest` is unique across the *whole* k6 test run, not scoped per scenario — when 4 scenarios run concurrently, k6 interleaves VU-ID allocation across them, so a single scenario's IDs are **not** a clean contiguous `1..vus` block (empirically: the 60-VU teacher scenario actually received IDs like `{1..51, 53..58, 61..63}`, with 52/59/60 going to other scenarios and 61-63 making up the shortfall). `% 60` on that scattered set collided for 3 teachers (each run twice, by two different VUs, each submitting independently-randomized attendance for the same class) while silently skipping 3 others. Two different VUs, both authenticated as the same teacher, raced to submit different attendance for the same class/section/date — whichever `bulkWrite` landed last per-student determined the final value, which is completely correct last-write-wins behavior for two genuinely concurrent submissions under one identity. **The application has no bug here.**

**Fix:** `mixed-workload.js` now uses `exec.scenario.iterationInTest` (confirmed via diagnostic to be a dense, collision-free 0-indexed counter scoped to each scenario's own name) instead of `exec.vu.idInTest`.

**Two unrelated pre-existing harness bugs found and fixed en route** (both in `performance/helpers/randomData.js`'s `todayIso()`):
- It computed the date in UTC (`toISOString().split('T')[0]`), while the server's own `todayString()` (used by the new same-day attendance-edit-cutoff feature, added since Session 2) computes it in Asia/Kolkata. Near UTC midnight these disagree by a full day, which used to be harmless before the cutoff feature existed and now hard-fails every attendance write.
- The first fix (`toLocaleDateString(..., {timeZone: 'Asia/Kolkata'})`) silently failed under k6: k6 runs on goja, a Go-based JS engine with no real `Intl`/timezone data, so locale/timeZone options are ignored and it returns the engine's own default format (`MM/DD/YYYY`) regardless of arguments — which then failed the server's strict `YYYY-MM-DD` schema. Replaced with plain UTC-offset arithmetic (`Date.now() + 5.5h`, then read `getUTCFullYear/Month/Date` of the shifted timestamp), which needs no `Intl` support and works identically in Node and goja.

**Re-confirmed clean, fresh-seed run after all three fixes:** 100% checks passed, 0% `http_req_failed`, 100% `teacher_workflow_success`, and every data-integrity metric (`duplicate_attendance_detected`, `missing_attendance`, `partial_attendance_save`, `race_condition_detected`, `db_write_inconsistency_detected`) at 0%. Only remaining threshold failures are `http_req_duration`/`login_duration` — latency, not correctness, consistent with the already-documented open findings (§1 finding #4, connection-pool sizing).

### 7.5 Shortened soak run (15 minutes, not the default 4 hours)

`soak.js` had never been run in any prior session. Ran a 15-minute hold (`K6_SOAK_MINUTES=15`, ~52 VUs across teacher/login/admin/principal/receptionist/reports/notifications scenarios, ~245k requests total) against the isolated local server/Mongo.

- **No memory leak signal**: server memory (`memoryMb`, logged per request) rose from ~200MB to a ~490–520MB working-set plateau in the first few minutes as connections/caches filled, **stayed flat** (not climbing further) for the sustained middle portion of the run, then dropped back to ~192MB once load ended — the shape of healthy behavior, not a leak. Caveat: 15 minutes is far short of the default 4-hour soak target; a slow leak could still be invisible at this timescale.
- **One genuine 500, not a fluke to dismiss**: `"Timed out while checking out a connection from connection pool"` on both `GET /auth/me` and `POST /attendance/bulk` at the same moment, ~106 seconds request duration. This is real, empirical confirmation of the connection-pool-sizing concern already flagged as an open finding (§1 finding #4, `maxPoolSize: 50`) — under sustained multi-scenario concurrent load the pool genuinely can exhaust and produce a hard failure, not just theoretical risk. Low frequency here (1 in ~245k requests) but a real failure mode worth the already-recommended fix (larger pool / Node clustering) before relying on this locally-measured ceiling in production.
- **Everything else is the already-documented account-exhaustion test-harness confound** (§1.2, Session 1): with only ~20 default-seeded accounts and continuous fresh logins across ~52 VUs for 15+ minutes, `authAccountLimiter` correctly rejected the excess with 429s (24,522 of them) — this is the rate limiter doing its job, not an app bug. A real soak run should seed proportionally more accounts (`PERF_TEACHERS`/etc.) or switch the soak scenarios to session-cached logins (`helpers/auth.js`'s `loginCached`, already used by `load.js`/`stress.js`) before the raw pass/fail numbers here are meaningful.
- **Zero data-integrity findings**: `duplicate_attendance_detected`, `duplicate_fee_payment_detected`, `db_write_inconsistency_detected`, `race_condition_detected` all 0% throughout, consistent with every other test this session and prior sessions.

### 7.6 Staging/Atlas run — still not attempted

Per all three sessions' scope decision, nothing here has ever targeted the real Render + Atlas free-tier production infrastructure. `performance/README.md`'s "Running against staging or production" section documents how (`K6_ENV=production K6_BASE_URL=...`) and the explicit sign-off requirement — no code or config changes were made toward this in Session 3; it remains a deliberate, not-yet-taken next step requiring the user's explicit approval given it's a shared, real-schools-serving system on a free-tier database.

### 7.7 Updated status

**Zero data-integrity bugs found across all three sessions**, now including the mixed-role scenario that Session 2 left as an open, unresolved question, and the soak run. The connection-pool-exhaustion risk flagged since Session 1 as theoretical is now empirically confirmed under sustained load (§7.5) — the single remaining unfixed code-level item is the principal-dashboard N+1 fan-out (§1 finding #4, not attempted this session); the pool-sizing/clustering decision remains an infra choice, not a code fix. Security was audited for the first time this session (previously explicitly out of scope) with one real IDOR fixed. Still not done, per all three sessions: a staging/Atlas-backed run (§7.6), frontend load testing, a full-length (4-hour) soak, CI wiring.
