# Ops Center — Developer Manual

Internal SOC-style admin dashboard for SchoolOS AI. This document exists so you (or anyone else) can pick up any Ops Center screen months from now and immediately know: what it shows, where the data really comes from, which endpoint feeds it, and what its known limitations are.

Audience: developers. Not user-facing documentation.

---

## 1. Access & routing

- Base route: `/ops` (and sub-routes below). Registered in [`apps/web/src/routes/index.tsx`](../apps/web/src/routes/index.tsx).
- Client-side role gate: `allowedRoles={['owner','super_admin','devops','developer','support']}`.
- Server-side gate: every `/ops/*` API route requires `authenticate` + `permit(PERMISSIONS.OPS_VIEW)` middleware (see [`apps/server/src/features/ops-center/ops.routes.ts`](../apps/server/src/features/ops-center/ops.routes.ts)). Role gating exists on both sides — never rely on the frontend check alone.
- All 14 pages are lazy-loaded (`lazyPage()` in `routes/index.tsx`), which auto-reloads once on a stale post-deploy chunk-load failure (see memory: chunk-load auto-reload).

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend framework | React 18.2 + `react-router-dom` v6 (`createBrowserRouter`) |
| Server state | `@tanstack/react-query` v5 — **all** Ops Center data fetching goes through hooks in `hooks/useOpsData.ts`. No Redux/Zustand. |
| Styling | Tailwind CSS utility classes, arbitrary hex values (`bg-[#0B0F14]`). No CSS modules, no styled-components. |
| Icons | `lucide-react` |
| Backend | Express 4.18, feature-folder pattern: `controller → service → repository` |
| DB | MongoDB (Atlas in prod) via Mongoose 8 |
| Validation | Zod (`ops.validation.ts`) |
| Logging | Winston, tapped by an in-memory ring buffer for the Logs screen |
| Auth | JWT (`authenticate` middleware) |

## 3. File map

```
apps/web/src/features/ops-center/
  theme.ts                    — dark "SOC" color tokens (independent of app-wide light/dark toggle)
  layouts/OpsLayout.tsx        — shell: sidebar + header + <Outlet>. Owns mobile drawer state.
  components/
    OpsSidebar.tsx             — nav list; slide-in drawer below `lg:`, static column at `lg:`+
    MetricCard.tsx             — the small stat tiles (label/value/sublabel)
    DataTable.tsx               — generic table, horizontal-scroll on narrow viewports
    StatusBadge.tsx             — colored dot + label (healthy/warning/critical/info/muted)
    ChangePasswordModal.tsx
  hooks/useOpsData.ts          — one React Query hook per screen; polling intervals live here
  api/opsApi.ts                — typed fetch functions + response types, one per endpoint
  pages/Ops*Page.tsx           — one file per screen (14 files)

apps/server/src/features/ops-center/
  ops.routes.ts                — route table, all behind authenticate + permit(OPS_VIEW)
  ops.controller.ts            — thin HTTP layer
  ops.service.ts                — business logic, alert evaluation, aggregation orchestration
  ops.repository.ts             — Mongo queries/aggregations
  ops.validation.ts             — Zod schemas for query params
  alert-state.model.ts          — Mongoose model: OpsAlertState (persisted ack/resolve state)

apps/server/src/lib/
  security-events.ts            — in-memory ring buffer (max 500) feeding Security Center
  log-buffer.ts                 — in-memory ring buffer (max 2000) feeding Logs, Winston-tapped
  error-events.ts               — in-memory ring buffer (max 500) feeding Error Monitoring
  render-client.ts              — thin client for the Render.com Deploys API, feeds Deployments
```

## 4. The most important fact about this dashboard

**Every screen is either backed by a real, live data source, or explicitly labeled otherwise in its own UI copy.** There is no fabricated/sample data anywhere. When something can't be measured yet (2FA status, device delivery receipts, alert-rule configuration), the screen says so instead of faking a number. Keep this invariant when you extend any screen — if you add a metric you can't actually compute, either compute it for real or show an honest "not available" state, don't hardcode a plausible-looking value.

The second most important fact: **three screens (Security Center, Logs, Error Monitoring) run on in-memory ring buffers inside the single Node process.** They reset to empty on every deploy/restart and do not aggregate across multiple instances if you ever scale horizontally. If you need historical retention across restarts, that requires a real persistence layer (e.g. a capped Mongo collection or a real log shipper) — it does not exist today.

## 5. Screen-by-screen reference

### 5.1 Dashboard — `/ops`
**File:** `pages/OpsDashboardPage.tsx` · **Endpoint:** `GET /ops/dashboard`

