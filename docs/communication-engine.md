# Communication & Notification Engine

A channel-agnostic notification engine for SchoolOS. WhatsApp (Meta Cloud API) is
the only channel that actually sends today; Email, SMS, Push and Voice are
registered but unimplemented, so turning them on later never requires touching
business logic — only a new provider file and one line in `provider-registry.ts`.

Business modules (Attendance, Fees, Admissions, ...) never call Meta's API
directly — they call `communicationEngineService.send()` / `.sendBulk()`.

---

## 1. Folder structure

```
apps/server/src/features/communication/
  notification-types.ts              # NotificationType enum + per-type placeholders
  notification-log.model.ts          # NotificationLog (the audit trail of every send attempt)
  notification-log.repository.ts
  message-template.model.ts          # NotificationTemplate — editable per-type/channel body
  message-template.repository.ts
  message-template.service.ts
  bulk-send-job.model.ts             # BulkSendJob — progress tracker for async bulk sends
  bulk-send-job.repository.ts
  communication-core.ts              # sendOne() / retryOne() — the real send logic
  communication-engine.service.ts    # public facade: CommunicationService.send()/.sendBulk()/.retry()
  communication-engine.controller.ts
  communication-engine.validation.ts
  communication-engine.routes.ts
  attendance-notification.service.ts # business logic: find absentees → sendBulk()
  fee-notification.service.ts        # business logic: find fee defaulters → sendBulk()
  broadcast.service.ts               # business logic: resolve recipients → sendBulk()
  dashboard.service.ts                # aggregation for the dashboard endpoints
  webhook.service.ts                  # Meta webhook verify + status/incoming handling
  providers/
    provider.interface.ts             # ICommunicationChannelProvider contract
    whatsapp-cloud.provider.ts        # real Meta Graph API implementation
    unimplemented-channel.provider.ts # shared "not wired up yet" scaffold
    email.provider.ts                # future channel (stub)
    sms.provider.ts                   # future channel (stub)
    push.provider.ts                  # future channel (stub, parent-facing push)
    voice.provider.ts                 # future channel (stub)
    provider-registry.ts              # channel → provider lookup
  templates/
    template-engine.ts                # {{placeholder}} renderer
    default-templates.ts              # seed copy per notification type
  queue/
    bulk-processor.ts                 # in-process concurrency-limited background worker
```

---

## 2. Files created

**Communication feature (new):** every file listed under §1 above (29 files).

**Docs:** `docs/communication-engine.md` (this file), `docs/communication-engine.postman_collection.json`.

## 3. Files modified

| File | Change |
|---|---|
| `apps/server/src/config/env.ts` | Added `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_API_VERSION` |
| `apps/server/src/features/audit/audit.model.ts` | Added `notification.*`, `communication_settings.updated`, `message_template.*` audit actions |
| `apps/server/src/features/school-settings/school-settings.model.ts` | Added `communicationSettings` sub-document + `DEFAULT_COMMUNICATION_SETTINGS` |
| `apps/server/src/features/school-settings/school-settings.service.ts` | Heals missing `communicationSettings` on read; added `updateCommunicationSettings()` |
| `apps/server/src/features/school-settings/school-settings.controller.ts` | Added `updateCommunicationSettings` handler |
| `apps/server/src/features/school-settings/school-settings.routes.ts` | Added `PATCH /school-settings/communication-settings` |
| `apps/server/src/features/school-settings/school-settings.validation.ts` | Added `updateCommunicationSettingsSchema` |
| `apps/server/src/features/attendance/attendance.repository.ts` | Added `findAbsentees()` (unpaginated, feeds the notification recipient list) |
| `apps/server/src/features/attendance/attendance.service.ts` | Fire-and-forget auto-notify hook in `bulkMark()`, gated by `communicationSettings.attendanceAutoNotify` |
| `apps/server/src/routes/index.ts` | Mounted new router at `/communication` |

