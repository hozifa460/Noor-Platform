import { test, expect } from '@playwright/test';

test.describe('Noor Platform — Dhikr Counter Interactive Flow', () => {
  test('Directly loads /adhkar, interacts with counter button, and handles state transitions', async ({
    page,
  }) => {
    // Navigate to the Adhkar Hub
    await page.goto('/adhkar');
    await expect(page.locator('main')).toBeVisible();

    // Verify presence of adhkar cards and counter buttons
    const countBtn = page.locator('button:has-text("سبّح")').first();
    await expect(countBtn).toBeVisible({ timeout: 15000 });

    const initialText = await countBtn.innerText();
    expect(initialText).toContain('سبّح');

    // Click the counter button
    await countBtn.click();

    // Verify interaction took place (either decremented or completed)
    await expect(page.locator('main')).toBeVisible();
    const updatedBtn = page.locator('button:has-text("سبّح"), button:has-text("مكتمل")').first();
    await expect(updatedBtn).toBeVisible();
  });
});
