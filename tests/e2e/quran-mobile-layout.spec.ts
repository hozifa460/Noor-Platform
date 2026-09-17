import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

declare global {
  interface Window {
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

test.describe('Noor Platform — Quran Mobile Layout, Control Bar & RTL Wrapping', () => {
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
      const shortNameSpan = qiraahBtn.locator('span.sm\\:hidden');
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
  test('Tests interactive and continuous modes with actual font sizes (22px, 32px, 50px) and font loading', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/quran');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => document.fonts.ready);

    const modes = [
      { id: 'mode-interactive', label: 'interactive', ayahSelector: '#ayah-1' },
      { id: 'mode-mushaf-real', label: 'continuous', ayahSelector: 'div.font-quran' },
    ] as const;

    for (const mode of modes) {
      // Switch mode
      const modeBtn = page.locator(`[data-testid="${mode.id}"]`);
      await expect(modeBtn).toBeVisible();
      await modeBtn.click();
      await page.waitForTimeout(300);

      // Wait for content
      await expect(page.locator(mode.ayahSelector).first()).toBeVisible({ timeout: 10000 });

      // Test each font size: 22px, 32px, 50px using the actual store setting
      for (const size of FONT_SIZES) {
        await page.evaluate((fSize) => {
          const store = window.__quranStore;
          if (store) {
            store.getState().setFontSize(fSize);
          }
        }, size);

        // Explicitly wait for fonts to load / re-render
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);

        // Verify font size in store
        const currentSize = await page.evaluate(() => {
          const store = window.__quranStore;
          return store ? store.getState().fontSize : null;
        });
        expect(currentSize).toBe(size);

        // Verify zero horizontal overflow at 320px
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

    // Switch to interactive mode if not already
    const interactiveBtn = page.locator('[data-testid="mode-interactive"]');
    await expect(interactiveBtn).toBeVisible();
    await interactiveBtn.click();

    // Set maximum font size (50px) via store
    await page.evaluate(() => {
      const store = window.__quranStore;
      if (store) store.getState().setFontSize(50);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    // Verify Ayah 255 exists and is visible
    const ayah255 = page.locator('#ayah-255');
    await expect(ayah255).toBeVisible({ timeout: 15000 });

    // Check bounds of Ayah 255 card and text
    const ayah255Bounds = await page.evaluate(() => {
      const card = document.querySelector('#ayah-255') as HTMLElement;
      if (!card) return null;
      const cardRect = card.getBoundingClientRect();
      const textDiv = card.querySelector('div.font-serif') as HTMLElement;
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
    await page.evaluate(() => {
      const store = window.__quranStore;
      if (store) store.getState().setFontSize(50);
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const ayah22 = page.locator('#ayah-22');
    await expect(ayah22).toBeVisible({ timeout: 15000 });

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
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const continuousOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(continuousOverflow.scrollWidth).toBeLessThanOrEqual(continuousOverflow.clientWidth);
  });

  // 4. Capture updated screenshots at 320px with maximum font size (50px) for both states
  test('Captures screenshots for interactive and continuous modes at 320px with maximum font (50px)', async ({
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

    // Set maximum font size (50px) via store
    await page.evaluate(() => {
      const store = window.__quranStore;
      if (store) store.getState().setFontSize(50);
    });
    await page.evaluate(() => document.fonts.ready);

    // 1. Capture Interactive Mode at 320px / 50px font
    const interactiveBtn = page.locator('[data-testid="mode-interactive"]');
    await interactiveBtn.click();
    await expect(page.locator('#ayah-1')).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    const interactiveScreenshotPath = path.join(scratchDir, 'after_320_interactive_maxfont.png');
    await page.screenshot({ path: interactiveScreenshotPath, fullPage: false });
    expect(fs.existsSync(interactiveScreenshotPath)).toBe(true);

    // 2. Capture Continuous Mode at 320px / 50px font
    const mushafBtn = page.locator('[data-testid="mode-mushaf-real"]');
    await mushafBtn.click();
    await expect(page.locator('div.font-quran').first()).toBeVisible({ timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    const mushafScreenshotPath = path.join(scratchDir, 'after_320_mushaf_maxfont.png');
    await page.screenshot({ path: mushafScreenshotPath, fullPage: false });
    expect(fs.existsSync(mushafScreenshotPath)).toBe(true);
  });
});
