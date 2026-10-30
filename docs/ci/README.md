# CI and merge protection

Everything under `.github/` runs on every pull request to `main`. Workflows only *report*. Nothing blocks a merge until you make the checks **required** in GitHub (steps below).

## What runs

| Workflow | Check name (use this in branch protection) | Covers |
|---|---|---|
| `ci.yaml` | `CI Pipeline` | workflow lint, committed-secret/env-file block, `npm ci`, type-check (all packages, server, web), ESLint, server tests, server + web production build, bundle-size budget |
| `security.yaml` | `Secret scan (gitleaks)`, `Dependency audit`, `Dependency review (new packages in this PR)`, `CodeQL (JavaScript/TypeScript)` | leaked secrets in full history, known-vulnerable packages, new risky packages, static security analysis (injection, auth, XSS). Also runs weekly |
| `e2e.yaml` | `Playwright + Lighthouse` | real API + Mongo + built web app; login/health/anonymous-access/security-header smoke tests on desktop and phone viewport; Lighthouse accessibility score >= 90 |
| `mobile-ci.yaml` | `Mobile CI` | type-check, ESLint, expo-doctor, Android debug build and Android Lint. Heavy steps run only when `apps/mobile` or `packages/` changed, but the check always reports so it can be required |

Supporting files: `dependabot.yml` (weekly dependency PRs), `CODEOWNERS`, `pull_request_template.md`, `lighthouserc.json`, `scripts/check-bundle-size.mjs`.

## Turn on merge protection (you do this once, in GitHub)

Repo -> Settings -> Branches -> Add branch ruleset (or classic rule) for `main`:

1. Require a pull request before merging, with at least 1 approval.
2. Require review from Code Owners.
3. Dismiss stale approvals when new commits are pushed.
4. Require status checks to pass, and require branches to be up to date. Add these checks: `CI Pipeline`, `Secret scan (gitleaks)`, `Dependency audit`, `Dependency review (new packages in this PR)`, `CodeQL (JavaScript/TypeScript)`, `Playwright + Lighthouse`, `Mobile CI`. (A check only appears in the picker after it has run once, so open a first PR.)
5. Require conversation resolution.
6. Block force pushes and deletions. Do not allow bypassing, including for admins.

Also enable under Settings -> Code security: Dependabot alerts, secret scanning and push protection.

## Known limits (be honest about what this does not prove)

- Server has 2 test files and web has none, so passing CI means "builds, type-checks, lints, smoke-tests and has no known vulnerable dependencies", not "all features work". Add tests alongside each feature; CI already runs whatever you add (`apps/server/src/**/*.test.ts`, `tests/e2e/*.spec.ts`).
- E2E uses an empty database. Logged-in flows need a seed step (the `seed:demo-workspace` script is the natural fit) and test accounts created for CI only, never real ones.
- `npm audit` finds 45 existing advisories today (2 critical, 22 high; `xlsx` has no upstream fix, `zod` needs a major bump). The full audit is therefore report-only; only *new* vulnerable packages in a PR block (dependency review). Triage the existing ones, then remove `continue-on-error` in `security.yaml`.
- ESLint style rules are warnings so existing code passes. About 28 warnings exist today; tighten rules in `eslint.config.mjs` as they get cleaned up.
- The `apps/*/Dockerfile` files are not built in CI because they use the app folder as build context and do not match the monorepo layout. Add a build step if you deploy from them.
- Mobile CI has not been run on GitHub yet; the first run may need small fixes (Expo prebuild settings, Gradle memory).
- Deployment (Render / Vercel) is untouched. CI does not deploy.

## Approval-testing harness (`approval-testing-harness.md`)

That document describes a large, separate project (a second repository, a pinned emulator, proxies, a review UI). It is not a CI file, so it is not built here. A realistic order for SchoolOS, web first since web is the active product:

1. Playwright already drives the web app in `tests/e2e`. Add a seed step and sign-in helpers per role (teacher, principal, accountant, reception, parent).
2. Add screenshot capture plus accessibility-tree text per scenario, with fixed clock, locale and viewport.
3. Add a request log (Playwright route interception) and rules to fail or delay chosen endpoints (rate limit, 500, offline).
4. Store approved states in a separate repo and compare on each run; a person approves every difference.
5. Only then consider the mobile emulator side, once mobile is active again.
