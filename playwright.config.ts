import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a locally started stack (see .github/workflows/e2e.yaml).
 * Never point E2E_BASE_URL at production: tests must not use real accounts.
 * Locally: start the server and `npm run preview -w apps/web`, then `npx playwright test`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Chromium with a phone viewport: catches layout breakage on small screens.
    { name: 'mobile-viewport', use: { ...devices['Pixel 5'] } },
  ],
});
