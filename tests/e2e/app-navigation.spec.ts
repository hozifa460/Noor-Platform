import { test, expect } from "@playwright/test";

test.describe("Noor Platform — Core App Navigation & Hub Routes", () => {
  test("Loads homepage cleanly with header and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/منصة النور|Noor/);
    await expect(page.locator("header")).toBeVisible();
  });

  test("Directly loads /quran route with Quran Hub", async ({ page }) => {
    await page.goto("/quran");
    await expect(page.locator("main")).toBeVisible();
  });

  test("Directly loads /hadith route with Hadith Hub", async ({ page }) => {
    await page.goto("/hadith");
    await expect(page.locator("main")).toBeVisible();
  });

  test("Directly loads /books route with Book Catalog", async ({ page }) => {
    await page.goto("/books");
    await expect(page.locator("main")).toBeVisible();
  });

  test("Directly loads /radio route with Radio Stations", async ({ page }) => {
    await page.goto("/radio");
    await expect(page.locator("main")).toBeVisible();
  });
});
