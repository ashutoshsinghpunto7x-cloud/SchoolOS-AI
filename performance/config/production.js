// Thin entry point for running the suite against production.
// Usage: k6 run -e K6_ENV=production -e K6_BASE_URL=https://<render-app>.onrender.com/api/v1 performance/scripts/smoke.js
//
// base.js refuses to fall back to any default URL when K6_ENV=production —
// you must pass K6_BASE_URL explicitly. Before ever running this against the
// real Render + Atlas backend: get explicit sign-off (production here serves
// real schools; Atlas is on a free tier per project notes — see
// performance/README.md's "Running against production" section), and only
// ever start with `scripts/smoke.js` at 2 VUs, never load/spike/stress/soak,
// unless that sign-off explicitly covers higher VU counts.
export * from './base.js';
