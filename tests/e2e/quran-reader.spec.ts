import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Quran Reader Flows & Ayah Assertions', () => {
  test('Loads Surah Al-Fatiha, verifies authentic ayah text rendering, and transitions to next Surah', async ({
    page,
  }) => {
    // 1. Open Quran Hub
    await page.goto('/quran');
    await expect(page.locator('main').first()).toBeVisible();

    // 2. Verify initial Surah is Al-Fatiha
    const surahBtn = page.locator('button:has-text("سورة")').first();
    await expect(surahBtn).toBeVisible({ timeout: 15000 });
    await expect(surahBtn).toContainText('الفاتحة');

    // 3. Verify real Ayah text is rendered in the reader
    const readerArea = page.locator('.mushaf-real-page, .font-quran').first();
    await expect(readerArea).toBeVisible({ timeout: 15000 });
    const readerText = await readerArea.innerText();
    const cleanFatiha = readerText.replace(/[\u064B-\u065F\u0670\u0671]/g, (c) => (c === '\u0671' ? 'ا' : ''));
    expect(cleanFatiha).toMatch(/الحمد|الرحمن|الرحيم/);

    // 4. Test Surah Navigation: Click Next Surah button
    const nextSurahBtn = page.locator('button[title="السورة التالية"]');
    await expect(nextSurahBtn).toBeVisible();
    await nextSurahBtn.click();

    // 5. Assert Surah transitioned to Al-Baqarah
    await expect(surahBtn).toContainText('البقرة', { timeout: 10000 });

    // 6. Assert reader text updated to Al-Baqarah verses
    await expect(async () => {
      const updatedText = await readerArea.innerText();
      const cleanBaqarah = updatedText.replace(/[\u064B-\u065F\u0670\u0671]/g, (c) => (c === '\u0671' ? 'ا' : ''));
      expect(cleanBaqarah).toMatch(/البقرة|الكتاب|الم/);
    }).toPass({ timeout: 10000 });
  });
});