Shows: DB/API status badges, Platform Totals (Schools, Students, Teachers, Internal Staff Active in last 15m), Infrastructure snapshot (Requests/min, Error Rate %, Avg Response Time, Process Uptime), Recent Activity table (last 20 audit log entries across all schools).

Data flow: `opsService.getDashboard()` → `opsRepository.getDashboardTotals()` (Mongo counts on `Student`/`Teacher`/`SchoolSettings`/`User`) + `getInfrastructure()` (in-process request metrics) + `auditRepository.findAllAcrossSchools({page:1, limit:20})`.

**Known caveats:**
- The "API" status badge is hardcoded to render `healthy` — it is not actually probed. If you want this to be real, wire it to an actual health check.
- The header's "Last updated just now" text is static, not derived from the actual fetch timestamp.
- Polls every 10s (`POLL_INTERVAL_MS` in `useOpsData.ts`).

### 5.2 Infrastructure — `/ops/infrastructure`
**File:** `pages/OpsInfrastructurePage.tsx` · **Endpoint:** `GET /ops/infrastructure`

Shows: process uptime, heap used/total, RSS memory, CPU core count, 1/5/15-min load average, Mongo connection status, requests/min, error rate %, avg response time.

Data flow: Node's own `process.memoryUsage()`, `process.uptime()`, `os.loadavg()`, `os.cpus()`, `mongoose.connection.readyState`, plus `getMetricsSnapshot()` from `middlewares/metrics`.

**Known caveat:** this is a **single-instance gauge**. It reflects only the one Node process that happened to serve the request. If the app ever runs on more than one instance (e.g. Render autoscaling), this screen will not show an aggregate — it'll just show whichever instance answered. Don't trust it as a fleet-wide view without extending it.

### 5.3 Applications — `/ops/applications`
**File:** `pages/OpsApplicationsPage.tsx` · **Endpoint:** `GET /ops/applications`

Shows: per-feature table (derived from API route groupings) — Feature, Status (derived from error rate), Requests, Error Rate %, Avg Latency, Last Request time.

Data flow: cumulative in-memory counters via `getFeatureHealth()` in `middlewares/metrics`, grouped by route since process start.

**Known caveat:** "Applications" here means route groups within one monolith backend, not independently deployed microservices. Counters reset on every restart/redeploy — they are not cumulative across deploys.

### 5.4 Schools — `/ops/schools` (list) + `/ops/schools/:schoolId` (detail)
**Files:** `pages/OpsSchoolsPage.tsx`, `pages/OpsSchoolDetailPage.tsx` · **Endpoints:** `GET /ops/schools`, `GET /ops/schools/:schoolId`

List: School name (links to detail), Students, Teachers, Active(15m), Attendance Today, Fee Collection Today (₹), Last Activity.
Detail: same overview metrics + 7-day trend (attendance % + fee collected) + school-scoped Recent Activity + school-scoped Recent Security Events.

Data flow: Mongo aggregations over `Student`/`Teacher`/`Attendance`/`FeePayment`/`User`, IST-timezone-aware date bucketing.

**Known caveat:** none flagged — fully real, no simplifications. This is the reference example of "how a screen should look" if you're adding a new one.

Note: the school detail page is reachable only by clicking a row in the Schools list — it is not a separate sidebar nav item. If a stakeholder asks why the sidebar only has 14 entries when the spec says "15 screens," this detail view is the 15th.

### 5.5 Database — `/ops/database`
**File:** `pages/OpsDatabasePage.tsx` · **Endpoint:** `GET /ops/database`

Shows: MongoDB version; Data/Storage/Index size; collection/index counts; active/available connections; reads (query opcounter) and writes (insert+update); network in/out bytes; slow-query profiler availability; largest collections table.

Data flow: `db.admin().serverStatus()`, `db.stats()`, `db.listCollections()`, per-collection `collStats`, and a **live capability probe** for `profile: -1` (not a hardcoded flag — it actually asks the cluster).

**Known caveat:** the profiler section will correctly show "Not available on the current cluster tier" on Atlas free/shared tiers — this needs M10+. That's expected behavior, not a bug. See memory: Ops Center external creds for Atlas tier limits.

### 5.6 Communications — `/ops/communications`
**File:** `pages/OpsCommunicationsPage.tsx` · **Endpoint:** `GET /ops/communications`

Shows: WhatsApp — last-30-day counts by status (dynamic cards per status value present in the data) + recent messages table (time, title, status, provider, school). Push Notifications — last-30d sent, read, read-rate %.

Data flow: `Communication` collection (type=`whatsapp`) grouped by status; `Notification` collection counts.

**Known caveat:** Push "read rate" is in-app read state only. There is **no device delivery-confirmation webhook** wired up, so this number is not equivalent to "delivered" — it only tells you the notification was opened/marked read inside the app, not whether the device actually received it.

