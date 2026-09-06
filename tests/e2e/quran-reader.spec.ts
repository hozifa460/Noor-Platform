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

    // 3. Verify real Ayah body text is rendered in the reader (isolating ayah body from header banner)
    const ayahsBody = page.locator('.mushaf-real-page .text-justify').first();
    await expect(ayahsBody).toBeVisible({ timeout: 15000 });
    const readerText = await ayahsBody.innerText();
    const cleanFatiha = readerText.replace(/[\u064B-\u065F\u0670\u0671]/g, (c) => (c === '\u0671' ? 'ا' : ''));
    expect(cleanFatiha).toMatch(/اياك نعبد|إياك نعبد|اهدنا|المغضوب/);

    // 4. Test Surah Navigation: Click Next Surah button
    const nextSurahBtn = page.locator('button[title="السورة التالية"]');
    await expect(nextSurahBtn).toBeVisible();
    await nextSurahBtn.click();

    // 5. Assert Surah title header transitioned to Al-Baqarah
    await expect(surahBtn).toContainText('البقرة', { timeout: 10000 });

    // 6. Assert reader ayah body text updated to Al-Baqarah verses (exclusive verses, completely isolated from header)
    await expect(async () => {
      const updatedText = await ayahsBody.innerText();
      const cleanBaqarah = updatedText.replace(/[\u064B-\u065F\u0670\u0671]/g, (c) => (c === '\u0671' ? 'ا' : ''));
      // Must match authentic verses exclusive to Surah Al-Baqarah
      expect(cleanBaqarah).toMatch(/لا ريب|للمتقين|يؤمنون بالغيب/);
      // Must not match Surah title header or Al-Fatiha remnants
      expect(cleanBaqarah).not.toContain('البقرة');
      expect(cleanBaqarah).not.toContain('المغضوب عليهم');
    }).toPass({ timeout: 10000 });
  });
});
