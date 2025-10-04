import { expect, test, describe, beforeEach, afterEach } from '@playwright/test';
import { spawn, exec } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('Web UI End-to-End Integration Tests', () => {
    let agentProcess;
    let uiProcess;
    let wsPort = 8081; // Use a different port to avoid conflicts

    beforeEach(async () => {
        // Start an agent server to connect to
        console.log('Starting agent server...');
        agentProcess = spawn('node', ['agent/start-agent.js'], {
            env: { ...process.env, WS_PORT: wsPort.toString() },
            stdio: 'pipe'
        });

        // Wait for agent to be ready
        await setTimeout(2000);

        console.log('Agent server started');
    });

    afterEach(async () => {
        // Clean up processes
        if (agentProcess) {
            agentProcess.kill();
        }
        if (uiProcess) {
            uiProcess.kill();
        }
        
        // Wait a bit for processes to clean up
        await setTimeout(1000);
    });

    test('should load the Web UI without JavaScript errors', async ({ page }) => {
        // Start the UI server and wait for it to be ready
        console.log('Starting UI server...');
        
        // Using the Vite dev server directly
        const { exec } = await import('child_process');
        const util = await import('util');
        const execAsync = util.promisify(exec);
        
        // Start the dev server in the background
        uiProcess = spawn('npx', ['vite', '--port', '5174'], {
            cwd: './',
            stdio: 'pipe'
        });

        // Wait for server to be ready
        await new Promise((resolve, reject) => {
            let timeout = setTimeout(() => reject(new Error('Timeout waiting for UI server to start')), 30000);

            uiProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(output);
                if (output.includes('5174') || output.includes('Local:') || output.includes('ready in')) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            uiProcess.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            uiProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        console.log('UI server started, navigating to page...');
        
        // Wait a moment for everything to be ready
        await setTimeout(2000);

        // Navigate to the UI
        const response = await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
        
        // Check that the page loaded successfully
        expect(response.status()).toBeLessThan(400);
        
        // Monitor for console errors
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
                console.error('Console error:', msg.text());
            }
        });
        
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');
        
        // Check for JavaScript errors
        expect(consoleErrors.length, `Found ${consoleErrors.length} console errors`).toBe(0);
        
        console.log('Web UI loaded successfully without errors');
    });

    test('should connect to agent and display status information', async ({ page }) => {
        // Start the UI server
        uiProcess = spawn('npx', ['vite', '--port', '5175'], {
            cwd: './',
            stdio: 'pipe'
        });

        // Wait for server to be ready
        await new Promise((resolve, reject) => {
            let timeout = setTimeout(() => reject(new Error('Timeout waiting for UI server to start')), 30000);

            uiProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('5175') || output.includes('ready in')) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            uiProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        // Wait for server to be ready
        await setTimeout(2000);

        // Navigate to the UI
        const response = await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded' });
        expect(response.status()).toBeLessThan(400);
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Monitor for console errors
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Check that the page has the expected elements (header, main content area, etc.)
        const header = await page.$('header, .header, [data-testid="header"]'); 
        expect(header).not.toBeNull();

        // Look for the main app container
        const appContainer = await page.$('.app-container, #root, main');
        expect(appContainer).not.toBeNull();
        
        // The UI should be connected to the agent
        // Wait for connection status to appear
        await page.waitForTimeout(3000);
        
        // Check for connection indicators (status bar, connection status elements)
        const hasStatus = await page.$eval('body', (body) => {
            // Check if status bar exists
            return document.querySelector('.status-bar') !== null ||
                   document.querySelector('[data-testid="status-bar"]') !== null ||
                   document.querySelector('.connection-status') !== null;
        });
        
        expect(hasStatus).toBe(true);
        
        // Check for no console errors
        expect(consoleErrors.length, `Found ${consoleErrors.length} console errors`).toBe(0);
        
        console.log('Web UI connected to agent and displayed status information');
    });

    test('should render all expected UI components without errors', async ({ page }) => {
        // Start the UI server
        uiProcess = spawn('npx', ['vite', '--port', '5176'], {
            cwd: './',
            stdio: 'pipe'
        });

        // Wait for server to be ready
        await new Promise((resolve, reject) => {
            let timeout = setTimeout(() => reject(new Error('Timeout waiting for UI server to start')), 30000);

            uiProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('5176') || output.includes('ready in')) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            uiProcess.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        // Wait for server to be ready
        await setTimeout(2000);

        // Navigate to the UI
        await page.goto('http://localhost:5176/', { waitUntil: 'domcontentloaded' });
        
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');
        
        // Monitor for console errors
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Check for expected UI elements
        const hasHeader = await page.$('header, .header, [data-testid="header"]');
        const hasLayout = await page.$('.app-layout, .flexlayout--layout');
        const hasMain = await page.$('main, .app-main');
        
        expect(hasHeader).not.toBeNull();
        expect(hasLayout).not.toBeNull();
        expect(hasMain).not.toBeNull();
        
        // Check for no console errors
        expect(consoleErrors.length, `Found ${consoleErrors.length} console errors`).toBe(0);
        
        console.log('All expected Web UI components rendered successfully');
    });
});