### 5.7 Security Center — `/ops/security`
**File:** `pages/OpsSecurityPage.tsx` · **Endpoint:** `GET /ops/security`

Shows: 24h summary (Failed Logins, Invalid Tokens, Permission Violations, Rate Limited) + event table (time, risk badge, type, source IP, path, user/role, school, message).

Data flow: `apps/server/src/lib/security-events.ts` — an in-memory ring buffer (cap 500), fed from `errorHandler.ts` on 401/403 responses and from the rate-limiter middleware.

**Known caveat: single-instance, in-memory, resets on restart/deploy.** Do not treat gaps in this timeline as "no incidents happened" — they may just mean the process restarted. If you need durable security event history, that requires persisting these to Mongo instead of a ring buffer.

### 5.8 Logs — `/ops/logs`
**File:** `pages/OpsLogsPage.tsx` · **Endpoint:** `GET /ops/logs?level=&search=&limit=`

Shows: live-scrolling log stream, level filter (all/error/warn/info/debug), free-text search, Live/Paused toggle.

Data flow: `apps/server/src/lib/log-buffer.ts` — in-memory ring buffer (cap 2000), fed by a Winston format hook, so every `logger.info/warn/error(...)` call anywhere in the server gets captured automatically.

**Known caveat:** in-memory only, cap 2000 entries, resets on restart. Not a searchable/persisted log store — for anything beyond a live tail, you'd want a real log aggregator (e.g. ship Winston output to a hosted logging service). Polls every 5s only while "Live" is toggled on.

### 5.9 Error Monitoring — `/ops/errors`
**File:** `pages/OpsErrorsPage.tsx` · **Endpoint:** `GET /ops/errors`

Shows: 24h summary (Total, Server 5xx, Conflicts 409, Validation 400, Not Found 404) + expandable error rows (time, status/code badge, method+path, school, user/role, message, optional stack trace).

