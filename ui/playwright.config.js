import {defineConfig} from '@playwright/test';

export default defineConfig({
    // Global setup to start the Vite dev server
    globalSetup: './tests/playwright.global-setup.js',
    globalTeardown: './tests/playwright.global-teardown.js',

    // Run tests in files in parallel on the UI
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI
    workers: process.env.CI ? 1 : undefined,

    // Reporter to use
    reporter: 'html',

    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: 'http://localhost:5173',

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Record video only when retrying a test for the first time
        video: 'on-first-retry',

        // Capture screenshot after each test failure
        screenshot: 'only-on-failure',
    },

    // Configure projects for multiple browsers
    projects: [
        {
            name: 'chromium',
            use: {
                channel: 'chromium',
            },
        },
    ],

    // Run your local dev server before starting the tests
    webServer: [
        {
            command: 'npm start',
            port: 8080,
            cwd: '..',
            reuseExistingServer: !process.env.CI,
        },
        {
            command: 'npm run dev',
            port: 5173,
            cwd: './',
            reuseExistingServer: !process.env.CI,
        },
    ],
    testMatch: ['**/*.spec.js', '**/e2e/**/*.test.js'],
});