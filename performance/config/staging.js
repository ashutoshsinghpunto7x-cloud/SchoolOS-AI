// Thin entry point for running the suite against a staging environment.
// Usage: k6 run -e K6_ENV=staging -e K6_BASE_URL=https://staging.example.com/api/v1 performance/scripts/smoke.js
//
// There is no staging box wired into this repo yet (per project decision,
// this framework was built and executed against `local` only). This file
// exists so the folder structure matches config/base.js's environment
// switch and so a future staging setup has an obvious place to live —
// it re-exports base.js's resolution, which already reads K6_ENV/K6_BASE_URL.
export * from './base.js';
