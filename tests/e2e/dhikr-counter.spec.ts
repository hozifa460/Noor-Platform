import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Dhikr Counter Behavioral & State Transitions', () => {
  test('Accurately decrements count, updates remaining badge, supports reset, and completes at 0', async ({
    page,
  }) => {
    // 1. Navigate to Adhkar Hub
    await page.goto('/adhkar');
    await expect(page.locator('main').first()).toBeVisible();

    // 2. Locate the first dhikr card in the grid
    const card = page.locator('.grid div.rounded-3xl').first();
    await expect(card).toBeVisible({ timeout: 20000 });

    const countBtn = card.locator('button').last();
    await expect(countBtn).toBeVisible();
    await expect(countBtn).toContainText('سبّح');

    // 3. Extract the initial remaining count from button text (e.g. "سبّح (تبقى 3)")
    const initialText = await countBtn.innerText();
    const match = initialText.match(/تبقى\s+(\d+)/);
    expect(match).not.toBeNull();
    const initialCount = parseInt(match![1], 10);
    expect(initialCount).toBeGreaterThan(0);

    // 4. Click to decrement by 1
    await countBtn.click();

    // 5. Verify the number has strictly decremented: newCount === initialCount - 1
    if (initialCount > 1) {
      const expectedCount = initialCount - 1;
      await expect(countBtn).toContainText(`تبقى ${expectedCount}`);

      // Verify the status badge reflects the decremented number
      const badge = card.locator('text=متبقي:').first();
      await expect(badge).toContainText(String(expectedCount));

      // Verify reset button appears
      const resetBtn = card.locator('button[title="إعادة ضبط العداد"]');
      await expect(resetBtn).toBeVisible();

      // Test Reset: clicking reset restores initial count
      await resetBtn.click();
      await expect(countBtn).toContainText(`تبقى ${initialCount}`);

      // Now decrement repeatedly down to 0
      for (let c = initialCount; c > 0; c--) {
        await countBtn.click();
        await page.waitForTimeout(60);
      }
    }

    // 6. Verify completion state when count reaches 0:
    // - Badge transitions to completion message
    await expect(card.locator('text=تم إتمام التكرار')).toBeVisible();

    // - Button transitions to "مكتمل بفضل الله" and becomes disabled
    const completedBtn = card.locator('button:has-text("مكتمل بفضل الله")');
    await expect(completedBtn).toBeVisible();
    await expect(completedBtn).toBeDisabled();
  });
});
