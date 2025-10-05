/**
 * Shared Test Utilities for Integration Tests
 * Consolidates common setup patterns and optimizes performance
 */

import {beforeAll, afterAll, beforeEach, afterEach, vi} from 'vitest';
import {createWebSocketTestFixture} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

/**
 * Common mock setup for System components
 */
export const createSystemMocks = () => {
    const mockEventBus = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        emitAsync: vi.fn(),
    };

    const mockCommandBus = {
        handle: vi.fn(),
        request: vi.fn(),
    };

    return {mockEventBus, mockCommandBus};
};

/**
 * Optimized WebSocket integration test setup
 */
export class WebSocketIntegrationTestSetup {
    constructor(options = {}) {
        this.options = {
            port: null, // Will be assigned dynamically
            autoPort: true,
            ...options
        };
        this.fixture = null;
        this.port = null;
    }

    async setup() {
        try {
            // Find available port if not specified
            if (this.options.autoPort && !this.options.port) {
                this.port = await findAvailablePort(8080);
            } else {
                this.port = this.options.port;
            }

            console.log(`Setting up WebSocket test fixture on port ${this.port}`);

            // Create optimized fixture
            this.fixture = createWebSocketTestFixture(this.port, {
                connectionTimeout: 2000, // Increased for reliability
                messageTimeout: 1000,    // Increased for reliability
                setupTimeout: 10000,     // Increased for reliability
                cleanupTimeout: 5000,    // Increased for reliability
            });

            // Setup with optimized message handler
            await this.fixture.setup(createMessageHandler);

            console.log(`WebSocket test fixture setup complete on port ${this.port}`);
            return this.fixture;
        } catch (error) {
            console.error(`Failed to setup WebSocket test fixture on port ${this.port}:`, error);
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.fixture) {
                console.log(`Cleaning up WebSocket test fixture on port ${this.port}`);
                await this.fixture.cleanup();
                console.log(`WebSocket test fixture cleanup complete on port ${this.port}`);
            }
        } catch (error) {
            console.error(`Failed to cleanup WebSocket test fixture on port ${this.port}:`, error);
            // Don't throw here to avoid masking original errors
        }
    }

    getFixture() {
        return this.fixture;
    }

    getPort() {
        return this.port;
    }
}

/**
 * Creates a test suite with shared WebSocket setup using random ports
 * @param {string} name - Test suite name
 * @param {object} options - Setup options
 * @param {Function} tests - Test function that receives the fixture directly
 */
export function createWebSocketTestSuite(name, options = {}, tests) {
    let fixture = null;
    let port = null;

    beforeAll(async () => {
        // Use unique port based on test name hash to ensure no conflicts
        const portBase = 8100;
        const nameHash = name.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
        port = portBase + (nameHash % 1000);
        console.log(`🚀 Starting ${name} setup on port ${port}...`);
        const startTime = Date.now();

        // Create optimized fixture directly
        fixture = createWebSocketTestFixture(port, {
            connectionTimeout: 1000, // Faster for tests
            messageTimeout: 500,     // Faster for tests
            setupTimeout: 5000,      // Faster for tests
            cleanupTimeout: 2000,    // Faster for tests
        });

        // Setup with optimized message handler
        await fixture.setup(createMessageHandler);

        const setupTime = Date.now() - startTime;
        console.log(`✅ ${name} setup complete in ${setupTime}ms`);
    }, 8000); // Faster timeout

    afterAll(async () => {
        console.log(`🧹 Starting ${name} cleanup on port ${port}...`);
        const startTime = Date.now();

        if (fixture) {
            await fixture.cleanup();
        }

        const cleanupTime = Date.now() - startTime;
        console.log(`✅ ${name} cleanup complete in ${cleanupTime}ms`);
    }, 3000); // Faster cleanup

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Call the tests function with the fixture directly
    if (typeof tests === 'function') {
        tests({ fixture, port });
    }
}

/**
 * Optimized message expectation helper with reduced timeout
 * @param {WebSocket} client - WebSocket client
 * @param {Function} filter - Message filter function
 * @param {number} timeout - Timeout in milliseconds (default: 800ms)
 */
