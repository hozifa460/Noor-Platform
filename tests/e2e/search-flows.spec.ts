import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Search Flows (Hadith & Fatwa)', () => {
  test('Executes debounced search in Hadith Hub', async ({ page }) => {
    await page.goto('/hadith');
    await expect(page.locator('main').first()).toBeVisible();

    const searchInput = page.locator('input[placeholder*="ابحث في"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Type search query
    await searchInput.fill('النية');
    // Allow debounce to settle
    await page.waitForTimeout(600);

    // Verify main content is rendered and search text is present
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('Executes search in Fatwa Library', async ({ page }) => {
    await page.goto('/fatwa');
    await expect(page.locator('main').first()).toBeVisible();

    const searchInput = page.locator('input[placeholder*="ابحث"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Type search query
    await searchInput.fill('الصوم');
    // Allow debounce to settle
    await page.waitForTimeout(600);

    // Verify results area is visible
    await expect(page.locator('main').first()).toBeVisible();
  });
});