**Nothing else changed.** The existing Twilio WhatsApp provider, the n8n automation job types (`WHATSAPP`, `FEE_REMINDER`, `PTM_REMINDER`, `GENERAL_BROADCAST`), and workflows WF-002–006 are untouched and keep working exactly as before — per the agreed scope, this build is additive, not a migration.

---

## 4. Environment variables

```bash
# Meta WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxx   # permanent system-user token (see §9)
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=some-long-random-string           # you choose this; Meta echoes it back on webhook setup
WHATSAPP_API_VERSION=v21.0                              # optional, defaults to v21.0
```

If these are unset, `whatsappEnabled` in Communication Settings can still be `true`
(it's on by default), but every send will resolve to `FAILED` with the message
*"whatsapp is enabled but its provider is not configured"* — visible immediately
in the dashboard/logs rather than failing silently.

---

## 5. Database schema changes

**New collections:**
- `notificationlogs` — one document per (recipient × attempt). Indexed on `schoolId+createdAt`, `schoolId+notificationType+createdAt`, `schoolId+status+createdAt`, `bulkJobId`, `metaMessageId`.
- `notificationtemplates` — editable template bodies, one active row per (schoolId, notificationType, channel).
- `bulksendjobs` — progress counters for async bulk sends (`totalRecipients`, `sent`, `failed`, `skipped`, `status`).

**Modified collection:**
- `schoolsettings` — new embedded `communicationSettings` sub-document (see §7 for fields). Existing documents are healed with the default values the first time `GET /school-settings` runs after this deploy — no migration script needed.

---

## 6. Notification types (extensible registry)

`notification-types.ts` defines all 11 types from the spec (`ATTENDANCE_ABSENT`,
`FEE_REMINDER`, `FEE_DEFAULTER`, `BIRTHDAY`, `PTM_REMINDER`, `HOMEWORK`,
`EXAM_REMINDER`, `HOLIDAY_ANNOUNCEMENT`, `ADMISSION_FOLLOWUP`,
`EMERGENCY_ALERT`, `GENERAL_BROADCAST`), each with its expected placeholders
and default channel. **Adding a new type is a two-line change**: one entry in
`NOTIFICATION_TYPES` and one default body in `DEFAULT_TEMPLATE_BODIES` — no
controller, provider, or queue code changes.

---

## 7. API documentation

Base path: `/api/v1/communication` (JWT required on everything except the webhook).

### Attendance
```
POST /communication/attendance/send
Roles: admin, principal, teacher
Body: { "date"?: "2026-07-28", "class"?: "10", "section"?: "A" }
```
Finds every student marked `absent` for the given date (defaults to today)/class/section, resolves parent phone numbers, and enqueues a bulk WhatsApp send.

**Response 200:**
```json
{
  "success": true,
  "message": "Absent notifications dispatched",
  "data": { "jobId": "66a...", "totalStudents": 42, "sent": 0, "failed": 0, "skipped": 0, "status": "PROCESSING" }
}
```
> Sends are asynchronous (see §10 Performance) — poll `GET /communication/jobs/:jobId` for final `sent`/`failed`/`skipped` counts.

**Auto Send:** Toggle `communicationSettings.attendanceAutoNotify` via `PATCH /school-settings/communication-settings`. When on, this same flow fires automatically (fire-and-forget) right after `POST /attendance/bulk` — attendance submission itself never waits on or fails because of it.

### Fees
```
POST /communication/fees/send
Roles: admin, principal, accountant
Body: { "month"?: "April", "class"?: "10", "section"?: "A", "studentIds"?: ["..."] }
```
Aggregates every unpaid `FeeRecord` (`pending`/`overdue`/`partially_paid`, `balance > 0`) per student into a single reminder — one message per student even if they have multiple pending fee heads.

**Response 200:** same shape as attendance (`totalStudents`/`jobId`/etc).

### Broadcast
```
POST /communication/broadcast/school     { notificationType?, channel?, message? }
POST /communication/broadcast/class      { class, notificationType?, channel?, message? }
POST /communication/broadcast/section    { class, section, notificationType?, channel?, message? }
POST /communication/broadcast/students   { studentIds: [...], notificationType?, channel?, message? }
POST /communication/broadcast/parents    { studentIds: [...], notificationType?, channel?, message? }
POST /communication/broadcast/teachers   { teacherIds: [...], notificationType?, channel?, message? }
```
`notificationType` defaults to `GENERAL_BROADCAST`. If `message` is provided it's sent verbatim (ad-hoc broadcast text) instead of the stored template.

### Logs (Notification History)
```
GET  /communication/logs?page=&limit=&notificationType=&channel=&status=&search=
GET  /communication/logs/:id
POST /communication/logs/:id/retry        Roles: admin, principal, accountant
```

### Bulk jobs
```
GET /communication/jobs          # recent bulk send jobs for this school
GET /communication/jobs/:id      # poll progress: { status, totalRecipients, sent, failed, skipped }
```

### Dashboard
```
GET  /communication/dashboard/summary       # today + monthly counts, success/failure/delivery rate
GET  /communication/dashboard/recent        # last 20 notification log entries
GET  /communication/dashboard/failed        # up to 100 FAILED entries
POST /communication/dashboard/retry-failed  # retries all currently-FAILED entries (bounded to 500)   Roles: admin, principal
```

**Example — `GET /communication/dashboard/summary`:**
```json
{
  "success": true,
  "data": {
    "today":   { "total": 58, "sent": 50, "delivered": 41, "read": 12, "failed": 3, "skipped": 5 },
    "monthly": { "total": 640, "sent": 590, "delivered": 480, "read": 210, "failed": 20, "skipped": 30 },
    "successRate": 95,
    "failureRate": 3,
    "deliveryRate": 91
  }
}
```

### Templates
```
GET    /communication/templates
POST   /communication/templates          Roles: admin, principal   { notificationType, channel, name, body }
PATCH  /communication/templates/:id      Roles: admin, principal   { name?, body?, isActive? }
POST   /communication/templates/:id/activate   Roles: admin, principal
DELETE /communication/templates/:id      Roles: admin, principal   (cannot delete the seeded default)
```

### Settings
```
GET   /school-settings                              (communicationSettings is embedded in the response)
PATCH /school-settings/communication-settings       Roles: admin, principal
Body: {
  "whatsappEnabled": true, "emailEnabled": false, "smsEnabled": false, "pushEnabled": false,
  "attendanceAutoNotify": true, "feeReminderAutoNotify": false,
  "workingHoursStart": "08:00", "workingHoursEnd": "20:00",
  "dailyLimit": 5000, "retryCount": 3
}
```

### Meta WhatsApp Cloud API webhook (public — no JWT)
```
GET  /communication/webhook     # Meta's one-time verification handshake
POST /communication/webhook     # delivery/read status updates + inbound messages
```

---

## 8. Postman collection

See [`docs/communication-engine.postman_collection.json`](./communication-engine.postman_collection.json) — import into Postman, set `baseUrl` and `token` collection variables.

---

## 9. Deployment guide

1. **Create a Meta developer app** at developers.facebook.com → add the **WhatsApp** product.
2. Under WhatsApp → API Setup, note the **temporary access token** and **Phone Number ID**. For production, create a **System User** in Meta Business Manager and generate a **permanent token** with `whatsapp_business_messaging` + `whatsapp_business_management` permissions — temporary tokens expire in 24h.
3. Set on Render (or wherever `apps/server` runs):
   ```
   WHATSAPP_ACCESS_TOKEN=<permanent token>
   WHATSAPP_PHONE_NUMBER_ID=<phone number id>
   WHATSAPP_VERIFY_TOKEN=<any string you invent>
   WHATSAPP_API_VERSION=v21.0
   ```
4. In the Meta app's WhatsApp → Configuration screen, set the **Callback URL** to
   `https://<your-render-domain>/api/v1/communication/webhook` and the
   **Verify Token** to the same value as `WHATSAPP_VERIFY_TOKEN`. Meta calls
   `GET` on this URL once to confirm; this engine's `verifyWebhook` handler
   answers it automatically.
5. Subscribe the webhook to the `messages` field so delivery/read status updates flow in.
6. Redeploy. No database migration step is required — `communicationSettings` and any per-school `NotificationTemplate` rows are created lazily on first use.
7. Confirm `GET /school-settings` (as an authenticated admin) returns a `communicationSettings` block, then run through the testing checklist below.

---

## 10. Performance notes

- Bulk sends (attendance, fee reminders, broadcasts) never block the HTTP
  request: a `BulkSendJob` is created and the response returns immediately;
  an in-process worker pool (`queue/bulk-processor.ts`, concurrency 8) works
  through recipients in the background, persisting progress to Mongo so
  `GET /communication/jobs/:id` reflects live counts.
- No Redis/BullMQ was introduced (none exists in this stack today — see the
  architecture decision made before implementation). This means a mid-run
  server restart leaves a job's counters wherever they stopped (status stays
  `PROCESSING`); acceptable at school scale (100–10,000 recipients), but if
  this ever needs to survive restarts or scale across multiple server
  instances, swap `bulk-processor.ts`'s in-process loop for a durable queue —
  no other file needs to change.
