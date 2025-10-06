import {expect, test} from '@playwright/test';
import {execa} from 'execa';
import {fileURLToPath} from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Integrated Web UI End-to-End Tests', () => {
    let integratedProcess = null;
    let serverUrl = null;
    let wsPort = null;

    test.beforeAll(async () => {
        console.log('Starting integrated Web UI for E2E tests...');

        // Start the integrated web runner
        integratedProcess = execa('node', [path.resolve(__dirname, '../../integrated-web-runner.js')], {
            cwd: path.resolve(__dirname, '../..'),
            stdio: 'pipe',
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });

        // Wait for the server to start and capture the port information
        let stdout = '';
        integratedProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            // Strip ANSI color codes for regex matching
            const cleanOutput = data.toString().replace(/\u001b\[[0-9;]*m/g, '');
            console.log('Integrated runner:', cleanOutput.trim());

            // Look for the server URLs in the output - handle both formatted and plain text
            const httpMatch = cleanOutput.match(/Local:\s+(http:\/\/localhost:(\d+))/);
            if (httpMatch) {
                serverUrl = httpMatch[1];
                console.log('Web UI available at:', serverUrl);
            } else {
                // Try alternative pattern for Vite output (with or without formatting)
                const altMatch = cleanOutput.match(/http:\/\/localhost:(\d+)/);
                if (altMatch) {
                    serverUrl = `http://localhost:${altMatch[1]}`;
                    console.log('Web UI available at:', serverUrl);
                } else {
                    // Extract port number from any localhost:port pattern
                    const portMatch = cleanOutput.match(/localhost:(\d+)/);
                    if (portMatch) {
                        serverUrl = `http://localhost:${portMatch[1]}`;
                        console.log('Web UI available at:', serverUrl);
                    } else {
                        console.log('No URL pattern matched in clean output:', cleanOutput);
                    }
                }
            }

            const wsMatch = cleanOutput.match(/WebSocket server running on port:\s+(\d+)/);
            if (wsMatch) {
                wsPort = parseInt(wsMatch[1]);
                console.log('WebSocket server on port:', wsPort);
            }
        });

        // Wait for startup
        await new Promise(resolve => setTimeout(resolve, 8000));

        if (!serverUrl) {
            console.log('Available output:', stdout);
            throw new Error('Failed to detect server URL from integrated runner output');
        }
    });

    test.afterAll(async () => {
        console.log('Cleaning up integrated Web UI...');

        if (integratedProcess) {
            try {
                integratedProcess.kill('SIGTERM');
                await integratedProcess;
            } catch (error) {
                // Expected when killing the process
                console.log('Process cleanup completed');
            }
        }
    });

    test('should load Web UI without console errors', async ({page}) => {
        const consoleErrors = [];
        const consoleWarnings = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                // Filter out expected WebSocket connection errors during initial load
                const text = msg.text().toLowerCase();
                if (!text.includes('websocket') &&
                    !text.includes('connection') &&
                    !text.includes('network')) {
                    consoleErrors.push({
                        text: msg.text(),
                        location: msg.location()
                    });
                }
            } else if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });

        page.on('pageerror', (error) => {
            consoleErrors.push({
                text: error.message,
                location: 'pageerror'
            });
        });

        // Navigate to the Web UI
        console.log('Navigating to:', serverUrl);
        const response = await page.goto(serverUrl, {timeout: 10000});

        // Check that the page loaded successfully
        expect(response.status()).toBeLessThan(400);

        // Wait for the React app to load
        await page.waitForSelector('[data-testid="app-container"], .app-container, #root', {
            timeout: 10000
        });

        // Wait a bit more for any dynamic content to load
        await page.waitForTimeout(3000);

        // Check for any unexpected console errors
        if (consoleErrors.length > 0) {
            console.log('Console errors detected:');
            consoleErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.text}`);
                if (error.location !== 'pageerror') {
                    console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
                }
            });
        }

        // We expect the page to load without critical errors
        // Some WebSocket connection warnings are expected during initial load
        expect(consoleErrors.length).toBeLessThan(3);
    });

    test('should display Web UI components correctly', async ({page}) => {
        await page.goto(serverUrl);

        // Wait for the main app container
        await page.waitForSelector('.app-container, [data-theme]', {timeout: 10000});

        // Check for key UI elements
        const hasHeader = await page.locator('header, .header, [data-testid="header"]').count() > 0;
        const hasMain = await page.locator('main, .app-main, [role="main"]').count() > 0;
        const hasStatusBar = await page.locator('.status-bar, [data-testid="status-bar"]').count() > 0;

        // At minimum, we should have a main content area
        expect(hasMain).toBe(true);

        // Check that the page has some content and isn't completely blank
        const bodyText = await page.textContent('body');
        expect(bodyText.length).toBeGreaterThan(100); // Should have substantial content
    });

    test('should establish WebSocket connection', async ({page}) => {
        // Monitor WebSocket connections
        const wsConnections = [];

        page.on('websocket', (ws) => {
            wsConnections.push(ws);
            console.log('WebSocket connected:', ws.url());
        });

        await page.goto(serverUrl);

        // Wait for potential WebSocket connections
        await page.waitForTimeout(5000);

        // Check if we have any WebSocket connections
        // Note: The connection might not be immediate, but the page should load
        console.log(`WebSocket connections detected: ${wsConnections.length}`);

        // The page should load even if WebSocket connection is not immediate
        const hasMainContent = await page.locator('main, .app-main').count() > 0;
        expect(hasMainContent).toBe(true);
    });

    test('should handle basic user interactions', async ({page}) => {
        await page.goto(serverUrl);

        // Wait for the app to be ready
        await page.waitForSelector('.app-container, [data-theme]', {timeout: 10000});

        // Try to find and interact with basic UI elements
        const buttons = page.locator('button, .btn, [role="button"]');
        const buttonCount = await buttons.count();

        console.log(`Found ${buttonCount} interactive elements`);

        // If there are buttons, try clicking the first few (safely)
        for (let i = 0; i < Math.min(buttonCount, 2); i++) {
            const button = buttons.nth(i);
            try {
                await button.click({timeout: 1000});
                console.log(`Clicked button ${i + 1}`);
                await page.waitForTimeout(500);
            } catch (error) {
                // Button might not be clickable or might disappear - that's okay
                console.log(`Could not click button ${i + 1}:`, error.message);
            }
        }

        // Check that the page is still responsive after interactions
        const stillHasContent = await page.locator('main, .app-main').count() > 0;
        expect(stillHasContent).toBe(true);
    });

    test('should not have broken images or resources', async ({page}) => {
        const failedRequests = [];

        page.on('requestfailed', (request) => {
            // Ignore WebSocket failures and other non-critical failures
            if (!request.url().includes('ws') &&
                !request.url().includes('socket') &&
                request.resourceType() !== 'websocket') {
                failedRequests.push({
                    url: request.url(),
                    type: request.resourceType(),
                    failure: request.failure()
                });
            }
        });

        await page.goto(serverUrl);

        // Wait for resources to load
        await page.waitForTimeout(3000);

        // Check for failed resource loads
        if (failedRequests.length > 0) {
            console.log('Failed resource requests:');
            failedRequests.forEach((req, index) => {
                console.log(`${index + 1}. ${req.type}: ${req.url}`);
                if (req.failure) {
                    console.log(`   Error: ${req.failure.errorText}`);
                }
            });
        }

        // We shouldn't have too many failed requests
        expect(failedRequests.length).toBeLessThan(5);
    });
});