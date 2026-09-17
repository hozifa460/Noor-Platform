import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Quran Reciter Switching & Audio Sync Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Enable store for test inspection and open Quran page
    await page.addInitScript(() => {
      window.__NOOR_ENABLE_TEST_STORE__ = true;
    });
    await page.goto('/quran');
    await page.waitForSelector('[data-testid="quran-header-bar"]', { timeout: 15000 });
  });

  test('Switching between two different reciters in Full Surah mode updates name, audio URL, and advances currentTime', async ({
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
    await expect(async () => {
      const src = await page.evaluate(() => document.querySelector('audio')?.src || '');
      expect(src).toContain('mp3quran.net');
    }).toPass({ timeout: 10000 });

    const initialAudioSrc = await page.evaluate(() => document.querySelector('audio')?.src || '');
    await expect(reciterTrigger).toContainText(firstReciterName);
    await expect(audioBar).toContainText(firstReciterName);

    // Verify currentTime progression for Reciter A
    await expect.poll(async () => {
      return await page.evaluate(() => document.querySelector('audio')?.currentTime || 0);
    }, { timeout: 10000 }).toBeGreaterThan(0);

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
      const updatedAudioSrc = await page.evaluate(() => document.querySelector('audio')?.src || '');
      expect(updatedAudioSrc).toContain('mp3quran.net');
      expect(updatedAudioSrc).not.toBe(initialAudioSrc);
    }).toPass({ timeout: 10000 });

    await expect(reciterTrigger).toContainText(secondReciterName);
    await expect(audioBar).toContainText(secondReciterName);
    await expect(audioBar).toContainText('سورة كاملة');

    // Verify currentTime progression for Reciter B
    await expect.poll(async () => {
      return await page.evaluate(() => document.querySelector('audio')?.currentTime || 0);
    }, { timeout: 10000 }).toBeGreaterThan(0);
  });

  test('Switching between two verse reciters in interactive mode updates name, audio URL, and advances currentTime', async ({
    page,
  }) => {
    // 1. Switch to interactive mode
    const interactiveBtn = page.locator('[data-testid="mode-interactive"]');
    await interactiveBtn.click();
    await page.waitForSelector('#ayah-1', { timeout: 10000 });

    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await expect(reciterTrigger).toBeVisible();

    // 2. Open Reciter Modal and select Reciter A (Abdul Basit)
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

    await expect(async () => {
      const src = await page.evaluate(() => document.querySelector('audio')?.src || '');
      expect(src).toContain('Abdul_Basit_Murattal');
    }).toPass({ timeout: 10000 });

    const audioSrcA = await page.evaluate(() => document.querySelector('audio')?.src || '');

    // Verify currentTime progression for Reciter A
    await expect.poll(async () => {
      return await page.evaluate(() => document.querySelector('audio')?.currentTime || 0);
    }, { timeout: 10000 }).toBeGreaterThan(0);

    // 4. Switch to Reciter B (Alafasy) while playing
    await reciterTrigger.click();
    await expect(modal).toBeVisible();
    await page.locator('[data-testid="tab-verse-reciters"]').click();

    const alafasyBtn = modal.locator('[data-testid="reciter-verse-alafasy"]');
    await expect(alafasyBtn).toBeVisible();
    await alafasyBtn.click();
    await expect(modal).not.toBeVisible();

    // 5. Verify audio src and UI seamlessly switched to Reciter B
    await expect(async () => {
      const audioSrcB = await page.evaluate(() => document.querySelector('audio')?.src || '');
      expect(audioSrcB).toContain('Alafasy');
      expect(audioSrcB).not.toBe(audioSrcA);
    }).toPass({ timeout: 10000 });

    await expect(reciterTrigger).toContainText('العفاسي');
    await expect(audioBar).toContainText('العفاسي');
    await expect(audioBar).toContainText('آية بآية');

    // Verify currentTime progression for Reciter B
    await expect.poll(async () => {
      return await page.evaluate(() => document.querySelector('audio')?.currentTime || 0);
    }, { timeout: 10000 }).toBeGreaterThan(0);
  });

  test('Switching reciter while stopped updates selection without triggering auto-play', async ({
    page,
  }) => {
    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await expect(reciterTrigger).toBeVisible();

    // Ensure audio is initially stopped
    const initialPaused = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.paused : true;
    });
    expect(initialPaused).toBe(true);

    // 1. Open Reciter Modal while stopped
    await reciterTrigger.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select second reciter in full surah tab
    await page.locator('[data-testid="tab-surah-reciters"]').click();
    const secondSurahBtn = modal.locator('[data-testid^="reciter-surah-"]').nth(1);
    const targetName = (await secondSurahBtn.locator('.text-sm').innerText()).trim();
    await secondSurahBtn.click();
    await expect(modal).not.toBeVisible();

    // 2. Assert header button updated
    await expect(reciterTrigger).toContainText(targetName);

    // 3. Assert audio remained stopped and did NOT auto-play
    await page.waitForTimeout(500);
    const isPausedAfterSwitch = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.paused : true;
    });
    expect(isPausedAfterSwitch).toBe(true);

    const currentTimeAfterSwitch = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? audio.currentTime : 0;
    });
    expect(currentTimeAfterSwitch).toBe(0);

    const audioBar = page.locator('[data-testid="quran-audio-bar"]');
    await expect(audioBar).not.toBeVisible();
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
      const audioSrc = await page.evaluate(() => document.querySelector('audio')?.src || '');
      expect(audioSrc).toContain('Alafasy');
    }).toPass({ timeout: 10000 });
  });

  test('Navigating to an unrecorded surah halts audio, clears audio.src, and sends 0 requests for the unrecorded surah (002.mp3) without calling stopAudio()', async ({
    page,
  }) => {
    // 1. Start at Surah 1 (Al-Fatihah)
    const activeSurahHeader = page.locator('[data-testid="quran-header-bar"]');
    await expect(activeSurahHeader).toBeVisible();

    // 2. Select Majid Al-Anzi (reciterId: 100) who has Surah 1 but LACKS Surah 2 (Al-Baqarah)
    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await reciterTrigger.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await page.locator('[data-testid="tab-surah-reciters"]').click();

    const searchInput = modal.locator('input[placeholder*="ابحث"]');
    await searchInput.fill('ماجد العنزي');
    await page.waitForTimeout(300);

    const majidBtn = modal.locator('[data-testid^="reciter-surah-100"]');
    await expect(majidBtn).toBeVisible();
    await expect(majidBtn).toContainText('تسجيل جزئي');
    await majidBtn.click();
    await expect(modal).not.toBeVisible();

    // 3. Start full surah playback for Surah 1
    const playTrigger = page.locator('[data-testid="recitation-play-trigger"]');
    await playTrigger.click();

    const audioBar = page.locator('[data-testid="quran-audio-bar"]');
    await expect(audioBar).toBeVisible({ timeout: 10000 });

    // Verify Surah 1 is playing
    await expect(async () => {
      const src = await page.evaluate(() => document.querySelector('audio')?.src || '');
      expect(src).toContain('majd_onazi');
      expect(src).toContain('001.mp3');
    }).toPass({ timeout: 10000 });

    // Track network requests dispatched after navigation to verify 0 requests are sent for missing Surah 2
    const postNavAudioRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.mp3') || url.includes('majd_onazi')) {
        postNavAudioRequests.push(url);
      }
    });

    // 4. Navigate to Surah 2 using the actual Next Surah button in the UI
    // Strictly NO test invocation of stopAudio()
    const nextSurahBtn = page.locator('[data-testid="surah-next-btn"]');
    await expect(nextSurahBtn).toBeVisible();
    await nextSurahBtn.click();

    // Verify navigation occurred to Surah 2
    await expect(page.locator('text=سورة البقرة').first()).toBeVisible({ timeout: 10000 });

    // 5. Assert that audio is halted, audio.src is cleared, and audio is paused
    await expect(async () => {
      const audioState = await page.evaluate(() => {
        const audio = document.querySelector('audio');
        return {
          src: audio ? audio.getAttribute('src') || audio.src : '',
          paused: audio ? audio.paused : true,
        };
      });
      // audio.src must be cleared (empty string)
      expect(audioState.src).toBe('');
      expect(audioState.paused).toBe(true);
    }).toPass({ timeout: 10000 });

    // 6. Verify 0 requests were sent for the unrecorded surah (002.mp3) or to majd_onazi after navigation
    const surah2Requests = postNavAudioRequests.filter((url) => url.includes('002.mp3'));
    expect(surah2Requests.length).toBe(0);
    const reciterRequestsAfterNav = postNavAudioRequests.filter((url) => url.includes('majd_onazi'));
    expect(reciterRequestsAfterNav.length).toBe(0);
  });

  test('Selecting Muhammad Ayyoub recording 320 in QuranHubView and then picking his verse reciter in QuickAyahMenu preserves recording 320 (fails if 3rd arg is removed)', async ({
    page,
  }) => {
    // 1. Open Reciter Modal and select Muhammad Ayyoub recording 320 (تلاوة مميزة)
    const reciterTrigger = page.locator('[data-testid="reciter-trigger"]');
    await expect(reciterTrigger).toBeVisible();
    await reciterTrigger.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await page.locator('[data-testid="tab-surah-reciters"]').click();
    const searchInput = modal.locator('input[placeholder*="ابحث"]');
    await searchInput.fill('محمد أيوب');
    await page.waitForTimeout(300);

    // Locate recording 320 button
    const ayyoub320Btn = modal.locator('[data-testid="reciter-surah-109-320"]');
    await expect(ayyoub320Btn).toBeVisible();
    await ayyoub320Btn.click();
    await expect(modal).not.toBeVisible();

    // Verify initial selection is recording 320
    const initialMoshafId = await page.evaluate(
      () => window.__NOOR_ACTIVE_RIWAYAH_RECITER__?.moshafId
    );
    expect(initialMoshafId).toBe(320);

    // 2. Ensure continuous Mus-haf reading mode is active (where QuickAyahMenu operates)
    const mushafRealBtn = page.locator('[data-testid="mode-mushaf-real"]');
    await mushafRealBtn.click();
    await page.waitForSelector('[data-testid="continuous-ayah-container"]', { timeout: 10000 });

    // 3. Open QuickAyahMenu by clicking on the first ayah in continuous reader
    const firstAyah = page.locator('[data-testid="continuous-ayah-container"] > span').first();
    await expect(firstAyah).toBeVisible();
    await firstAyah.click();

    // 4. In QuickAyahMenu, select Muhammad Ayyoub from the verse reciters dropdown
    const quickMenuSelect = page.locator('[data-testid="quick-menu-reciter-select"]');
    await expect(quickMenuSelect).toBeVisible();
    await quickMenuSelect.selectOption('ayyoub');

    // 5. CRITICAL VERIFICATION:
    // Through the actual QuranHubView wiring, activeRiwayahReciter MUST RETAIN recording 320
    // If the 3rd argument in QuranHubView.tsx is omitted, findMatchingFullSurahReciter would revert to default 109!
    await expect.poll(async () => {
      return await page.evaluate(() => window.__NOOR_ACTIVE_RIWAYAH_RECITER__?.moshafId);
    }, { timeout: 5000 }).toBe(320);

    // Close QuickAyahMenu to uncover top player controls
    const closeQuickMenuBtn = page.locator('[data-testid="quick-menu-close-btn"]');
    await closeQuickMenuBtn.click();
    await expect(page.locator('[data-testid="quick-menu-reciter-select"]')).not.toBeVisible();

    // Also verify via full surah playback: audio src must point to ayyub_special (320), NOT ayyub (109)
    const playTrigger = page.locator('[data-testid="recitation-play-trigger"]');
    await playTrigger.click();

    await expect(async () => {
      const src = await page.evaluate(() => document.querySelector('audio')?.src || '');
      expect(src).toContain('ayyoub2');
      expect(src).not.toContain('/ayyub/001.mp3');
    }).toPass({ timeout: 10000 });
  });
});