- The WhatsApp Cloud provider retries transient failures (429/5xx/network
  errors) up to 3 times with exponential backoff; permanent failures (bad
  number, policy violation) are not retried.
- `dailyLimit` and `workingHoursStart/End` in Communication Settings are
  enforced per-send (`communication-core.ts`), so a runaway bulk job can't
  exceed either — recipients past the limit or outside the window are logged
  as `SKIPPED`, not silently dropped.

---

## 11. Testing checklist

- [ ] `GET /school-settings` returns `communicationSettings` with sane defaults on a school that predates this feature.
- [ ] `PATCH /school-settings/communication-settings` updates and persists (check `updatedBy`, audit log entry `communication_settings.updated`).
- [ ] With `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` unset: send attempt → `NotificationLog.status = FAILED`, error mentions "not configured".
- [ ] With real Meta credentials + a WhatsApp-registered test number as `parentPhone`: `POST /communication/attendance/send` → message actually arrives on the phone.
- [ ] Webhook: after the above, Meta's delivery-status callback flips the log to `DELIVERED` then `READ` (check `GET /communication/logs/:id`).
- [ ] Toggle `whatsappEnabled: false` → sends immediately resolve `SKIPPED`, no Graph API call made (check outbound network logs).
- [ ] Set `workingHoursStart`/`End` to a window that excludes "now" → send resolves `SKIPPED` with the working-hours message.
- [ ] Set `dailyLimit: 1`, send twice same day → second resolves `SKIPPED` (limit reached).
- [ ] `POST /communication/fees/send` with a student having 2+ unpaid fee heads → exactly one message, `amount` = sum of balances.
- [ ] `attendanceAutoNotify: true`, then `POST /attendance/bulk` with an absent student → a `BulkSendJob`/`NotificationLog` appears without calling `/attendance/send` manually; `POST /attendance/bulk`'s own response is unaffected even if the notify step throws (kill WhatsApp config mid-test to confirm).
- [ ] Broadcast to `/broadcast/class` with a custom `message` → recipients receive that exact text, not the stored `GENERAL_BROADCAST` template.
- [ ] `GET /communication/dashboard/summary` counts match manual counts in `notificationlogs` for the same school/day.
- [ ] `POST /communication/logs/:id/retry` on a `FAILED` log re-attempts with the original rendered body (no re-render/template drift) and updates status.
- [ ] Regression: existing `/communications/*` (Twilio/n8n) and `/automation/*` endpoints still function unchanged — this build touched neither.
- [ ] Load: seed 10,000 students, run `/communication/attendance/send` for a date where most are absent, confirm the endpoint responds in <1s and `/communication/jobs/:id` progresses to `COMPLETED` without the server showing memory growth or blocking other requests.
