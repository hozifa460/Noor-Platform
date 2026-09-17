import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

declare global {
  interface Window {
    __NOOR_ENABLE_TEST_STORE__?: boolean;
    __quranStore?: {
      getState: () => {
        fontSize: number;
        setFontSize: (size: number) => void;
      };
    };
  }
}

const MOBILE_WIDTHS = [320, 360, 375, 390, 430];
const FONT_SIZES = [22, 32, 50]; // Minimum, default, maximum font sizes

async function setStoreFontSize(page: Page, targetSize: number): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__quranStore), { timeout: 10000 });
  await page.evaluate((size) => {
    window.__quranStore?.getState().setFontSize(size);
  }, targetSize);
  await page.waitForFunction(
    (expected) => window.__quranStore?.getState().fontSize === expected,
    targetSize,
    { timeout: 5000 }
  );
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Noor Platform — Quran Mobile Layout, Control Bar & RTL Wrapping', () => {
  // Activate isolated test store hook per session without unconditional production exposure
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__NOOR_ENABLE_TEST_STORE__ = true;
    });
  });

  // 1. Mobile viewports: Control Bar detection, buttons, readable short Riwayah, zero overflow
  for (const width of MOBILE_WIDTHS) {
    test(`Control bar explicitly identified, buttons tested, readable short name, and no overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/quran');
      await page.waitForLoadState('domcontentloaded');

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      // (1) Explicitly identify the Quran control bar
      const headerBar = page.locator('[data-testid="quran-header-bar"]');
      await expect(headerBar).toBeVisible({ timeout: 15000 });

      // Verify header bar bounding box is within viewport bounds [0, width]
      const headerRect = await headerBar.boundingBox();
      expect(headerRect).not.toBeNull();
      if (headerRect) {
        expect(headerRect.x).toBeGreaterThanOrEqual(-1);
        expect(headerRect.x + headerRect.width).toBeLessThanOrEqual(width + 1);
      }

      // (2) Test all control bar buttons
      const buttonTestIds = [
        'surah-trigger',
        'surah-next-btn',
        'surah-prev-btn',
        'qiraah-trigger',
        'ayah-search-trigger',
        'mode-mushaf-real',
        'mode-interactive',
        'mode-pdf-page',
        'reciter-trigger',
        'recitation-play-trigger',
      ];

      for (const tid of buttonTestIds) {
        const btn = page.locator(`[data-testid="${tid}"]`);
        await expect(btn).toBeVisible({ timeout: 5000 });
        const box = await btn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(-1);
          expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        }
      }

      // Verify readable active Riwayah short name on mobile
      const qiraahBtn = page.locator('[data-testid="qiraah-trigger"]');
      await expect(qiraahBtn).toBeVisible();
      // On mobile viewports, the short name (e.g. "رواية حفص") must be rendered and readable
      const qiraahText = await qiraahBtn.innerText();
      expect(qiraahText).toContain('رواية حفص');

      // Verify short name element is visible and has width > 0
      const shortNameSpan = qiraahBtn.locator('[data-testid="qiraah-short-name"]');
      await expect(shortNameSpan).toBeVisible();
      const shortNameBox = await shortNameSpan.boundingBox();
      expect(shortNameBox).not.toBeNull();
      expect(shortNameBox!.width).toBeGreaterThan(20);

      // (3) Assert zero horizontal overflow on page initially
      const overflow = await page.evaluate(() => {
        return {
          docSW: document.documentElement.scrollWidth,
          docCW: document.documentElement.clientWidth,
          bodySW: document.body.scrollWidth,
          bodyCW: document.body.clientWidth,
        };
      });
      expect(overflow.docSW).toBeLessThanOrEqual(overflow.docCW);
      expect(overflow.bodySW).toBeLessThanOrEqual(overflow.bodyCW);
    });
  }

  // 2. Both Interactive and Continuous modes at min (22px), default (32px), and max (50px) font sizes
  // Strict check: getComputedStyle of actual verse text container MUST equal target size (no silent success)
  test('Tests interactive and continuous modes with actual font sizes (22px, 32px, 50px) and font loading', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/quran');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.fonts.ready);

    const modes = [
      {
        id: 'mode-interactive',
        label: 'interactive',
        contentSelector: '#ayah-1',
        textContainerSelector: '#ayah-1 [data-testid="ayah-text-container"]',
      },
      {
        id: 'mode-mushaf-real',
        label: 'continuous',
        contentSelector: '[data-testid="continuous-ayah-container"]',
        textContainerSelector: '[data-testid="continuous-ayah-container"]',
      },
    ] as const;

    for (const mode of modes) {
      // Switch mode
      const modeBtn = page.locator(`[data-testid="${mode.id}"]`);
      await expect(modeBtn).toBeVisible();
      await modeBtn.click();
      await page.waitForTimeout(300);

      // Wait for content container
      await expect(page.locator(mode.contentSelector).first()).toBeVisible({ timeout: 10000 });

      // Test each font size: 22px, 32px, 50px
      for (const size of FONT_SIZES) {
        await setStoreFontSize(page, size);

        // 1. Strict store verification
        const storeSize = await page.evaluate(() => {
          const store = window.__quranStore;
          return store ? store.getState().fontSize : null;
        });
        expect(storeSize).toBe(size);

        // 2. Strict getComputedStyle verification on actual verse text container (prevents silent success)
        const textContainer = page.locator(mode.textContainerSelector).first();
        await expect(textContainer).toBeVisible();
        await page.waitForFunction(
          ({ selector, expectedSize }) => {
            const el = document.querySelector(selector);
            return el ? window.getComputedStyle(el).fontSize === `${expectedSize}px` : false;
          },
          { selector: mode.textContainerSelector, expectedSize: size },
          { timeout: 5000 }
        );

        const computedFs = await textContainer.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });
        expect(computedFs).toBe(`${size}px`);

        // 3. Verify zero horizontal overflow at 320px
        const overflow = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          };
        });
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      }
    }
  });

  // 3. Long Ayah (Surah 2:255) and Long Word (Surah 15:22) wrapping and non-clipping at 320px with max font size (50px)
  test('Verifies sound text wrapping and zero clipping for long Ayah and longest word at 320px & max font (50px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });

    // --- Part A: Long Ayah (Ayat al-Kursi, Surah 2:255) ---
    await page.goto('/quran?surah=2&ayah=255');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.fonts.ready);

    // Switch to interactive mode
    const interactiveBtn = page.locator('[data-testid="mode-interactive"]');
    await expect(interactiveBtn).toBeVisible();
    await interactiveBtn.click();

    // Set maximum font size (50px) via store
    await setStoreFontSize(page, 50);

    // Verify Ayah 255 exists and is visible
    const ayah255 = page.locator('#ayah-255');
    await expect(ayah255).toBeVisible({ timeout: 15000 });

    // Strict check: getComputedStyle of Ayah 255 text container MUST equal 50px
    const ayah255Text = ayah255.locator('[data-testid="ayah-text-container"]');
    await expect(ayah255Text).toBeVisible();
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#ayah-255 [data-testid="ayah-text-container"]');
        return el ? window.getComputedStyle(el).fontSize === '50px' : false;
      },
      { timeout: 5000 }
    );
    const computedAyah255Fs = await ayah255Text.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(computedAyah255Fs).toBe('50px');

    // Check bounds of Ayah 255 card and text container
    const ayah255Bounds = await page.evaluate(() => {
      const card = document.querySelector('#ayah-255') as HTMLElement;
      if (!card) return null;
      const cardRect = card.getBoundingClientRect();
      const textDiv = card.querySelector('[data-testid="ayah-text-container"]') as HTMLElement;
      const textRect = textDiv ? textDiv.getBoundingClientRect() : null;

      return {
        cardLeft: Math.round(cardRect.left),
        cardRight: Math.round(cardRect.right),
        cardWidth: Math.round(cardRect.width),
        textLeft: textRect ? Math.round(textRect.left) : null,
        textRight: textRect ? Math.round(textRect.right) : null,
        pageScrollWidth: document.documentElement.scrollWidth,
        pageClientWidth: document.documentElement.clientWidth,
      };
    });

    expect(ayah255Bounds).not.toBeNull();
    expect(ayah255Bounds!.pageScrollWidth).toBeLessThanOrEqual(ayah255Bounds!.pageClientWidth);
    expect(ayah255Bounds!.cardLeft).toBeGreaterThanOrEqual(0);
    expect(ayah255Bounds!.cardRight).toBeLessThanOrEqual(321);
    // Text container is fully within card bounds
    if (ayah255Bounds!.textLeft !== null && ayah255Bounds!.textRight !== null) {
      expect(ayah255Bounds!.textLeft).toBeGreaterThanOrEqual(ayah255Bounds!.cardLeft - 1);
      expect(ayah255Bounds!.textRight).toBeLessThanOrEqual(ayah255Bounds!.cardRight + 1);
    }

    // --- Part B: Longest Word (فَأَسْقَيْنَٰكُمُوهُ in Surah 15:22) ---
    await page.goto('/quran?surah=15&ayah=22');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.fonts.ready);

    // Ensure interactive mode and max font size (50px)
    await page.locator('[data-testid="mode-interactive"]').click();
    await setStoreFontSize(page, 50);

    const ayah22 = page.locator('#ayah-22');
    await expect(ayah22).toBeVisible({ timeout: 15000 });

    // Strict check: getComputedStyle of Ayah 22 text container MUST equal 50px
    const ayah22Text = ayah22.locator('[data-testid="ayah-text-container"]');
    await expect(ayah22Text).toBeVisible();
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#ayah-22 [data-testid="ayah-text-container"]');
        return el ? window.getComputedStyle(el).fontSize === '50px' : false;
      },
      { timeout: 5000 }
    );
    const computedAyah22Fs = await ayah22Text.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(computedAyah22Fs).toBe('50px');

    // Find the longest word span inside Ayah 22
    const wordCheck = await page.evaluate(() => {
      const card = document.querySelector('#ayah-22') as HTMLElement;
      if (!card) return null;
      const cardRect = card.getBoundingClientRect();

      // Find token matching the longest word
      const spans = Array.from(card.querySelectorAll('span'));
      const longestWordSpan = spans.find((s) => s.textContent?.includes('فَأَسْقَيْنَٰكُمُوهُ'));
      const wordRect = longestWordSpan ? longestWordSpan.getBoundingClientRect() : null;

      return {
        cardLeft: Math.round(cardRect.left),
        cardRight: Math.round(cardRect.right),
        wordFound: Boolean(longestWordSpan),
        wordLeft: wordRect ? Math.round(wordRect.left) : null,
        wordRight: wordRect ? Math.round(wordRect.right) : null,
        wordWidth: wordRect ? Math.round(wordRect.width) : null,
        pageScrollWidth: document.documentElement.scrollWidth,
        pageClientWidth: document.documentElement.clientWidth,
      };
    });

    expect(wordCheck).not.toBeNull();
    expect(wordCheck!.wordFound).toBe(true);
    expect(wordCheck!.pageScrollWidth).toBeLessThanOrEqual(wordCheck!.pageClientWidth);
    // Long word does not overflow the card or the viewport
    expect(wordCheck!.wordLeft!).toBeGreaterThanOrEqual(wordCheck!.cardLeft - 1);
    expect(wordCheck!.wordRight!).toBeLessThanOrEqual(wordCheck!.cardRight + 1);

    // --- Part C: Continuous Mode with Max Font Size (50px) ---
    await page.locator('[data-testid="mode-mushaf-real"]').click();
    await setStoreFontSize(page, 50);

    const continuousContainer = page.locator('[data-testid="continuous-ayah-container"]');
    await expect(continuousContainer).toBeVisible({ timeout: 15000 });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="continuous-ayah-container"]');
        return el ? window.getComputedStyle(el).fontSize === '50px' : false;
      },
      { timeout: 5000 }
    );
    const computedContinuousFs = await continuousContainer.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(computedContinuousFs).toBe('50px');

    const continuousOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(continuousOverflow.scrollWidth).toBeLessThanOrEqual(continuousOverflow.clientWidth);
  });

  // 4. Capture updated screenshots at 320px with maximum font size (50px) strictly after getComputedStyle verification
  test('Captures screenshots for interactive and continuous modes at 320px with maximum font (50px) and logs font measurement', async ({
    page,
  }) => {
    const scratchDir = path.resolve(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/quran');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.fonts.ready);

    // 1. Capture Interactive Mode at 320px / 50px font
    const interactiveBtn = page.locator('[data-testid="mode-interactive"]');
    await interactiveBtn.click();
    const interactiveAyahText = page.locator('#ayah-1 [data-testid="ayah-text-container"]').first();
    await expect(interactiveAyahText).toBeVisible({ timeout: 10000 });

    // Set font size to 50px
    await setStoreFontSize(page, 50);

    // Strict verification of computed font size on actual verse text (NOT surah header)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#ayah-1 [data-testid="ayah-text-container"]');
        return el ? window.getComputedStyle(el).fontSize === '50px' : false;
      },
      { timeout: 5000 }
    );
    const interactiveComputedFs = await interactiveAyahText.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(interactiveComputedFs).toBe('50px');
    console.log(`[VERIFIED FONT MEASUREMENT] Interactive Mode text fontSize: ${interactiveComputedFs}`);

    await page.waitForTimeout(500);
    const interactiveScreenshotPath = path.join(scratchDir, 'after_320_interactive_maxfont.png');
    await page.screenshot({ path: interactiveScreenshotPath, fullPage: false });
    expect(fs.existsSync(interactiveScreenshotPath)).toBe(true);

    // 2. Capture Continuous Mode at 320px / 50px font
    const mushafBtn = page.locator('[data-testid="mode-mushaf-real"]');
    await mushafBtn.click();
    const continuousAyahText = page.locator('[data-testid="continuous-ayah-container"]').first();
    await expect(continuousAyahText).toBeVisible({ timeout: 10000 });

    // Ensure font size is 50px
    await setStoreFontSize(page, 50);

    // Strict verification of computed font size on actual continuous verse text (NOT surah header)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="continuous-ayah-container"]');
        return el ? window.getComputedStyle(el).fontSize === '50px' : false;
      },
      { timeout: 5000 }
    );
    const continuousComputedFs = await continuousAyahText.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(continuousComputedFs).toBe('50px');
    console.log(`[VERIFIED FONT MEASUREMENT] Continuous Mode text fontSize: ${continuousComputedFs}`);

    await page.waitForTimeout(500);
    const mushafScreenshotPath = path.join(scratchDir, 'after_320_mushaf_maxfont.png');
    await page.screenshot({ path: mushafScreenshotPath, fullPage: false });
    expect(fs.existsSync(mushafScreenshotPath)).toBe(true);
  });
});
