import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Published Books Reader Flows & CSP Verification', () => {
  test('1. Anchored real DOM jump test: navigates authentic TOC, verifies target pageId 1112223 and exclusive text in viewport without CSP errors', async ({
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

    // 6. Test authentic Table of Contents
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

    // 7. Click the specific targeted entry: "الوسطية في التشريع" (pageId: 1112223)
    const targetTocEntry = tocSidebar.locator('button:has-text("الوسطية في التشريع")').first();
    await expect(targetTocEntry).toBeVisible({ timeout: 10000 });
    await targetTocEntry.click();

    // 8. Assert anchored jumping: target page element exists in DOM, contains exclusive text, and is scrolled into view
    const targetPageElement = readerContainer.locator('[data-page-id="1112223"]').first();
    await expect(targetPageElement).toBeVisible({ timeout: 15000 });
    await expect(targetPageElement).toContainText('ونجدها في التشريع');

    await expect(async () => {
      const isScrolledIntoView = await targetPageElement.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      expect(isScrolledIntoView).toBe(true);
    }).toPass({ timeout: 15000 });

    // 9. Confirm zero CSP violations or blocked connections occurred throughout
    expect(cspErrors).toHaveLength(0);
  });

  test('2. Book 06485 real Git LFS 17.5MB TOC resolution and unmapped heading guard test without CSP errors', async ({
    page,
  }) => {
    test.setTimeout(90000);

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

    // 2. Navigate to Books route with book parameter for book 06485 (فتاوى الشبكة الإسلامية)
    await page.goto('/books?book=shamela-6485');

    // 3. Verify EBookTextReader modal opens
    const readerContainer = page.locator('div.fixed.inset-0.z-50').first();
    await expect(readerContainer).toBeVisible({ timeout: 15000 });

    // 4. Verify book content loads over the network
    const articleContent = readerContainer.locator('article').first();
    await expect(articleContent).toBeVisible({ timeout: 35000 });

    // 5. Open authentic TOC sidebar (which resolves the 17.5MB Git LFS toc.json via resolve/main redirect chain)
    const tocButton = page.locator('[data-testid="ebook-toc-toggle"]');
    await expect(tocButton).toBeVisible({ timeout: 10000 });
    await tocButton.click();

    // Verify TOC sidebar drawer appears
    const tocSidebar = page.locator('aside:has-text("الأبواب")').first();
    await expect(tocSidebar).toBeVisible({ timeout: 25000 });

    // Verify authentic TOC item count reflects the full index (92,242 entries)
    await expect(tocSidebar.locator('button:has-text("الأبواب")')).toContainText('92242', { timeout: 30000 });

    // 6. Locate the authentic unmapped heading in the TOC drawer
    const unmappedEntry = tocSidebar.locator('button:has-text("حكم نشر المقالات المقتبسة")').first();
    await expect(unmappedEntry).toBeVisible({ timeout: 15000 });
    await expect(unmappedEntry.locator('text=غير محقق')).toBeVisible();

    // 7. Click unmapped heading and verify guard behavior
    await unmappedEntry.click();

    // Assert warning toast appears indicating direct jump is not supported for unmapped heading
    const warningToast = page.locator('text=القفز المباشر لهذا العنوان غير مدعوم حالياً');
    await expect(warningToast).toBeVisible({ timeout: 10000 });

    // 8. Confirm zero CSP violations or blocked connections throughout the 17.5MB Git LFS load & interaction
    expect(cspErrors).toHaveLength(0);
  });
});
