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

  test("Directly loads /radio route, plays a live station, and verifies audio stream progress without CSP errors", async ({ page }) => {
    const cspErrors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error' && (text.includes('Content Security Policy') || text.includes('CSP') || text.includes('refused to load'))) {
        cspErrors.push(text);
      }
    });

    await page.goto("/radio");
    await expect(page.locator("main").first()).toBeVisible();

    // 1. Wait for radio stations grid to load
    const radioCard = page.locator('[data-testid="islamic-radio-card"]').first();
    await expect(radioCard).toBeVisible({ timeout: 15000 });

    // 2. Click radio station card to open player and start live stream
    await radioCard.click();

    // 3. Verify player modal appears with active HTML5 audio element
    const audioElement = page.locator('audio');
    await expect(audioElement).toBeVisible({ timeout: 15000 });

    // 4. Verify the media source belongs to the verified streaming origins
    const audioSrc = await audioElement.evaluate((el) => {
      const audio = el as HTMLAudioElement;
      return audio.currentSrc || audio.src;
    });
    expect(audioSrc).toMatch(
      /radiojar\.com|itworkscdn\.net|mp3islam\.com|radio\.co|qurango\.net|zeno\.fm|fastcast4u\.com|simplestreaming\.co\.za/
    );

    // 5. Ensure audio is unblocked and playback advances in headless environment
    await audioElement.evaluate((el) => {
      const audio = el as HTMLAudioElement;
      audio.muted = true;
      return audio.play().catch(() => {});
    });

    // 6. Assert playback progress (stream buffered, not paused, and currentTime advances)
    await expect(async () => {
      const progress = await audioElement.evaluate((el) => {
        const audio = el as HTMLAudioElement;
        return {
          currentTime: audio.currentTime,
          paused: audio.paused,
          readyState: audio.readyState,
        };
      });
      expect(progress.readyState).toBeGreaterThanOrEqual(1);
      expect(progress.paused).toBe(false);
      expect(progress.currentTime).toBeGreaterThan(0);
    }).toPass({ timeout: 15000 });

    // 7. Assert zero CSP violations occurred throughout loading and playback
    expect(cspErrors).toHaveLength(0);
  });
});
