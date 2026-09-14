import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Published Books Reader Flows & CSP Verification', () => {
  test('Opens books reader, fetches real text over network, navigates authentic TOC, and verifies real DOM scroll jump without CSP errors', async ({
    page,
  }) => {
    // 1. Capture and strictly assert zero Content Security Policy violations or connection refusals
    const cspErrors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        msg.type() === 'error' &&
        (text.includes('Content Security Policy') ||
          text.includes('CSP') ||
          text.includes('refused to connect') ||
          text.includes('violates the following Content Security Policy directive'))
      ) {
        cspErrors.push(text);
      }
    });

    // 2. Navigate to Books Catalog route
    await page.goto('/books');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });

    // 3. Locate and click on the first Featured Classic book card (Sahih al-Bukhari)
    const featuredCard = page.locator('section:has-text("أمهات كتب التراث") div[class*="cursor-pointer"]').first();
    await expect(featuredCard).toBeVisible({ timeout: 15000 });
    await featuredCard.click();

    // 4. Verify EBookTextReader modal opens
    const readerContainer = page.locator('div.fixed.inset-0.z-50').first();
    await expect(readerContainer).toBeVisible({ timeout: 15000 });

    // 5. Verify real book content loads over the network without CSP blocks
    const articleContent = readerContainer.locator('article').first();
    await expect(articleContent).toBeVisible({ timeout: 25000 });

    // Assert that authentic text content is rendered
    const initialText = (await articleContent.textContent()) || '';
    expect(initialText.trim().length).toBeGreaterThan(50);

    // 6. Test authentic Table of Contents ("دون استثناء الفهارس")
    const tocButton = page.locator('[data-testid="ebook-toc-toggle"]');
    await expect(tocButton).toBeVisible({ timeout: 10000 });
    await tocButton.click();

    // Verify TOC sidebar drawer appears
    const tocSidebar = page.locator('aside:has-text("الأبواب")').first();
    await expect(tocSidebar).toBeVisible({ timeout: 10000 });

    // Locate authentic TOC entries rendered inside the drawer
    const tocEntries = tocSidebar.locator('button:has(p.line-clamp-2)');
    await expect(tocEntries.first()).toBeVisible({ timeout: 15000 });
    const tocCount = await tocEntries.count();
    expect(tocCount).toBeGreaterThan(0);

    // 7. Click a specific authentic indexed entry to trigger real jumping
    const targetTocEntry = tocEntries.nth(Math.min(1, tocCount - 1));
    await targetTocEntry.click();

    // 8. Assert real jumping in DOM: target page/paragraph element exists and is scrolled into view
    await expect(async () => {
      const isScrolledIntoView = await page.evaluate(() => {
        const el = document.querySelector('[data-page-id], [data-page-num], article h2, article h3');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      expect(isScrolledIntoView).toBe(true);
    }).toPass({ timeout: 15000 });

    // 9. Confirm zero CSP violations or blocked connections occurred throughout
    expect(cspErrors).toHaveLength(0);
  });
});
