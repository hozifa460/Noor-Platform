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

    // 2. Set up targeted network request monitor for authentic book chapter chunks (/chapters/)
    const isChapterChunkUrl = (url: string): boolean => {
      return url.includes('/chapters/') || (url.includes('/chunks/') && !url.includes('_next'));
    };

    const capturedChapterRequests: string[] = [];
    const requestListener = (req: Request) => {
      const url = req.url();
      if (isChapterChunkUrl(url)) {
        capturedChapterRequests.push(url);
      }
    };
    page.on('request', requestListener);

    // 3. Navigate to Books route with book parameter for book 06485 (فتاوى الشبكة الإسلامية)
    await page.goto('/books?book=shamela-6485');

    // 4. Verify EBookTextReader modal opens
    const readerContainer = page.locator('div.fixed.inset-0.z-50').first();
    await expect(readerContainer).toBeVisible({ timeout: 15000 });

    // 5. Verify book content loads over the network and assert Book Identity
    const articleContent = readerContainer.locator('article').first();
    await expect(articleContent).toBeVisible({ timeout: 35000 });
    await expect(readerContainer.locator('h1, h2, div').filter({ hasText: 'فتاوى الشبكة الإسلامية' }).first()).toBeVisible({ timeout: 20000 });

    // Targeted Proof 1: Verify the request monitor successfully captured the authentic initial chapter 1 chunk request (/chapters/000.json)
    expect(capturedChapterRequests.length).toBeGreaterThan(0);
    expect(capturedChapterRequests.some((u) => u.includes('/chapters/000.json'))).toBe(true);

    // Targeted Proof 2: Advance to next chapter and prove the monitor dynamically captures the chapter 2 chunk request (/chapters/001.json)
    capturedChapterRequests.length = 0;
    const nextChapterBtn = readerContainer.locator('button:has-text("الفصل التالي")').first();
    await expect(nextChapterBtn).toBeVisible({ timeout: 10000 });
    await nextChapterBtn.click();

    const chapter2Indicator = readerContainer.locator('text=/الفصل\\s+2\\s+من/').first();
    await expect(chapter2Indicator).toBeVisible({ timeout: 20000 });
    expect(capturedChapterRequests.length).toBeGreaterThan(0);
    expect(capturedChapterRequests.some((u) => u.includes('/chapters/001.json'))).toBe(true);

    // 6. Open authentic TOC sidebar (which resolves the 17.5MB Git LFS toc.json via resolve/main redirect chain)
    const tocButton = page.locator('[data-testid="ebook-toc-toggle"]');
    await expect(tocButton).toBeVisible({ timeout: 10000 });
    await tocButton.click();

    // Verify TOC sidebar drawer appears
    const tocSidebar = page.locator('aside:has-text("الأبواب")').first();
    await expect(tocSidebar).toBeVisible({ timeout: 25000 });

    // Verify authentic TOC item count reflects the full index (92,242 entries)
    await expect(tocSidebar.locator('button:has-text("الأبواب")').first()).toContainText('92242', { timeout: 30000 });

    // 7. Locate the authentic unmapped heading in the TOC drawer
    const unmappedEntry = tocSidebar.locator('button:has-text("حكم نشر المقالات المقتبسة")').first();
    await expect(unmappedEntry).toBeVisible({ timeout: 15000 });
    await expect(unmappedEntry.locator('text=غير محقق').first()).toBeVisible();

    // 8. Clear captured requests before clicking unmapped heading to strictly isolate its effect
    capturedChapterRequests.length = 0;

    // 9. Click unmapped heading
    await unmappedEntry.click();

    // Assert warning toast appears indicating direct jump is not supported for unmapped heading
    const warningToast = page.locator('text=القفز المباشر لهذا العنوان غير مدعوم حالياً').first();
    await expect(warningToast).toBeVisible({ timeout: 10000 });

    // 10. Assert Chapter Stability: chapter remains 2 and did not navigate
    await expect(chapter2Indicator).toBeVisible();

    // 11. Assert NO chapter chunk request was dispatched for unmapped heading
    expect(capturedChapterRequests).toHaveLength(0);
    page.off('request', requestListener);

    // 12. Confirm zero CSP violations or blocked connections throughout the 17.5MB Git LFS load & interaction
    expect(cspErrors).toHaveLength(0);
  });
});