export function expectMessage(client, filter, timeout = 800) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Message expectation timed out after ${timeout}ms`));
        }, timeout);

        const messageHandler = (data) => {
            try {
                const message = JSON.parse(data);
                if (filter(message)) {
                    clearTimeout(timer);
                    client.removeEventListener('message', messageHandler);
                    resolve(message);
                }
            } catch (e) {
                // Ignore invalid JSON
            }
        };

        client.addEventListener('message', messageHandler);
    });
}

/**
 * Batch client creation for parallel testing
 * @param {WebSocketTestFixture} fixture - Test fixture
 * @param {number} count - Number of clients to create
 * @returns {Promise<WebSocket[]>} Array of ready clients
 */
export async function createBatchClients(fixture, count) {
    const clients = await fixture.createClients(count);

    // Pre-warm connections by sending a ping-like message
    const pingPromises = clients.map(client =>
        fixture.sendAndExpect(client, {type: 'ping'}, (msg) => msg.type === 'pong', 500)
    );

    try {
        await Promise.all(pingPromises);
    } catch (e) {
        // Ignore ping failures, clients are still usable
    }

    return clients;
}

/**
 * Common test scenarios that can be reused across test files
 */
export const COMMON_TEST_SCENARIOS = {
    /**
     * Test basic WebSocket connectivity
     */
    connectivity: async (fixture) => {
        const [client] = await fixture.createClients(1);
        const response = await fixture.sendAndExpect(
            client,
            {type: 'get_system_stats', payload: {}},
            (msg) => msg.type === 'system_stats'
        );

        expect(response.type).toBe('system_stats');
        expect(response.payload).toBeDefined();
    },

    /**
     * Test agent control commands
     */
    agentControl: async (fixture) => {
        const [client] = await fixture.createClients(1);

        // Test start command
        const startResponse = await fixture.sendAndExpect(
            client,
            {type: 'agentControl', payload: {command: 'start'}},
            (msg) => msg.type === 'status_update'
        );

        expect(startResponse.payload).toBe('running');

        // Test stop command
        const stopResponse = await fixture.sendAndExpect(
            client,
            {type: 'agentControl', payload: {command: 'stop'}},
            (msg) => msg.type === 'status_update'
        );

        expect(stopResponse.payload).toBe('stopped');
    },

    /**
     * Test task addition and retrieval
     */
    taskOperations: async (fixture) => {
        const [client] = await fixture.createClients(1);

        // Add a task
        const taskData = {statement: '(test_task --> relation).'};
        const addResponse = await fixture.sendAndExpect(
            client,
            {type: 'add_task', payload: {taskData}},
            (msg) => msg.type === 'task_added'
        );

        expect(addResponse.payload.termKey).toBe(taskData.statement);

        // Retrieve tasks
        const getResponse = await fixture.sendAndExpect(
            client,
            {type: 'get_tasks', payload: {}},
            (msg) => msg.type === 'tasks_response'
        );

        expect(Array.isArray(getResponse.payload.tasks)).toBe(true);
    }
};

/**
 * Performance-optimized test runner for integration tests
 */
export class OptimizedTestRunner {
    constructor() {
        this.fixtures = new Map();
        this.cleanupFunctions = [];
    }

    /**
     * Register a test fixture for cleanup
     */
    registerFixture(name, fixture, cleanupFn) {
        this.fixtures.set(name, fixture);
        this.cleanupFunctions.push(cleanupFn);
    }

    /**
     * Run multiple test scenarios in parallel where safe
     */
    async runParallel(scenarios) {
        const promises = scenarios.map(scenario => scenario());
        return Promise.all(promises);
    }

    /**
     * Cleanup all registered fixtures
     */
    async cleanup() {
        const cleanupPromises = this.cleanupFunctions.map(fn => fn());
        await Promise.all(cleanupPromises);
        this.fixtures.clear();
        this.cleanupFunctions = [];
    }
}

// Export singleton instance for shared use
export const optimizedTestRunner = new OptimizedTestRunner();