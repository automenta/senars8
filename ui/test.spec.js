import {expect, test} from '@playwright/test';

test('Chat panel is present and other UI elements are functional', async ({page}) => {
    await page.goto('http://localhost:5173/');

    // Check for the Chat panel
    await expect(page.getByText('Chat')).toBeVisible();

    // Check for the Memory tab and click it
    await page.getByText('Memory').click();
    await expect(page.getByText('Knowledge Graph')).toBeVisible();

    // Take a screenshot
    await page.screenshot({path: 'docs/screenshots/screenshot.png'});
});