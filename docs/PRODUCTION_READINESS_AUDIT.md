# SchoolOS Production Readiness Audit
Audit date: 2026-07-28. Scope: full platform (backend, database, frontend, auth/security, background jobs, deployment/infra). Read-only audit — no code changed as part of this pass.

## How to read this
Findings are grouped by severity across all six audit areas, then by area for reference. Each item has file:line evidence, impact, and fix direction. This is the basis for a phased Phase 2 implementation — see the priority order at the bottom.

---

## CRITICAL — fix before any further production usage

1. **Live production MongoDB credentials committed to git** — `apps/server/.env.example:6` contains a real Atlas username/password (tracked in git, unlike `.env`). Anyone with repo access can connect directly to prod. **Action: rotate the Atlas credential now, replace `.env.example` with a placeholder.**
2. **No MongoDB transactions anywhere** — `grep -r "startSession\|withTransaction"` returns zero hits. Fee payment (`fee.service.ts:239-264`) and enquiry→student conversion (`enquiry.service.ts:181-193`) each do two non-atomic writes; a crash between them leaves money collected with no ledger update, or an orphaned student record.
3. **Dev-only admin-seed endpoint gated by env-check, not route registration** — `auth.routes.ts:17` + `auth.controller.ts:67`: `POST /auth/seed` creates/resets `admin@schoolos.app` (password `Admin@123`) for any `schoolId` in the body, guarded only by a runtime `NODE_ENV !== 'development'` check. If `NODE_ENV` is ever unset on a deploy, this is unauthenticated tenant takeover.
4. **Synchronous AI calls block the request thread** — marks photo/voice extraction (`marks-extraction.service.ts:188-284`), principal assistant chat (`principal-assistant.controller.ts:8-14`), and report-card AI remarks (`report-card.service.ts:198-205`) all `await` OpenAI/Whisper directly inside the HTTP handler (2-10s+, up to ~60s for chained voice extraction). At 50+ concurrent users this ties request threads and DB-pool connections to third-party API latency — the single biggest scalability risk found.
5. **No job queue infrastructure at all** — no BullMQ/Bull/Agenda/Redis anywhere. The only background mechanism is one hand-rolled in-process worker pool (`bulk-processor.ts`) for WhatsApp sends, explicitly non-durable across restarts. AI calls (#4) have no equivalent.

## HIGH

6. **Sequential N+1 loop sending notifications to teachers** — `notification.service.ts:100-124`: 3 sequential DB round-trips per teacher, fully serial (~120 calls for 40 teachers).
7. **Report-card class rank/average computed with per-student sequential queries** — `report-card.service.ts:98-113`, called on every report-card generate; should be one aggregate.
8. **Automation webhook auth defaults to open** — `AUTOMATION_WEBHOOK_SECRET` is optional (`env.ts:15`); if unset, `POST /automation/webhook` accepts unauthenticated status/result mutations for any job.
9. **Both access + refresh tokens stored in `sessionStorage`** (`api.ts:25`, `AuthProvider.tsx:44-64`) — JS-readable; XSS = 7-day session hijack via the refresh token, not just 15 minutes.
10. **No role restriction on fee payment write routes** — `fee.routes.ts:8-22`: any authenticated role (not just admin/accountant) can record/alter payments; only `DELETE` is role-gated.
11. **Sequential 5-call-per-slot timetable sync with no transaction** — `teacher-timetable.service.ts:47-79`; class-side and teacher-side timetables can desync on a crash mid-loop.
12. **`maxPoolSize`/`minPoolSize` not configured on the Mongo connection** (`database.ts:16-20`) — no ceiling to stop one heavy endpoint from starving others; no floor so bursts after idle pay full connection-latency.
13. **`.env.example` credential aside, no committed secrets elsewhere** — confirmed clean, listed here only as the boundary of finding #1.
14. **Live production DB credentials — see #1** (cross-referenced, infra area).
15. **Single Render instance, no IaC, Ops Center metrics are in-memory (reset on every deploy/restart, don't aggregate across instances)** — single point of failure for both the app and its own observability.
16. **No compression middleware on the Express API** — `app.ts` never applies `compression()`; if Render serves Express directly, all JSON responses are uncompressed.
17. **Atlas tier appears to be free/shared (M0), not the M10 the internal docs assume** — free/shared tiers have low practical throughput/IOPS ceilings, a real risk at 50+ concurrent users.
18. **No global server-level request/keep-alive timeouts** (`server.ts`) — Node defaults apply; nothing bounds a stalled client connection.
19. **Two frontend polling hotspots**: unbounded/unpaginated internal-messages list polled every 20s by every logged-in user (`internal-messages.api.ts:13`, `useInternalMessages.ts:16-23`); Ops Center dashboard fires ~10 polling queries every 5-10s (`useOpsData.ts:5-101`), ~70+ req/min per open admin tab.

## MEDIUM

20. Bulk payroll generation loops sequentially per-employee (`payroll.service.ts:139-146`) instead of batching.
21. AuditLog collection has no TTL/retention policy — unbounded growth over time (`audit.model.ts:218-236`).
22. `User.employeeId`/`Employee.userId`/`teacherId` join keys are unindexed plain strings.
23. Notification collection lacks a plain `schoolId` index for future school-wide queries.
24. Handful of list endpoints (`internal-message.repository.ts`, `leave-request.repository.ts`, `class-teacher.repository.ts`, `workflow.repository.ts`) have no defensive `.limit()`.
25. No per-request correlation/request IDs in logging — hard to trace a single user's request path under concurrent load.
26. Fee payments and admission creation have no client-supplied idempotency key — only unique-index retry on receipt-number collision; a genuine double-click can still create two distinct payment records.
27. Integration/webhook/API-key repositories are tenant-unscoped at the query level; correctness currently relies on manual post-fetch `schoolId` checks in every service — a footgun for future edits (no exploitable bug found today).
28. Bearer-token-only login rate limiting is IP-keyed only — a distributed attacker can still brute-force one account across many IPs.
29. Health check verifies DB connect state but not connection-pool saturation.
30. Documentation (`09_Operations_Guide.md`) describes a VPS+Docker+Nginx+M10 topology that doesn't match the actual Render/Vercel deployment — runbook is unreliable for incident response.
31. n8n webhook dispatch has no retry/dead-letter handling — a failed POST silently drops with no re-send.
32. No list virtualization anywhere in the frontend — acceptable today since most lists are server-paginated (≤200 rows), but the unbounded message list (#19) and an uncapped payment-timeline render have no ceiling.
33. `refetchOnWindowFocus: true` set globally with no override on expensive dashboard queries — focus-cycling causes refetch bursts.

## LOW
34. `gcTime` not overridden (defaults to 5 min) — minor UX tax on long-lived sessions, not a correctness bug.
35. A few un-memoized sort/filter calls in `TeacherDashboard.tsx` and an un-memoized context value in `LanguageContext.tsx` — negligible today, worth cleaning as those surfaces grow.
36. CORS localhost-bypass has no `NODE_ENV` guard (low risk, browser-enforced origin anyway).
37. Seed scripts have hardcoded throwaway passwords (`Test@123` etc.) — fine as long as unreachable via any prod HTTP route (confirm).
38. Text-search indexes add write-amplification alongside compound indexes — fine, just monitor index count (Student already at 8 of Mongo's 64 cap).

## What's already solid (no action needed)
- Controller → service → repository separation is consistently followed; Zod validation at the service layer across the board.
- Centralized error handling (`errorHandler.ts`) never leaks raw stack traces to clients.
- `helmet()`, CORS allow-list, and rate limiting (`apiLimiter`/`authLimiter`) applied globally.
- Attendance schema/indexes are the reference-quality example: flat per-student-per-date doc, upsert-safe unique index, correctly scoped compound indexes.
- WhatsApp/SMS bulk sends are correctly fire-and-forget with an 8-worker pool and per-call timeouts (8-30s across all providers) — the pattern the AI calls (#4) should be migrated to.
- Audit logging and request metrics are already non-blocking (fire-and-forget / in-memory counters).
- React Query config (`staleTime: 30s`, retry+backoff, mutation invalidation) is sound; all sampled money/attendance mutation forms correctly disable their submit button while pending.
- Route-level code splitting (`lazyPage()`) applied consistently across 149 routes, with a stale-deploy auto-reload guard already in place.
- File uploads use memory storage + MIME whitelist + size caps, stored as base64 — no path-traversal surface.
- JWT: 15m access / 7d refresh with DB-checked `tokenVersion` giving real server-side revocation on logout/password reset.

---

## Recommended fix order (Phase 2)

**Batch 1 — Security emergencies (do first, small diffs):** ✅ DONE 2026-07-28
1. ✅ `.env.example` placeholder fixed — **you still must rotate the actual Atlas password in the Atlas dashboard**, the leaked credential works until you do (#1)
2. ✅ `/auth/seed` route no longer registered outside `NODE_ENV=development` (`auth.routes.ts`)
3. ✅ `AUTOMATION_WEBHOOK_SECRET` now required in production — server refuses to start without it (`config/env.ts`)
4. ✅ Fee payment/create/update routes now require `admin`, `accountant`, or `reception` role (`fee.routes.ts`) — delete remains admin-only as before

Typecheck passed after these changes (`npx tsc --noEmit` clean). Not yet load-tested or covered by new automated tests.

**Batch 2 — Data integrity (moderate diffs, high value):** ✅ DONE 2026-07-28
5. ✅ Fee payment (create payment + apply balance) and enquiry→student conversion (create student + mark enquiry converted) now run inside `mongoose.startSession().withTransaction()` — a crash mid-write rolls back the whole operation instead of leaving a half-applied state (#2). Both `fee.repository.ts`/`fee.payment.repository.ts` and `student.repository.ts`/`enquiry.repository.ts` methods take an optional `session` param now.
6. ✅ Fee payment recording accepts an optional client-generated `idempotencyKey` (`fee.payment.model.ts` unique+sparse index, `fee.service.ts` short-circuits to return the original payment on replay). `RecordPaymentModal.tsx` now mints one via `crypto.randomUUID()` per fee record and sends it on every submit (#26). Bulk payment and admission-creation idempotency were **not** covered in this batch — bulk payment has no single receipt to key on (multiple payments per call), and admission creation already has the receipt-number-style duplicate-admission-number retry; revisit if double-submission on either is observed in practice.
7. ✅ `maxPoolSize: 50`, `minPoolSize: 5`, `waitQueueTimeoutMS: 10000` added to the Mongo connection (`database.ts`) (#12)

Typecheck passed on both `apps/server` and `apps/web` after these changes. No automated test suite exists in this repo to run beyond typecheck — these transaction paths (fee payment, enquiry conversion) should get manual/QA verification before relying on them under real concurrent load, since Atlas transactions were not previously exercised anywhere in this codebase.

**Batch 3 — Scalability under 50+ concurrent users (larger diffs):** ✅ DONE 2026-07-28 (partial — see deferred items)
8. ✅ Marks AI extraction (photo + voice, the two slowest AI calls — voice chains Whisper→GPT, up to ~60s) moved off the request thread. User chose the **in-process job pattern** (no new infra/cost) over BullMQ+Redis, mirroring the existing `bulk-processor.ts` convention: new `AiExtractionJob` model/repository (`marks/ai-extraction-job.{model,repository}.ts`, 6h TTL), `marksExtractionService.enqueueExtractFromImage/enqueueExtractFromVoice` return a `jobId` immediately, `GET /marks/extract/jobs/:id` polls for the result. Frontend `marksApi.extractFromImage/extractFromVoice` poll internally (`pollExtractionJob`, 1.5s interval, 90s timeout) so the function signatures — and every call site (`useMarks.ts`, `MarksEntryPage.tsx`) — are unchanged.
   - **Deferred, not done**: `extractFromTranscript` (live in-browser dictation) stays synchronous — it already skips Whisper and converting it would add polling latency to what's meant to feel instant. Report-card AI remark generation (`report-card.service.ts`) and principal-assistant chat (`principal-assistant.controller.ts`) were **not** converted — the former already has a non-fatal fallback on AI failure (lower urgency), the latter is a conversational UI where a poll-based rewrite is a worse fit than SSE streaming; both are good candidates for a focused follow-up.
9. ✅ N+1 batching: teacher notifications (`notification.service.ts` — batch `$in` lookups replace per-teacher sequential queries), report-card class stats (`report-card.service.ts` — one `findByClassExam` query instead of one `findByStudentExam` per student), teacher-timetable sync (`teacher-timetable.service.ts` — per-call class-timetable cache instead of re-fetching per changed slot), payroll bulk generation (`payroll.service.ts` — 8-way concurrent worker pool instead of fully sequential).
10. ✅ `compression()` middleware added (`app.ts`); `keepAliveTimeout`/`headersTimeout` set on the HTTP server (`server.ts`) above Render's load-balancer idle timeout.
11. ✅ Internal-messages poll interval 20s → 45s; Ops Center poll intervals 10s/5s → 20s/10s.

Typecheck passed on both `apps/server` and `apps/web`.

**Batch 4 — Hardening:** 🔶 IN PROGRESS 2026-07-28 — biggest/riskiest item done and verified live; rest not started
12. ✅ **Refresh token moved to an httpOnly cookie** (#9), done and manually verified end-to-end in a live local login (see below) — the highest-risk change of all four batches, since it touches login/refresh/logout for every user.
   - Backend: `lib/auth-cookies.ts` (`setAuthCookies`/`clearAuthCookies`/`getRefreshTokenFromRequest`), `middlewares/csrf.ts`. `auth.controller.ts`, `recovery.controller.ts` (`loginWithPin`) set the cookie instead of returning `refreshToken` in the JSON body; `/auth/refresh` reads the cookie and no longer accepts a body token. `cookie-parser` added; CORS `allowedHeaders` extended with `X-CSRF-Token`.
   - **CSRF approach deliberately is *not* a double-submit cookie** — first implementation attempt used one, but it's broken for this deployment: frontend (fnicschool.com) and backend (onrender.com) are different domains, so frontend JS can never read a cookie the backend set (confirmed by testing — `document.cookie` was empty after login). Switched to the **custom-header defense**: `verifyCsrf` just requires *any* `X-CSRF-Token` header to be present on `/auth/refresh`. This works because a plain HTML form (classic CSRF) can't attach custom headers, and a script-based cross-origin request needs a CORS preflight first, which `app.ts`'s strict origin allowlist already blocks for non-approved origins.
   - Frontend: `services/api.ts` (`withCredentials: true`, refresh call sends the header, all `sessionStorage` refreshToken reads/writes removed — only `accessToken` remains client-side), `auth.api.ts`, `recovery.api.ts`, `AuthProvider.tsx`. `packages/types` `LoginResponse` no longer has `refreshToken`.
   - **Verified live**: seeded a throwaway internal test account, ran a real login through the UI, confirmed via direct fetch calls that (a) `/auth/refresh` succeeds with the cookie + CSRF header and returns no `refreshToken` in the body, (b) the same call returns 403 without the CSRF header, (c) `/auth/logout` clears the cookie (subsequent refresh returns 401 "No refresh token"). Test account deleted afterward.
13. ⬜ Not started — Confirm/upgrade Atlas tier off free/shared (#17). Requires your Atlas dashboard access, not something verifiable from code.
14. ⬜ Not started — Second Render instance + persisting Ops Center's in-memory metrics to Mongo (#15). The instance count requires your Render dashboard/plan; persisting metrics is code-only and could be picked up independently.
15. ✅ **Batch 5 (2026-07-28)** — the safe, contained subset of remaining Medium/Low items:
   - AuditLog TTL index (18-month `expireAfterSeconds`, `audit.model.ts`)
   - Missing indexes added: `User.employeeId`, `Employee.teacherId`/`userId`, `Notification.schoolId`
   - Defensive `.limit()` added on `findPendingAcknowledgment` (internal messages, 100) and `findPending` (leave requests, 200) — the two that could genuinely grow unbounded over a school's lifetime; `classTeacherRepository`/`workflowRepository` skipped since those are naturally bounded by class-section/workflow-catalog cardinality
   - **Tenant-scoped the integration/webhook/API-key repositories at the query level** — `findById` on all three now takes `schoolId` and queries `{_id, schoolId}` directly instead of relying on every call site remembering to check `existing.schoolId !== ctx.schoolId` afterward. Updated every call site in `integration.service.ts`, `sync.service.ts`, `webhook.service.ts`, `api-key.service.ts` (~14 sites) — typecheck confirmed nothing was missed, since the compiler now requires the second argument everywhere.
   - **Per-account login rate limiting** — new `authAccountLimiter` (`rateLimiter.ts`) keyed on the submitted `identifier`, applied alongside the existing IP-keyed `authLimiter` on `/auth/login` only (not `/login-pin`, which has no `identifier` field). Closes the gap where a distributed attacker spraying attempts across many IPs wasn't slowed down at all.
   - **Health check now verifies responsiveness, not just connect state** — `health.controller.ts` does a 2s-bounded `db.admin().ping()`; a saturated/stalled-but-"connected" instance now correctly reports unhealthy instead of passing.
   - **n8n webhook dispatch now retries** — new `lib/retry-post.ts` (3 attempts, exponential backoff), used by both `n8n-automation.provider.ts` and `communications/n8n.service.ts`. A transient blip no longer silently drops the dispatch.
   - **CORS localhost bypass now dev-only** — guarded behind `NODE_ENV !== 'production'` (`app.ts`).
   - **Ops Center polling**: added `refetchOnWindowFocus: false` to all 9 interval-polled queries in `useOpsData.ts` — they already refetch on a timer, so window-focus refetch was pure redundant burst risk on top of that.
   - **Stale ops docs**: added a prominent warning banner to `09_Operations_Guide.md` rather than rewriting it — the actual Render/Vercel deployment specifics (monitoring tools, backup cadence, etc. actually configured) aren't verifiable from code, so a full rewrite risked presenting more unverified claims as fact. Points to this audit doc as the code-verified source instead.
   - **Not done in Batch 5** (lower priority / bigger scope, still open): correlation/request IDs in logging, Ops Center in-memory metrics → Mongo persistence, frontend list virtualization, `gcTime` overrides, a few un-memoized frontend values, confirming seed scripts are unreachable in prod, `OPS_CENTER_MANUAL.md` (only `09_Operations_Guide.md` was flagged).

Typecheck passed on `apps/server` after every change in this batch (web app untouched except the Ops Center hook, also typechecked clean).

Not started yet: load-testing scripts (k6), before/after benchmarks, full deployment checklist — these depend on which batches you want implemented first, since benchmarking only makes sense against the fixed code.
