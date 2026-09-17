import { test, expect } from '@playwright/test';

const MOBILE_WIDTHS = [320, 360, 375, 390, 430];

test.describe('Noor Platform — Quran Mobile Layout & RTL Verse Visibility', () => {
  for (const width of MOBILE_WIDTHS) {
    test(`Prevents horizontal overflow and renders complete verse text at ${width}px`, async ({
      page,
    }) => {
      // Set mobile viewport and Android user agent
      await page.setViewportSize({ width, height: 800 });

      // 1. Navigate to Quran page
      await page.goto('/quran');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });

      // 2. Verify no horizontal overflow on document or body initially
      const initialOverflow = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const docSW = document.documentElement.scrollWidth;
        const bodyW = document.body.clientWidth;
        const bodySW = document.body.scrollWidth;
        return { docW, docSW, bodyW, bodySW };
      });
      expect(initialOverflow.docSW).toBeLessThanOrEqual(initialOverflow.docW);
      expect(initialOverflow.bodySW).toBeLessThanOrEqual(initialOverflow.bodyW);

      // 3. Switch to Interactive mode (آيات تفاعلية)
      const interactiveBtn = page.getByRole('button', { name: /تفاعلية/ });
      await expect(interactiveBtn).toBeVisible({ timeout: 10000 });
      await interactiveBtn.click();

      // Wait for AyahCards to render
      await expect(page.locator('#ayah-1')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#word-token-1-1-1')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#word-token-1-2-1')).toBeVisible({ timeout: 15000 });

      // 4. Assert zero page horizontal overflow in interactive mode
      const interactiveOverflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });
      expect(interactiveOverflow.scrollWidth).toBeLessThanOrEqual(interactiveOverflow.clientWidth);

      // 5. Assert all header buttons are within viewport bounds [0, width]
      const headerButtons = await page.evaluate((w) => {
        const header = document.querySelector('header');
        if (!header) return [];
        const btns = Array.from(header.querySelectorAll('button'));
        return btns.map((b) => {
          const r = b.getBoundingClientRect();
          return {
            text: (b.innerText || b.getAttribute('title') || '').slice(0, 20),
            left: Math.round(r.left),
            right: Math.round(r.right),
            isWithinBounds: r.left >= -1 && r.right <= w + 1,
          };
        });
      }, width);

      expect(headerButtons.length).toBeGreaterThan(0);
      for (const btn of headerButtons) {
        expect(btn.isWithinBounds).toBe(true);
      }

      // 6. Assert AyahCard and verse text tokens (RTL start words) are fully visible without clipping
      const verseWordCheck = await page.evaluate((w) => {
        const bismillah = document.querySelector('#word-token-1-1-1');
        const alhamd = document.querySelector('#word-token-1-2-1');
        const ayah1 = document.querySelector('#ayah-1');
        const ayah2 = document.querySelector('#ayah-2');

        const bismillahRect = bismillah ? bismillah.getBoundingClientRect() : null;
        const alhamdRect = alhamd ? alhamd.getBoundingClientRect() : null;
        const ayah1Rect = ayah1 ? ayah1.getBoundingClientRect() : null;
        const ayah2Rect = ayah2 ? ayah2.getBoundingClientRect() : null;

        return {
          bismillah: bismillahRect
            ? {
                left: Math.round(bismillahRect.left),
                right: Math.round(bismillahRect.right),
                text: bismillah?.textContent,
                withinViewport: bismillahRect.left >= 0 && bismillahRect.right <= w,
                withinCard: ayah1Rect
                  ? bismillahRect.left >= ayah1Rect.left && bismillahRect.right <= ayah1Rect.right
                  : false,
              }
            : null,
          alhamd: alhamdRect
            ? {
                left: Math.round(alhamdRect.left),
                right: Math.round(alhamdRect.right),
                text: alhamd?.textContent,
                withinViewport: alhamdRect.left >= 0 && alhamdRect.right <= w,
                withinCard: ayah2Rect
                  ? alhamdRect.left >= ayah2Rect.left && alhamdRect.right <= ayah2Rect.right
                  : false,
              }
            : null,
        };
      }, width);

      expect(verseWordCheck.bismillah).not.toBeNull();
      expect(verseWordCheck.bismillah?.withinViewport).toBe(true);
      expect(verseWordCheck.bismillah?.withinCard).toBe(true);

      expect(verseWordCheck.alhamd).not.toBeNull();
      expect(verseWordCheck.alhamd?.withinViewport).toBe(true);
      expect(verseWordCheck.alhamd?.withinCard).toBe(true);

      // 7. Verify robustness across font sizes (minimum 22px, maximum 50px)
      for (const testFontSize of [22, 50]) {
        const fontOverflow = await page.evaluate(
          ({ fSize, w }) => {
            document.querySelectorAll('div.font-serif').forEach((el) => {
              (el as HTMLElement).style.fontSize = `${fSize}px`;
              (el as HTMLElement).style.lineHeight = `${fSize * 2.2}px`;
            });
            const bismillah = document.querySelector('#word-token-1-1-1');
            const r = bismillah ? bismillah.getBoundingClientRect() : null;
            return {
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
              bismillahVisible: r ? r.left >= 0 && r.right <= w : false,
            };
          },
          { fSize: testFontSize, w: width }
        );

        expect(fontOverflow.scrollWidth).toBeLessThanOrEqual(fontOverflow.clientWidth);
        expect(fontOverflow.bismillahVisible).toBe(true);
      }
    });
  }
});
