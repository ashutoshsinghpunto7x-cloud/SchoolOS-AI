// Central threshold definitions, imported by every entry-point script in
// performance/scripts/. k6 fails the whole run's exit code (and CI status)
// if any of these are breached — that's the "automatic failure" mechanism
// the framework spec requires; there is no separate pass/fail step to wire up.
//
// Mapped 1:1 to the mandatory list:
//   Error Rate > 1%              -> http_req_failed
//   Avg response time > 500ms    -> http_req_duration (avg)
//   p95 > 1000ms                 -> http_req_duration (p95)
//   Any 429 under expected load  -> http_429_count
//   Any 500                      -> http_500_count
//   Duplicate attendance         -> duplicate_attendance_detected
//   Duplicate fee payment        -> duplicate_fee_payment_detected
//   Race conditions              -> race_condition_detected
//   DB write inconsistencies     -> db_write_inconsistency_detected
//
// NOT expressible as a k6 threshold (k6 only sees HTTP traffic from outside
// the process): memory growth during soak, CPU ceiling, connection-pool
// exhaustion. Those must be read from Render/Atlas/APM dashboards for the
// same time window and cross-checked manually — see README's
// "Out of k6's reach" section. Treat their absence here as a gap to fill
// with real infra metrics, not as "passing by default".
export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['avg<500', 'p(95)<1000', 'p(99)<1500'],
  http_500_count: ['count==0'],
  duplicate_attendance_detected: ['rate==0'],
  duplicate_fee_payment_detected: ['rate==0'],
  race_condition_detected: ['rate==0'],
  db_write_inconsistency_detected: ['rate==0'],
  login_duration: ['p(95)<1000'],
};

// http_429_count is intentionally excluded from `thresholds` above and
// checked separately by scripts after the run: a 429 during the deliberate
// spike-test burst is expected (that's the rate limiter doing its job), but
// a 429 during smoke/load/soak at documented VU counts is not. Each
// script's summary handler (see scripts/*.js) applies this distinction.
// Ensures p(99) (and p(90)) actually show up in every trend metric's summary
// values — by default k6 only reports avg/min/med/max/p(90)/p(95) unless a
// script asks for more, even though a p(99) *threshold* still evaluates
// correctly either way. Every script spreads this into its `options`.
export const summaryTrendStats = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];

export const per429Tolerance = {
  smoke: 0,
  load: 0,
  spike: null, // no ceiling — spike intentionally exceeds rate limits
  stress: null,
  soak: 0,
};
