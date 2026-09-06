import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Search Flows & Results Assertions', () => {
  test('Executes debounced search in Hadith Hub, validates matched cards, and checks empty state', async ({
    page,
  }) => {
    // 1. Navigate to Hadith Hub
    await page.goto('/hadith');
    await expect(page.locator('main').first()).toBeVisible();

    const searchInput = page.locator('input[placeholder*="ابحث في"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // 2. Search for a core keyword "النية"
    await searchInput.fill('النية');
    // Allow debounce and local filter to settle
    await page.waitForTimeout(600);

    // 3. Assert that matching Hadith cards are rendered with highlighted keyword
    const mark = page.locator('mark').first();
    await expect(mark).toBeVisible({ timeout: 10000 });
    const markText = await mark.innerText();
    const stripped = markText.replace(/[\u064B-\u065F\u0670]/g, '');
    expect(stripped).toContain('ني');

    const matchedCard = page.locator('.rounded-3xl.bg-card').filter({ has: page.locator('mark') }).first();
    await expect(matchedCard).toBeVisible();

    // 4. Test non-existent query (Empty State)
    await searchInput.fill('كلمةغيرموجودةإطلاقاً999');
    await page.waitForTimeout(600);

    // 5. Assert that empty state is shown and no invalid hadith cards are rendered
    await expect(page.locator('text=/لا توجد أحاديث مطابقة|لم نعثر على أحاديث مطابقة/')).toBeVisible({ timeout: 10000 });
  });

  test('Executes search in Fatwa Library, validates card results, and verifies accordion expansion', async ({
    page,
  }) => {
    // 1. Navigate to Fatwa Library
    await page.goto('/fatwa');
    await expect(page.locator('main').first()).toBeVisible();

    const searchInput = page.locator('input[placeholder*="ابحث"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // 2. Search for "صيام"
    await searchInput.fill('صيام');
    await page.waitForTimeout(600);

    // 3. Assert that results header updates with fatwa count
    await expect(page.locator('text=/نتائج البحث عن|إجمالي الفتاوى/')).toBeVisible({ timeout: 10000 });

    // 4. Locate the first visible fatwa card
    const card = page.locator('.rounded-3xl.bg-card').first();
    await expect(card).toBeVisible();

    // 5. Verify accordion toggle: click "قراءة الفتوى كاملة"
    const toggleBtn = card.locator('button:has-text("قراءة الفتوى كاملة")');
    await expect(toggleBtn).toBeVisible({ timeout: 15000 });
    await toggleBtn.click();

    // Verify button transitioned to "طي الفتوى"
    const collapseBtn = card.locator('button:has-text("طي الفتوى")');
    await expect(collapseBtn).toBeVisible({ timeout: 10000 });

    // Verify answer container expanded (no line-clamp-2) and substantive answer text is loaded
    const answerContainer = card.locator('.leading-relaxed');
    await expect(answerContainer).toBeVisible();
    await expect(answerContainer).not.toHaveClass(/line-clamp-2/);

    // Verify answer text is substantive and not merely placeholder text
    await expect(async () => {
      const text = (await answerContainer.textContent()) || '';
      expect(text.trim().length).toBeGreaterThan(20);
      expect(text).not.toContain('انقر لعرض تفاصيل الفتوى والجواب الشافي');
    }).toPass({ timeout: 10000 });

    // 6. Click "طي الفتوى" to collapse and verify state restored
    await collapseBtn.click();
    await expect(card.locator('button:has-text("قراءة الفتوى كاملة")')).toBeVisible({ timeout: 10000 });
    await expect(answerContainer).toHaveClass(/line-clamp-2/);
  });
});
