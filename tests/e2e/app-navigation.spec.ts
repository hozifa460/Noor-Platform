import { test, expect } from "@playwright/test";

test.describe("Noor Platform — Core App Navigation & Hub Routes", () => {
  test("Loads homepage cleanly with header and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/منصة نور|منصة النور|Noor/);
    await expect(page.locator("header").first()).toBeVisible();
  });

  test("Directly loads /quran route with Quran Hub", async ({ page }) => {
    await page.goto("/quran");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("Directly loads /hadith route with Hadith Hub", async ({ page }) => {
    await page.goto("/hadith");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("Directly loads /books route with Book Catalog", async ({ page }) => {
    await page.goto("/books");
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("Directly loads /radio route and verifies radio stations load without CSP media errors", async ({ page }) => {
    const cspErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspErrors.push(msg.text());
      }
    });

    await page.goto("/radio");
    await expect(page.locator("main").first()).toBeVisible();

    // Verify radio cards or category tabs are rendered cleanly
    const radioContent = page.locator('main').locator('text=/إذاعات القرآن|الإذاعات|إذاعة|بث مباشر/');
    await expect(radioContent.first()).toBeVisible({ timeout: 15000 });

    // Assert zero CSP violations occurred
    expect(cspErrors).toHaveLength(0);
  });
});
