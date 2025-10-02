/**
 * Web Automation Executor using Playwright
 * Provides comprehensive web browser automation capabilities
 */

import { debug, error as logError, info, warn } from '../utils/logger.js';
import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const errorHandler = createUnifiedErrorHandler('WebAutomationExecutor');

class WebAutomationExecutor {
    constructor(config = {}) {
        this.config = {
            headless: config.headless ?? true,
            defaultTimeout: config.defaultTimeout || 30000,
            screenshotPath: config.screenshotPath || join(tmpdir(), 'senars-screenshots'),
            userDataDir: config.userDataDir || null,
            viewport: config.viewport || { width: 1280, height: 720 },
            userAgent: config.userAgent || 'SeNARS-Agent/1.0',
            ...config
        };

        this.browser = null;
        this.context = null;
        this.pages = new Map();
        this.activeSessions = new Map();
        this.isInitialized = false;

        info('WebAutomationExecutor initialized with config:', this.config);
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const { chromium } = await import('playwright');

            // Create screenshot directory
            await mkdir(this.config.screenshotPath, { recursive: true });

            // Launch browser
            const launchOptions = {
                headless: this.config.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            };

            if (this.config.userDataDir) {
                launchOptions.userDataDir = this.config.userDataDir;
            }

            this.browser = await chromium.launch(launchOptions);

            // Create default context
            this.context = await this.browser.newContext({
                viewport: this.config.viewport,
                userAgent: this.config.userAgent,
                acceptDownloads: true,
                locale: 'en-US',
                timezoneId: 'America/New_York'
            });

            this.isInitialized = true;
            info('WebAutomationExecutor initialized successfully');

        } catch (error) {
            logError('Failed to initialize WebAutomationExecutor:', error);
            throw error;
        }
    }

    async navigate(params) {
        await this.ensureInitialized();

        const { url, waitFor, timeout, takeScreenshot, extractText } = {
            waitFor: 'networkidle',
            timeout: this.config.defaultTimeout,
            takeScreenshot: true,
            extractText: true,
            ...params
        };

        const sessionId = randomUUID();
        const page = await this.context.newPage();

        try {
            debug(`Navigating to: ${url} (session: ${sessionId})`);

            // Set timeout
            page.setDefaultTimeout(timeout);

            // Navigate to URL
            const response = await page.goto(url, {
                waitUntil: waitFor,
                timeout
            });

            // Wait for additional element if specified
            if (params.waitForSelector) {
                await page.waitForSelector(params.waitForSelector, { timeout });
            }

            // Extract page information
            const pageInfo = {
                url: page.url(),
                title: await page.title(),
                status: response.status(),
                statusText: response.statusText(),
                headers: response.headers()
            };

            // Extract text content
            let textContent = '';
            if (extractText) {
                try {
                    textContent = await page.innerText('body', { timeout: 5000 });
                    // Limit text length to prevent memory issues
                    if (textContent.length > 50000) {
                        textContent = textContent.substring(0, 50000) + '... [truncated]';
                    }
                } catch (error) {
                    warn('Failed to extract text content:', error.message);
                }
            }

            // Take screenshot
            let screenshotPath = null;
            if (takeScreenshot) {
                try {
                    screenshotPath = join(this.config.screenshotPath, `screenshot-${sessionId}.png`);
                    await page.screenshot({
                        path: screenshotPath,
                        fullPage: true
                    });
                    debug(`Screenshot saved: ${screenshotPath}`);
                } catch (error) {
                    warn('Failed to take screenshot:', error.message);
                }
            }

            // Get page source
            let pageSource = '';
            try {
                pageSource = await page.content();
                // Limit source size
                if (pageSource.length > 100000) {
                    pageSource = pageSource.substring(0, 100000) + '... [truncated]';
                }
            } catch (error) {
                warn('Failed to get page source:', error.message);
            }

            const result = {
                success: true,
                sessionId,
                pageInfo,
                content: {
                    text: textContent,
                    html: pageSource
                },
                screenshot: screenshotPath ? {
                    path: screenshotPath,
                    base64: await this.getScreenshotBase64(screenshotPath)
                } : null,
                timestamp: new Date().toISOString()
            };

            // Store page for potential reuse
            this.pages.set(sessionId, page);

            debug(`Navigation completed: ${url} (session: ${sessionId})`);
            return result;

        } catch (error) {
            logError(`Navigation failed: ${url} (session: ${sessionId})`, error);

            // Clean up page on error
            await page.close().catch(() => {});

            throw error;
        }
    }

    async click(params) {
        await this.ensureInitialized();

        const { selector, waitForNavigation, timeout } = {
            waitForNavigation: false,
            timeout: this.config.defaultTimeout,
            ...params
        };

        const sessionId = params.sessionId || randomUUID();
        let page = this.pages.get(sessionId);

        // Create new page if session doesn't exist
        if (!page) {
            page = await this.context.newPage();
            this.pages.set(sessionId, page);
        }

        try {
            debug(`Clicking element: ${selector} (session: ${sessionId})`);

            page.setDefaultTimeout(timeout);

            // Click the element
            await page.click(selector, { timeout });

            // Wait for navigation if requested
            if (waitForNavigation) {
                await page.waitForLoadState('networkidle', { timeout });
            }

            const result = {
                success: true,
                sessionId,
                url: page.url(),
                title: await page.title(),
                timestamp: new Date().toISOString()
            };

            debug(`Click completed: ${selector} (session: ${sessionId})`);
            return result;

        } catch (error) {
            logError(`Click failed: ${selector} (session: ${sessionId})`, error);
            throw error;
        }
    }

    async fillForm(params) {
        await this.ensureInitialized();

        const { url, fields, submitSelector, waitForNavigation } = {
            waitForNavigation: true,
            ...params
        };

        const sessionId = randomUUID();
        const page = await this.context.newPage();

        try {
            debug(`Filling form at: ${url} (session: ${sessionId})`);

            // Navigate to URL if provided
            if (url) {
                await page.goto(url, { waitUntil: 'networkidle' });
            }

            // Fill form fields
            for (const [fieldName, fieldValue] of Object.entries(fields)) {
                try {
                    // Try multiple selector strategies
                    const selectors = [
                        `[name="${fieldName}"]`,
                        `#${fieldName}`,
                        `.${fieldName}`,
                        `[data-name="${fieldName}"]`,
                        `input[placeholder*="${fieldName}"]`,
                        `label:has-text("${fieldName}") + input`,
                        `label:has-text("${fieldName}") + textarea`,
                        `label:has-text("${fieldName}") + select`
                    ];

                    let filled = false;
                    for (const selector of selectors) {
                        try {
                            const element = await page.$(selector, { timeout: 1000 });
                            if (element) {
                                await element.fill(fieldValue);
                                filled = true;
                                debug(`Filled field: ${fieldName} using selector: ${selector}`);
                                break;
                            }
                        } catch (error) {
                            // Continue trying other selectors
                        }
                    }

                    if (!filled) {
                        warn(`Could not find field: ${fieldName}`);
                    }
                } catch (error) {
                    warn(`Failed to fill field ${fieldName}:`, error.message);
                }
            }

            // Submit form if submit selector provided
            if (submitSelector) {
                await page.click(submitSelector);

                if (waitForNavigation) {
                    await page.waitForLoadState('networkidle');
                }
            }

            const result = {
                success: true,
                sessionId,
                url: page.url(),
                title: await page.title(),
                fieldsFilled: Object.keys(fields).length,
                timestamp: new Date().toISOString()
            };

            // Store page for potential reuse
            this.pages.set(sessionId, page);

            debug(`Form fill completed: ${url} (session: ${sessionId})`);
            return result;

        } catch (error) {
            logError(`Form fill failed: ${url} (session: ${sessionId})`, error);
            await page.close().catch(() => {});
            throw error;
        }
    }

    async screenshot(params) {
        await this.ensureInitialized();

        const { sessionId, fullPage, clip, path } = {
            fullPage: true,
            ...params
        };

        let page = this.pages.get(sessionId);

        if (!page) {
            throw new Error(`No active session found: ${sessionId}`);
        }

        try {
            debug(`Taking screenshot (session: ${sessionId})`);

            const screenshotPath = path || join(this.config.screenshotPath, `screenshot-${randomUUID()}.png`);

            const options = {
                path: screenshotPath,
                fullPage
            };

            if (clip) {
                options.clip = clip;
            }

            await page.screenshot(options);

            const result = {
                success: true,
                sessionId,
                screenshotPath,
                base64: await this.getScreenshotBase64(screenshotPath),
                timestamp: new Date().toISOString()
            };

            debug(`Screenshot saved: ${screenshotPath} (session: ${sessionId})`);
            return result;

        } catch (error) {
            logError(`Screenshot failed (session: ${sessionId})`, error);
            throw error;
        }
    }

    async evaluate(params) {
        await this.ensureInitialized();

        const { sessionId, script, args } = {
            args: [],
            ...params
        };

        let page = this.pages.get(sessionId);

        if (!page) {
            throw new Error(`No active session found: ${sessionId}`);
        }

        try {
            debug(`Evaluating script (session: ${sessionId})`);

            const result = await page.evaluate(script, ...args);

            debug(`Script evaluation completed (session: ${sessionId})`);
            return {
                success: true,
                sessionId,
                result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logError(`Script evaluation failed (session: ${sessionId})`, error);
            throw error;
        }
    }

    async waitForSelector(params) {
        await this.ensureInitialized();

        const { sessionId, selector, state, timeout } = {
            state: 'visible',
            timeout: this.config.defaultTimeout,
            ...params
        };

        let page = this.pages.get(sessionId);

        if (!page) {
            throw new Error(`No active session found: ${sessionId}`);
        }

        try {
            debug(`Waiting for selector: ${selector} (session: ${sessionId})`);

            await page.waitForSelector(selector, { state, timeout });

            debug(`Selector found: ${selector} (session: ${sessionId})`);
            return {
                success: true,
                sessionId,
                selector,
                state,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logError(`Wait for selector failed: ${selector} (session: ${sessionId})`, error);
            throw error;
        }
    }

    async extractData(params) {
        await this.ensureInitialized();

        const { sessionId, selectors } = params;

        let page = this.pages.get(sessionId);

        if (!page) {
            throw new Error(`No active session found: ${sessionId}`);
        }

        try {
            debug(`Extracting data (session: ${sessionId})`);

            const extractedData = {};

            for (const [key, selector] of Object.entries(selectors)) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const text = await element.innerText();
                        const href = await element.getAttribute('href');
                        const src = await element.getAttribute('src');

                        extractedData[key] = {
                            text,
                            href,
                            src,
                            selector
                        };
                    } else {
                        extractedData[key] = null;
                    }
                } catch (error) {
                    warn(`Failed to extract data for ${key}:`, error.message);
                    extractedData[key] = null;
                }
            }

            debug(`Data extraction completed (session: ${sessionId})`);
            return {
                success: true,
                sessionId,
                data: extractedData,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logError(`Data extraction failed (session: ${sessionId})`, error);
            throw error;
        }
    }

    async getScreenshotBase64(screenshotPath) {
        try {
            const { readFile } = await import('fs/promises');
            const screenshot = await readFile(screenshotPath);
            return screenshot.toString('base64');
        } catch (error) {
            warn('Failed to read screenshot for base64 encoding:', error.message);
            return null;
        }
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    async closeSession(sessionId) {
        const page = this.pages.get(sessionId);
        if (page) {
            try {
                await page.close();
                this.pages.delete(sessionId);
                debug(`Closed session: ${sessionId}`);
            } catch (error) {
                warn(`Failed to close session ${sessionId}:`, error.message);
            }
        }
    }

    async cleanup() {
        info('Cleaning up WebAutomationExecutor...');

        // Close all pages
        for (const [sessionId, page] of this.pages) {
            try {
                await page.close();
            } catch (error) {
                warn(`Failed to close page ${sessionId}:`, error.message);
            }
        }
        this.pages.clear();

        // Close browser
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (error) {
                warn('Failed to close browser:', error.message);
            }
            this.browser = null;
        }

        this.isInitialized = false;
        info('WebAutomationExecutor cleanup completed');
    }

    getActiveSessions() {
        return Array.from(this.pages.keys());
    }

    getSessionInfo(sessionId) {
        const page = this.pages.get(sessionId);
        if (!page) {
            return null;
        }

        return {
            sessionId,
            url: page.url(),
            createdAt: this.activeSessions.get(sessionId)?.createdAt
        };
    }
}

export default WebAutomationExecutor;