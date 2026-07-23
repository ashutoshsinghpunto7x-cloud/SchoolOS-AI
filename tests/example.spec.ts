import { test, expect } from '@playwright/test';

test('Login Test', async ({ page }) => {
  await page.goto('https://fnicschool.com/login');

  await page.getByPlaceholder('Email').fill('yashsingh11@gmail.com');
  await page.getByPlaceholder('Password').fill('asdfghjkl');

  await page.getByRole('button', { name: /login/i }).click();

  await expect(page).toHaveURL(/dashboard/);
});