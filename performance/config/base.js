// Shared config resolved from environment variables, with safe local
// defaults. Every scenario/script imports `env` from here rather than
// reading process.env directly, so the whole suite reacts to one set of
// knobs.
//
// K6_ENV selects which environment file below is merged over these
// defaults: 'local' (default), 'staging', 'production'.
export const K6_ENV = __ENV.K6_ENV || 'local';

const environments = {
  local: {
    baseUrl: __ENV.K6_BASE_URL || 'http://localhost:5050/api/v1',
    label: 'local',
  },
  staging: {
    // No staging URL is wired up yet — this repo's k6 suite has only been
    // run against `local`. Set K6_BASE_URL when a staging box exists;
    // do not point this at production.
    baseUrl: __ENV.K6_BASE_URL || 'https://REPLACE_WITH_STAGING_URL/api/v1',
    label: 'staging',
  },
  production: {
    // Intentionally requires an explicit, non-default URL — there is no
    // sensible fallback here. Running the higher VU-count profiles
    // (stress/soak, 250-500 VUs) against a live Render + free-tier Atlas
    // backend risks real outages for real schools. Get sign-off before
    // pointing this at prod, and start with smoke only.
    baseUrl: __ENV.K6_BASE_URL || '',
    label: 'production',
  },
};

if (K6_ENV === 'production' && !environments.production.baseUrl) {
  throw new Error(
    'K6_ENV=production requires K6_BASE_URL to be set explicitly — refusing to guess a production URL. ' +
    'Also confirm you have sign-off before load-testing production; see performance/README.md.'
  );
}

export const env = environments[K6_ENV] || environments.local;

// Fixture written by `npm run seed:perf-test-data -w apps/server`.
// Scenarios read this via helpers/users.js rather than importing it raw.
// k6's open() resolves a relative path relative to the *calling script
// file's* directory, not the process cwd — this default is written relative
// to helpers/users.js (the only place that calls open() on it), not to
// config/base.js's own location.
export const FIXTURE_PATH = __ENV.K6_FIXTURE_PATH || '../data/perf-test-context.json';

// Common HTTP options every scenario should apply.
export const httpOptions = {
  timeout: '30s',
};

// VU stage presets, referenced by scripts/*.js. Keyed by test type so a
// single scenario file can be driven at different intensities without
// duplicating scenario logic.
export const stages = {
  smoke: [
    { duration: '30s', target: 2 },
    { duration: '1m', target: 2 },
    { duration: '10s', target: 0 },
  ],
  // Gradual ramp through the load levels the framework spec calls for:
  // 10 -> 25 -> 50 -> 100 -> 250 -> 500. Each step holds long enough to
  // stabilize before the next ramp. NOTE: 250/500 are aspirational tiers
  // for a dedicated staging/perf box — a laptop dev server + free-tier
  // Atlas will bottleneck well before then; see README's "known ceiling".
  load: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '2m', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 250 },
    { duration: '2m', target: 250 },
    { duration: '1m', target: 500 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  spike: [
    { duration: '30s', target: 10 },
    { duration: '20s', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '20s', target: 10 },
    { duration: '30s', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 250 },
    { duration: '3m', target: 500 },
    { duration: '3m', target: 750 },
    { duration: '2m', target: 0 },
  ],
  soak: [
    { duration: '2m', target: 50 },
    { duration: '4h', target: 50 },
    { duration: '2m', target: 0 },
  ],
};

// Scales a stage array's `target` VU counts by a fraction (rounding down to
// a 1-VU floor whenever the source target is > 0), so a single named stage
// preset (e.g. stages.load, which specifies *total* concurrent users across
// the whole suite) can be split across several role scenarios that each get
// a proportional slice while sharing the same ramp timeline.
export function scaleStages(stageArr, fraction) {
  return stageArr.map((s) => ({
    duration: s.duration,
    target: s.target === 0 ? 0 : Math.max(1, Math.round(s.target * fraction)),
  }));
}
