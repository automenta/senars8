import {expect, test} from '@playwright/test';

test.describe('UI-Agent-Core Integration Tests', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({page}) => {
        await page.goto('http://localhost:5173/');
        // Wait for the page to load completely
        await page.waitForLoadState('networkidle');
        // Additional wait for UI to initialize
        await page.waitForTimeout(3000);
    });

    test('Verify Chat panel functionality and take screenshot', async ({page}) => {
        // Use flexlayout tab selector - flexlayout uses .flexlayout__tab_button for tab buttons
        await page.locator('text=Chat').first().click();

        // Wait for Chat panel to load and become visible
        await page.waitForTimeout(2000);

        // Verify input field is available (look for narsese input component)
        const inputField = page.locator('input.narsese-input, textarea, [contenteditable="true"], input[type="text"]');
        await expect(inputField).toBeVisible({timeout: 10000});

        // Verify send button is available
        const sendButton = page.locator('button').filter({hasText: 'Send'}).first();
        await expect(sendButton).toBeVisible();

        // Take screenshot of chat panel
        await page.screenshot({path: 'docs/screenshots/chat-panel.png'});
    });

    test('Verify Knowledge Graph panel', async ({page}) => {
        // Click on the Knowledge Graph tab
        await page.locator('text=Knowledge Graph').first().click();

        // Wait for panel to load and take screenshot
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/knowledge-graph-panel.png'});
    });

    test('Verify NARS Tasks panel', async ({page}) => {
        // Click on the NARS Tasks tab
        await page.locator('text=NARS Tasks').first().click();

        // Wait for panel to load and take screenshot
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/narsese-tasks-panel.png'});
    });

    test('Verify Reasoning panels', async ({page}) => {
        // Click on the Reasoning tab (reasoner-trace component)
        await page.locator('text=Reasoning').first().click();

        // Wait for panel to load and take screenshot
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/reasoner-trace-panel.png'});

        // Click on the Reasoning Debugger tab
        await page.locator('text=Reasoning Debugger').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/reasoning-debugger-panel.png'});

        // Click on the Visual Reasoning tab
        await page.locator('text=Visual Reasoning').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/visual-reasoning-panel.png'});
    });

    test('Verify Status, Configuration and Control panels', async ({page}) => {
        // Click on the Status tab
        await page.locator('text=Status').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/status-panel.png'});

        // Click on the Configuration tab
        await page.locator('text=Configuration').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/configuration-panel.png'});

        // Click on the Control tab
        await page.locator('text=Control').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/control-panel.png'});
    });

    test('Verify Dashboard panel', async ({page}) => {
        // Click on the Dashboard tab (should be visible by default)
        await page.locator('text=Dashboard').first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({path: 'docs/screenshots/dashboard-panel.png'});
    });

    test('Verify interaction with agent through UI', async ({page}) => {
        // Click on the Chat tab
        await page.locator('text=Chat').first().click();

        // Verify the input field and send button
        await page.waitForTimeout(2000);
        const inputField = page.locator('input.narsese-input, textarea, [contenteditable="true"], input[type="text"]');
        await expect(inputField).toBeVisible();

        const sendButton = page.locator('button').filter({hasText: 'Send'}).first();
        await expect(sendButton).toBeVisible();

        // Type a simple Narsese statement
        await inputField.fill('<bird --> animal>.');

        // Click send button (if connected to agent this would send the statement)
        await sendButton.click();

        // Wait a bit for any response
        await page.waitForTimeout(1000);

        // Take screenshot after sending
        await page.screenshot({path: 'docs/screenshots/narsese-input-sent.png'});
    });

    test('Full UI layout and responsiveness check', async ({page}) => {
        // Take a screenshot of the full UI layout
        await page.screenshot({path: 'docs/screenshots/full-layout.png'});

        // Test different viewport sizes to ensure responsiveness
        await page.setViewportSize({width: 1200, height: 800});
        await page.screenshot({path: 'docs/screenshots/layout-1200x800.png'});

        await page.setViewportSize({width: 800, height: 600});
        await page.screenshot({path: 'docs/screenshots/layout-800x600.png'});

        // Reset to default size
        await page.setViewportSize({width: 1280, height: 720});
    });
});