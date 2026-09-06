import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Quran Reader Flows', () => {
  test('Loads Quran Hub, renders Surah text, and verifies interactive elements', async ({
    page,
  }) => {
    await page.goto('/quran');
    await expect(page.locator('main').first()).toBeVisible();

    // Verify Surah button/label is displayed (e.g. سورة الفاتحة)
    await expect(page.locator('button:has-text("سورة")').first()).toBeVisible({ timeout: 15000 });

    // Verify Qira'ah selector dropdown is present
    await expect(page.locator('select').first()).toBeVisible();
  });
});
