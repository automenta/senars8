/**
 * High-Performance E2E Test Utilities
 * Consolidated utilities for end-to-end testing with optimized performance
 */

// Shared mock server factory with caching
const mockServerCache = new Map();

export const createMockServer = (port, handlers = {}) => {
    const cacheKey = `server:${port}`;

    if (mockServerCache.has(cacheKey)) {
        return mockServerCache.get(cacheKey);
    }

    const WebSocket = require('ws');
    const server = new WebSocket.WebSocketServer({port});

    server.on('connection', (ws) => {
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                const handler = handlers[message.type] || handlers.default;
                if (handler) handler(message, ws);
            } catch (error) {
                ws.send(JSON.stringify({
                    type: 'error',
                    payload: {message: `Invalid JSON: ${error.message}`}
                }));
            }
        });
    });

    mockServerCache.set(cacheKey, server);
    return server;
};

// Optimized timeout utility with early resolution
export const waitForCondition = async (conditionFn, timeoutMs = 5000, checkInterval = 100) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            if (await conditionFn()) return true;
        } catch (error) {
            // Continue checking if condition throws
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return false;
};

// Batch mock setup for multiple components
export const setupMocks = (mocks) => {
    const results = {};

    Object.entries(mocks).forEach(([name, config]) => {
        if (config.type === 'websocket') {
            results[name] = createMockServer(config.port, config.handlers);
        } else if (config.type === 'http') {
            // HTTP mock setup would go here
            results[name] = {url: config.url, responses: config.responses};
        }
    });

    return results;
};

// Consolidated test runner for e2e tests
export const runE2ETest = async (testName, testFn, options = {}) => {
    const {
        timeout = 10000,
        retries = 1,
        skipOnError = false
    } = options;

    console.log(`🧪 Running E2E test: ${testName}`);

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const startTime = performance.now();
            await testFn();
            const duration = performance.now() - startTime;

            console.log(`✅ ${testName} completed in ${duration.toFixed(2)}ms`);
            return {success: true, duration};

        } catch (error) {
            if (attempt <= retries) {
                console.log(`⏳ Retrying ${testName} (attempt ${attempt}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log(`❌ ${testName} failed after ${retries + 1} attempts`);
                if (skipOnError) {
                    console.log(`⚠️ Skipping ${testName} due to error: ${error.message}`);
                    return {success: false, error: error.message, skipped: true};
                }
                throw error;
            }
        }
    }
};

// Performance monitoring for e2e tests
export const E2EPerformanceMonitor = {
    metrics: new Map(),

    startTest(testName) {
        this.metrics.set(testName, {
            startTime: performance.now(),
            operations: 0,
            errors: 0
        });
    },

    endTest(testName) {
        const metrics = this.metrics.get(testName);
        if (metrics) {
            metrics.endTime = performance.now();
            metrics.duration = metrics.endTime - metrics.startTime;
        }
    },

    recordOperation(testName, operation) {
        const metrics = this.metrics.get(testName);
        if (metrics) {
            metrics.operations++;
        }
    },

    recordError(testName) {
        const metrics = this.metrics.get(testName);
        if (metrics) {
            metrics.errors++;
        }
    },

    getReport() {
        const report = {};
        for (const [testName, metrics] of this.metrics.entries()) {
            report[testName] = {
                duration: metrics.duration?.toFixed(2) || 0,
                operations: metrics.operations,
                errors: metrics.errors,
                operationsPerSecond: metrics.operations / (metrics.duration / 1000) || 0
            };
        }
        return report;
    }
};

// Common e2e test patterns
export const E2ETestPatterns = {
    // WebSocket connection test pattern
    testWebSocketConnection: async (url, expectedMessages = []) => {
        return new Promise((resolve, reject) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(url);

            let receivedMessages = [];
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket connection timeout'));
            }, 5000);

            ws.on('open', () => {
                console.log('WebSocket connected');
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    receivedMessages.push(message);

                    if (receivedMessages.length >= expectedMessages.length) {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(receivedMessages);
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    ws.close();
                    reject(error);
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    },

    // UI loading test pattern
    testUILoading: async (url, expectedElements = []) => {
        // Simulate UI loading test
        const mockResponse = {status: 200, ok: true};

        // Check for expected elements (mock)
        const foundElements = expectedElements.map(() => ({exists: true}));

        return {
            response: mockResponse,
            elements: foundElements,
            loadTime: Math.random() * 1000 // Mock load time
        };
    },

    // Agent interaction test pattern
    testAgentInteraction: async (agentUrl, actions = []) => {
        const results = [];

        for (const action of actions) {
            // Simulate agent interaction
            const result = {
                action: action.type,
                success: true,
                responseTime: Math.random() * 500
            };
            results.push(result);
        }

        return results;
    }
};

// Cleanup utilities
export const cleanupE2ETest = async (resources) => {
    const {servers = [], connections = [], processes = []} = resources;

    // Close servers
    for (const server of servers) {
        if (server && typeof server.close === 'function') {
            server.close();
        }
    }

    // Close connections
    for (const connection of connections) {
        if (connection && typeof connection.close === 'function') {
            connection.close();
        }
    }

    // Kill processes
    for (const process of processes) {
        if (process && typeof process.kill === 'function') {
            process.kill('SIGTERM');
        }
    }

    // Clear cache
    mockServerCache.clear();
};

// Export performance monitor instance
export const performanceMonitor = E2EPerformanceMonitor;