Data flow: `apps/server/src/lib/error-events.ts` — in-memory ring buffer (cap 500), fed from `errorHandler.ts` for everything **except** 401/403 (those route to Security Center instead, by design, so the same event doesn't show up twice in two different screens).

**Known caveat:** single-instance/in-memory, resets on restart. If you're debugging "why don't I see this error," check whether the server restarted since it happened before assuming the bug is fixed.

### 5.10 Alerts — `/ops/alerts`
**File:** `pages/OpsAlertsPage.tsx` · **Endpoints:** `GET /ops/alerts` (evaluate), `PATCH /ops/alerts/:alertKey` (update status/assignee/note)

Shows: alert cards — severity, title, message, status (open/acknowledged/resolved), assignee, last-updated. Acknowledge/Resolve/Reopen actions.

Data flow: `opsService.evaluateAlerts()` runs on **every request** (not a background job) and computes conditions from: DB health, 24h server-error count, failed-login spike (>10/24h), invalid-token spike (>10/24h), per-school low attendance (<50% after 12:00 IST). Each condition maps to a stable `alertKey` (not a per-event ID), and ack/assign/resolve state is **persisted** to Mongo via `alert-state.model.ts` (`OpsAlertState` collection), upserted by that key.

**Known caveat:** thresholds are hardcoded in `ops.service.ts` (10 failed logins, 50% attendance cutoff, noon IST, etc.) — there's no UI for configuring alert rules. If a threshold needs tuning, that's a code change, not a settings change.

### 5.11 Audit Trail — `/ops/audit-trail`
**File:** `pages/OpsAuditTrailPage.tsx` · **Endpoint:** `GET /ops/audit-trail?schoolId=&userId=&action=&resource=&dateFrom=&dateTo=&page=&limit=` (Zod-validated)

Shows: filterable, paginated (50/page) table — Time, User, Action, Resource(+id), School, IP. Filters: School, Action, Date From/To.

Data flow: `auditRepository.findAllAcrossSchools()` — a real, persisted Mongo audit log collection, the same one every other screen's "Recent Activity" pulls from.

**Known caveat:** none — this is the ground-truth activity log, not a sample or a derived view.

### 5.12 Deployments — `/ops/deployments`
**File:** `pages/OpsDeploymentsPage.tsx` · **Endpoint:** `GET /ops/deployments`

Shows: deploy history table — status badge, short commit hash, commit message, trigger, duration, deployed-at.

Data flow: Render.com's Deploys API via `apps/server/src/lib/render-client.ts`. Requires env vars `RENDER_API_KEY` and `RENDER_SERVICE_ID` (see memory: Ops Center external creds for where these live).

**Known caveat:** if those env vars are missing or the Render API call fails, the service catches it and returns `{ available: false, reason, deploys: [] }` — the UI shows "Render API not reachable: {reason}" instead of an empty/broken table. This screen does **not** auto-poll (no `refetchInterval`); refresh manually if you want the latest deploy status.

### 5.13 Users — `/ops/users`
**File:** `pages/OpsUsersPage.tsx` · **Endpoint:** `GET /ops/users`

Shows: full account table across every school (Name, Email, Role, School, Status, Last Login — capped at 500 rows, sorted by last login), plus a live Permission Matrix (role × permission grid).

Data flow: Mongo `User` collection + real RBAC config (`ROLE_META`, `PERMISSION_META`, `ROLE_PERMISSIONS` from `apps/server/src/lib/permissions.ts` — so this matrix always reflects the actual code, never goes stale relative to what the app enforces).

**Known caveat:** deliberately shows no MFA/session/device data — the app doesn't have 2FA or a device registry yet, so nothing is faked in that column. This screen is **read-only** — no create/edit/deactivate actions here; use the school-level admin UI for that.

### 5.14 Settings — `/ops/settings`
**File:** `pages/OpsSettingsPage.tsx` · **Endpoint:** `GET /ops/settings`

Shows: General (Environment, Node Version, Frontend URL); Security (Access/Refresh token expiry, rate limit window+max); Integrations Configured (OpenAI, Twilio WhatsApp, Firebase Push, Render Deployments — each a boolean badge based on whether the relevant env var/secret is present).

Data flow: read directly from `env` config + `process.version`. No persisted settings table, no toggle state.

**Known caveat:** deliberately read-only, by design — there are no fake switches for things that aren't built yet (2FA enforcement, IP allowlisting, etc.). If you add a real toggle-able setting later, it needs a persistence layer (Mongo doc or similar) that doesn't currently exist.

## 6. Adding a new screen — checklist

1. Add a repository method in `ops.repository.ts` (real Mongo query/aggregation, not a mock).
2. Add a service method in `ops.service.ts` that composes repository calls into a response shape.
3. Add a controller handler + route (with `authenticate` + `permit(OPS_VIEW)`) in `ops.controller.ts` / `ops.routes.ts`.
4. Add the Zod schema for any query params in `ops.validation.ts`.
5. Add the typed fetch function + response type in `apps/web/.../api/opsApi.ts`.
6. Add a React Query hook in `hooks/useOpsData.ts` — decide if it needs polling (`refetchInterval`) or is one-shot.
7. Add the page component in `pages/`, reusing `MetricCard`, `DataTable`, `StatusBadge` for visual consistency.
8. Add the nav entry + route registration (`OpsSidebar.tsx` `NAV_ITEMS`, `apps/web/src/routes/index.tsx`).
9. If a number can't be computed for real yet, show an explicit "not available" / "not configured" state — do not hardcode a placeholder value. This is the pattern every existing screen follows and is the whole reason this dashboard is trustworthy.
10. Follow the responsive patterns already in place (see §7) — stat grids collapse to fewer columns on narrow screens, filter/toolbar rows wrap instead of overflowing, and tables scroll horizontally rather than reflowing.

## 7. Responsive design (mobile / tablet / desktop)

As of this update, the whole Ops Center adapts to viewport width instead of being desktop-only:

- **Sidebar (`OpsSidebar.tsx`):** below the `lg` breakpoint (1024px) it becomes a slide-in drawer — hidden by default, opened via the hamburger button in the header, closed via its own X button, a tap on the backdrop, or automatically on route change. At `lg:` and above it's a static 240px column, same as before.
- **Header (`OpsLayout.tsx`):** the hamburger button only renders below `lg:`. Status text and user name/role shrink/hide progressively on narrower screens (`sm:`/`md:` breakpoints) so nothing gets clipped; action buttons shorten their labels on phones ("Change Password" → "Password").
- **Stat/metric grids:** collapse to fewer columns as the viewport narrows (commonly `grid-cols-2` on phones up to `lg:grid-cols-4` on desktop) rather than a single fixed column count.
- **Filter/toolbar rows** (Logs, Audit Trail, Alerts, etc.): wrap (`flex-wrap`) instead of forcing a single horizontal row, so search boxes/dropdowns/date pickers stack on narrow screens instead of overflowing.
- **Tables (`DataTable.tsx`):** intentionally use horizontal scroll on narrow viewports (`overflow-x-auto` + a `min-w` on the table) rather than reflowing into cards. This is a deliberate choice for a dense ops dashboard — don't "fix" it into a card layout without discussing the tradeoff first, since it changes how scannable wide tables are on desktop.
- **Modals:** constrained to viewport width with side margins on phones rather than a fixed pixel width.

When adding new UI, mirror these patterns rather than inventing new ones, so the dashboard stays visually consistent across screens.
