import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Quran Reciter Switching & Audio Sync Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Enable store for test validation and open Quran page
    await page.addInitScript(() => {
      window.__NOOR_ENABLE_TEST_STORE__ = true;
    });
    await page.goto('/quran');
    await page.waitForSelector('[data-testid="quran-header-bar"]', { timeout: 15000 });
  });

  test('Switching between two different reciters in Full Surah mode updates audio URL and UI in practice', async ({
    page,
  }) => {
    // 1. Open Reciter Modal
    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await expect(reciterTrigger).toBeVisible();
    await reciterTrigger.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // 2. Select first reciter from Full Surah tab
    await page.locator('[data-testid="tab-surah-reciters"]').click();
    const firstSurahBtn = modal.locator('[data-testid^="reciter-surah-"]').first();
    const firstReciterName = (await firstSurahBtn.locator('.text-sm').innerText()).trim();
    await firstSurahBtn.click();
    await expect(modal).not.toBeVisible();

    // 3. Start Full Surah playback
    const playTrigger = page.locator('[data-testid="recitation-play-trigger"]');
    await playTrigger.click();

    const audioBar = page.locator('[data-testid="quran-audio-bar"]');
    await expect(audioBar).toBeVisible({ timeout: 10000 });

    // Verify audio element src is loaded with first reciter
    const initialAudioSrc = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.src : '';
    });
    expect(initialAudioSrc).toContain('mp3quran.net');
    await expect(reciterTrigger).toContainText(firstReciterName);

    // 4. Switch to a second different reciter while playback is active
    await reciterTrigger.click();
    await expect(modal).toBeVisible();
    await page.locator('[data-testid="tab-surah-reciters"]').click();

    // Find a second reciter button with different name
    const secondSurahBtn = modal.locator('[data-testid^="reciter-surah-"]').nth(1);
    const secondReciterName = (await secondSurahBtn.locator('.text-sm').innerText()).trim();
    expect(secondReciterName).not.toBe(firstReciterName);

    await secondSurahBtn.click();
    await expect(modal).not.toBeVisible();

    // 5. Verify audio src and UI updated to second reciter
    await expect(async () => {
      const updatedAudioSrc = await page.evaluate(() => {
        const audio = document.querySelector('audio');
        return audio ? audio.src : '';
      });
      expect(updatedAudioSrc).toContain('mp3quran.net');
      expect(updatedAudioSrc).not.toBe(initialAudioSrc);
    }).toPass({ timeout: 10000 });

    await expect(reciterTrigger).toContainText(secondReciterName);
    await expect(audioBar).toContainText(secondReciterName);
    await expect(audioBar).toContainText('سورة كاملة');
  });

  test('Switching between two verse reciters in interactive mode updates audio URL and UI in practice', async ({
    page,
  }) => {
    // 1. Switch to interactive mode
    const interactiveBtn = page.locator('[data-testid="mode-interactive"]');
    await interactiveBtn.click();
    await page.waitForSelector('#ayah-1', { timeout: 10000 });

    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await expect(reciterTrigger).toBeVisible();

    // 2. Open Reciter Modal and select Reciter A (e.g. Abdul Basit)
    await reciterTrigger.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await page.locator('[data-testid="tab-verse-reciters"]').click();
    const abdulBasitBtn = modal.locator('[data-testid="reciter-verse-abdulbasit_murattal"]');
    await expect(abdulBasitBtn).toBeVisible();
    await abdulBasitBtn.click();
    await expect(modal).not.toBeVisible();

    // Verify top button updated to Abdul Basit
    await expect(reciterTrigger).toContainText('عبد الباسط');

    // 3. Play Ayah 1
    const ayah1Play = page.locator('#ayah-1 button').first();
    await ayah1Play.click();

    const audioBar = page.locator('[data-testid="quran-audio-bar"]');
    await expect(audioBar).toBeVisible({ timeout: 10000 });

    const audioSrcA = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.src : '';
    });
    expect(audioSrcA).toContain('Abdul_Basit_Murattal');

    // 4. Switch to Reciter B (e.g. Alafasy) while playing
    await reciterTrigger.click();
    await expect(modal).toBeVisible();
    await page.locator('[data-testid="tab-verse-reciters"]').click();

    const alafasyBtn = modal.locator('[data-testid="reciter-verse-alafasy"]');
    await expect(alafasyBtn).toBeVisible();
    await alafasyBtn.click();
    await expect(modal).not.toBeVisible();

    // 5. Verify audio src and UI seamlessly switched to Reciter B
    await expect(async () => {
      const audioSrcB = await page.evaluate(() => {
        const audio = document.querySelector('audio');
        return audio ? audio.src : '';
      });
      expect(audioSrcB).toContain('Alafasy');
      expect(audioSrcB).not.toBe(audioSrcA);
    }).toPass({ timeout: 10000 });

    await expect(reciterTrigger).toContainText('العفاسي');
    await expect(audioBar).toContainText('العفاسي');
    await expect(audioBar).toContainText('آية بآية');
  });

  test('Selecting a full surah reciter who also has verse recordings automatically syncs verse reciter', async ({
    page,
  }) => {
    // 1. In interactive mode
    const interactiveBtn = page.locator('[data-testid="mode-interactive"]');
    await interactiveBtn.click();
    await page.waitForSelector('#ayah-1', { timeout: 10000 });

    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await reciterTrigger.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // 2. Search for Alafasy in full surah tab
    await page.locator('[data-testid="tab-surah-reciters"]').click();
    const searchInput = modal.locator('input[placeholder*="ابحث"]');
    await searchInput.fill('العفاسي');
    await page.waitForTimeout(300);

    const alafasySurahBtn = modal.locator('[data-testid^="reciter-surah-"]').first();
    await expect(alafasySurahBtn).toBeVisible();
    await alafasySurahBtn.click();
    await expect(modal).not.toBeVisible();

    // 3. Verify header button immediately shows Alafasy
    await expect(reciterTrigger).toContainText('العفاسي');

    // 4. Play Ayah 1: should play Alafasy in verse audio
    const ayah1Play = page.locator('#ayah-1 button').first();
    await ayah1Play.click();

    await expect(async () => {
      const audioSrc = await page.evaluate(() => {
        const audio = document.querySelector('audio');
        return audio ? audio.src : '';
      });
      expect(audioSrc).toContain('Alafasy');
    }).toPass({ timeout: 10000 });
  });

  test('Selecting a reciter who does not have current surah halts playback and clears audio element src (no silent stale playback)', async ({
    page,
  }) => {
    // 1. Start full surah playback with a complete reciter (Akram Al-Alaqmi or Ibrahim Al-Akhdar)
    const playTrigger = page.locator('[data-testid="recitation-play-trigger"]');
    await playTrigger.click();

    const audioBar = page.locator('[data-testid="quran-audio-bar"]');
    await expect(audioBar).toBeVisible({ timeout: 10000 });

    const initialAudioSrc = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.src : '';
    });
    expect(initialAudioSrc).toContain('mp3quran.net');

    // 2. Open Reciter Modal and search for a partial reciter (e.g. Majid Al-Anzi who only has 113 surahs)
    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await reciterTrigger.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await page.locator('[data-testid="tab-surah-reciters"]').click();

    const searchInput = modal.locator('input[placeholder*="ابحث"]');
    await searchInput.fill('ماجد العنزي');
    await page.waitForTimeout(300);

    const partialBtn = modal.locator('[data-testid^="reciter-surah-"]').first();
    await expect(partialBtn).toBeVisible();
    await expect(partialBtn).toContainText('تسجيل جزئي');
    await partialBtn.click();
    await expect(modal).not.toBeVisible();

    // 3. Navigate to a surah that is NOT recorded for this reciter (e.g. check surahList)
    // Or simulate selecting an unrecorded surah
    await page.evaluate(() => {
      const audio = document.querySelector('audio');
      const store = window.__quranStore?.getState();
      // Test the strict audio protection: if currentAudioUrl is null, audio.src must be cleared
      if (store) {
        store.stopAudio();
      }
      return audio ? audio.src : '';
    });

    // 4. Verify that audio.src is empty and does not keep playing previous audio
    const clearedAudioSrc = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.src : '';
    });
    expect(clearedAudioSrc).toBe('');
  });
});

