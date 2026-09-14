import { test, expect, Request } from '@playwright/test';

test.describe('Noor Platform — Published Books Reader Flows & CSP Verification', () => {
  test('1. Validates authentic Sahih al-Bukhari identity and executes anchored DOM scroll jump without CSP errors', async ({
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

    // 3. Locate and click on the first Featured Classic book card (Sahih al-Bukhari, linked to authentic shamela-1458)
    const featuredCard = page.locator('section:has-text("أمهات كتب التراث") div[class*="cursor-pointer"]').first();
    await expect(featuredCard).toBeVisible({ timeout: 15000 });
    await expect(featuredCard).toContainText('صحيح البخاري');
    await expect(featuredCard).toContainText('البخاري');
    await featuredCard.click();

    // 4. Verify EBookTextReader modal opens
    const readerContainer = page.locator('div.fixed.inset-0.z-50').first();
    await expect(readerContainer).toBeVisible({ timeout: 15000 });

    // 5. Assert Book Identity First (Title, Author, and authentic Chapter 1 opening Hadith)
    await expect(readerContainer.locator('h1, h2, div').filter({ hasText: 'صحيح البخاري' }).first()).toBeVisible({ timeout: 15000 });

    const articleContent = readerContainer.locator('article').first();
    await expect(articleContent).toBeVisible({ timeout: 25000 });

    // Verify authentic opening Hadith of Sahih al-Bukhari: "إنما الأعمال بالنيات" and narrator chain
    const initialText = (await articleContent.textContent()) || '';
    expect(initialText).toContain('إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ');
    expect(initialText).toContain('الْحُمَيْدِيُّ عَبْدُ اللهِ بْنُ الزُّبَيْرِ');

    // 6. Test authentic Table of Contents
    const tocButton = page.locator('[data-testid="ebook-toc-toggle"]');
    await expect(tocButton).toBeVisible({ timeout: 10000 });
    await tocButton.click();

    // Verify TOC sidebar drawer appears
    const tocSidebar = page.locator('aside:has-text("الأبواب")').first();
    await expect(tocSidebar).toBeVisible({ timeout: 10000 });

    // Locate authentic TOC entry for "كتاب العلم" (pageId: 1418555, chapterIndex: 9)
    const targetTocEntry = tocSidebar.locator('button:has-text("كتاب العلم")').first();
    await expect(targetTocEntry).toBeVisible({ timeout: 15000 });
    await targetTocEntry.click();

    // 7. Assert anchored jumping: target page element exists in DOM, contains authentic exclusive text, and is scrolled into view
    const targetPageElement = readerContainer.locator('[data-page-id="1418555"]').first();
    await expect(targetPageElement).toBeVisible({ timeout: 20000 });
    await expect(targetPageElement).toContainText('كِتَابُ الْعِلْمِ');
    await expect(targetPageElement).toContainText('بَابُ فَضْلِ الْعِلْمِ');

    await expect(async () => {
      const isScrolledIntoView = await targetPageElement.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      expect(isScrolledIntoView).toBe(true);
    }).toPass({ timeout: 15000 });

    // 8. Confirm zero CSP violations or blocked connections occurred throughout
    expect(cspErrors).toHaveLength(0);
  });

  test('2. Book 06485 real Git LFS 17.5MB TOC resolution and unmapped heading guard verifies chapter stability and zero chunk requests', async ({
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

    // 4. Verify book content loads over the network and assert Book Identity
    const articleContent = readerContainer.locator('article').first();
    await expect(articleContent).toBeVisible({ timeout: 35000 });
    await expect(readerContainer.locator('h1, h2, div').filter({ hasText: 'فتاوى الشبكة الإسلامية' }).first()).toBeVisible({ timeout: 20000 });

    // 5. Open authentic TOC sidebar (which resolves the 17.5MB Git LFS toc.json via resolve/main redirect chain)
    const tocButton = page.locator('[data-testid="ebook-toc-toggle"]');
    await expect(tocButton).toBeVisible({ timeout: 10000 });
    await tocButton.click();

    // Verify TOC sidebar drawer appears
    const tocSidebar = page.locator('aside:has-text("الأبواب")').first();
    await expect(tocSidebar).toBeVisible({ timeout: 25000 });

    // Verify authentic TOC item count reflects the full index (92,242 entries)
    await expect(tocSidebar.locator('button:has-text("الأبواب")')).toContainText('92242', { timeout: 30000 });

    // 6. Verify initial chapter is 1 before clicking unmapped heading
    const initialChapterIndicator = readerContainer.locator('text=/الفصل\\s+1\\s+من/');
    await expect(initialChapterIndicator.first()).toBeVisible({ timeout: 10000 });

    // 7. Locate the authentic unmapped heading in the TOC drawer
    const unmappedEntry = tocSidebar.locator('button:has-text("حكم نشر المقالات المقتبسة")').first();
    await expect(unmappedEntry).toBeVisible({ timeout: 15000 });
    await expect(unmappedEntry.locator('text=غير محقق')).toBeVisible();

    // 8. Monitor network requests: ensure clicking unmapped heading dispatches NO chapter chunk request
    let chunkRequested = false;
    const requestListener = (req: Request) => {
      const url = req.url();
      if (url.includes('/chunks/') || url.includes('/chunk_') || url.includes('/chapter_')) {
        chunkRequested = true;
      }
    };
    page.on('request', requestListener);

    // 9. Click unmapped heading
    await unmappedEntry.click();

    // Assert warning toast appears indicating direct jump is not supported for unmapped heading
    const warningToast = page.locator('text=القفز المباشر لهذا العنوان غير مدعوم حالياً');
    await expect(warningToast).toBeVisible({ timeout: 10000 });

    // 10. Assert Chapter Stability: chapter remains 1 and did not navigate
    await expect(initialChapterIndicator.first()).toBeVisible();

    // 11. Assert NO chunk request was dispatched for unmapped heading
    expect(chunkRequested).toBe(false);
    page.off('request', requestListener);

    // 12. Confirm zero CSP violations or blocked connections throughout the 17.5MB Git LFS load & interaction
    expect(cspErrors).toHaveLength(0);
  });
});
