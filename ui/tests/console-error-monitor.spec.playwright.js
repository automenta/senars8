import {expect, test} from '@playwright/test';

// Test to monitor browser console errors
test.describe('Browser Console Error Monitor', () => {
    test('should not have any console errors', async ({page}) => {
        // Array to store console errors
        const consoleErrors = [];

        // Listen for console events to capture errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                // Filter out resource load failures (404s, etc.) that are not JavaScript errors
                const errorText = msg.text().toLowerCase();
                if (!errorText.includes('failed to load resource') &&
                    !errorText.includes('404') &&
                    !errorText.includes('not found')) {
                    consoleErrors.push({
                        text: msg.text(),
                        location: msg.location()
                    });
                }
            }

            // Also log warnings for visibility
            if (msg.type() === 'warning') {
                console.log(`Console warning: ${msg.text()}`);
            }
        });

        // Navigate to the main page
        const response = await page.goto('/');

        // Wait a bit to ensure all resources load and errors are caught
        await page.waitForTimeout(2000);

        // Check for HTTP errors
        expect(response.status()).toBeLessThan(400);

        // Verify no console errors occurred
        if (consoleErrors.length > 0) {
            console.log('Console errors detected:');
            consoleErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.text}`);
                console.log(`   Location: ${error.location.url || 'unknown'}:${error.location.lineNumber || 'unknown'}`);
                if (error.stack) {
                    console.log(`   Stack: ${error.stack.join('\\n      ')}`);
                }
                console.log('');
            });
        }

        expect(consoleErrors.length, `Found ${consoleErrors.length} console errors`).toBe(0);
    });

    test('should not have JavaScript errors during interaction', async ({page}) => {
        const consoleErrors = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Listen for page errors (unhandled exceptions)
        page.on('pageerror', (error) => {
            consoleErrors.push(`Page error: ${error.message}\\n${error.stack}`);
        });

        await page.goto('/');
        await page.waitForTimeout(1000);

        // Simulate some basic interactions to trigger potential errors
        try {
            // Click on any visible buttons (if they exist)
            const buttons = await page.$('.btn, button, [role="button"]');
            for (const [index, button] of buttons.entries()) {
                if (index < 3) { // Limit to first 3 buttons to avoid excessive clicking
                    await button.click().catch(() => {
                    }); // Ignore click errors
                    await page.waitForTimeout(200).catch(() => {
                    }); // Ignore timeout errors
                }
            }

            // Type in any visible inputs (if they exist)
            const inputs = await page.$('input, textarea, [contenteditable="true"]');
            for (const [index, input] of inputs.entries()) {
                if (index < 2) { // Limit to first 2 inputs
                    await input.fill('test').catch(() => {
                    }); // Ignore fill errors
                    await page.waitForTimeout(200).catch(() => {
                    }); // Ignore timeout errors
                    await input.fill('').catch(() => {
                    }); // Clear for next test
                }
            }
        } catch (e) {
            // Interaction errors are expected if no elements are found
        }

        await page.waitForTimeout(500).catch(() => {
        }); // Shorter timeout and ignore errors

        if (consoleErrors.length > 0) {
            console.log('Console errors during interaction:');
            consoleErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        expect(consoleErrors.length, `Found ${consoleErrors.length} console errors during interaction`).toBe(0);
    });

    test('should not have unhandled promise rejections', async ({page}) => {
        const consoleErrors = [];
        const unhandledRejections = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error' && msg.text().toLowerCase().includes('promise')) {
                consoleErrors.push(msg.text());
            }
        });

        page.on('pageerror', (error) => {
            if (error.message.toLowerCase().includes('promise') || error.stack?.toLowerCase().includes('promise')) {
                unhandledRejections.push(error.message);
            }
        });

        await page.goto('/');
        await page.waitForTimeout(1000);

        // Perform operations that might trigger promise rejections
        // Try to access various APIs that might cause async errors
        await page.evaluate(() => {
            // Try to trigger potential async errors
            Promise.reject('test rejection').catch(() => {
            });
            Promise.resolve().then(() => {
                // Potential async operations
            });
        });

        await page.waitForTimeout(1000);

        const allErrors = [...consoleErrors, ...unhandledRejections];

        if (allErrors.length > 0) {
            console.log('Unhandled promise rejections detected:');
            allErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        expect(allErrors.length, `Found ${allErrors.length} unhandled promise rejections`).toBe(0);
    });

    test('should not have syntax errors in loaded JavaScript', async ({page}) => {
        const consoleErrors = [];

        page.on('console', (msg) => {
            const text = msg.text().toLowerCase();
            if (msg.type() === 'error' &&
                (text.includes('syntax') ||
                    text.includes('parse') ||
                    text.includes('import') ||
                    text.includes('export') ||
                    text.includes('unexpected token'))) {
                consoleErrors.push({
                    text: msg.text(),
                    location: msg.location()
                });
            }
        });

        page.on('pageerror', (error) => {
            const message = error.message.toLowerCase();
            if (message.includes('syntax') ||
                message.includes('parse') ||
                message.includes('import') ||
                message.includes('export') ||
                message.includes('unexpected token')) {
                consoleErrors.push({
                    text: error.message,
                    location: 'pageerror'
                });
            }
        });

        await page.goto('/');
        await page.waitForTimeout(2000);

        if (consoleErrors.length > 0) {
            console.log('JavaScript syntax errors detected:');
            consoleErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.text}`);
                console.log(`   Location: ${error.location}`);
            });
        }

        expect(consoleErrors.length, `Found ${consoleErrors.length} JavaScript syntax errors`).toBe(0);
    });
});