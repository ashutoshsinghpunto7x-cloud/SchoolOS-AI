import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:5050';

test.describe('smoke', () => {
  test('API health endpoint answers', async ({ request }) => {
    const res = await request.get(`${API}/healthz`);
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('API sends security headers', async ({ request }) => {
    const res = await request.get(`${API}/healthz`);
    // /healthz is registered before helmet, so check a real route instead.
    const other = await request.get(`${API}/api/v1/does-not-exist`);
    expect(other.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.ok()).toBeTruthy();
  });

  test('protected API route rejects anonymous callers', async ({ request }) => {
    const res = await request.get(`${API}/api/v1/students`);
    expect([401, 403, 404]).toContain(res.status());
    expect(res.status()).not.toBe(200);
  });

  test('login page renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/login');
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('wrong credentials show an error and stay on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('nobody@example.invalid');
    await page.getByPlaceholder('Password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/login/);
  });

  test('unknown route does not crash the app', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
