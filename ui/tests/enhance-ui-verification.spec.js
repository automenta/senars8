const { test, expect } = require('@playwright/test');

test('Enhance UI Verification', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('body')).toContainText('Demo & Test Runner');
  await page.screenshot({ path: 'screenshot.png' });
});