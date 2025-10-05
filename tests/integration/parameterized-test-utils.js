/**
 * Parameterized Test Utilities for Integration Tests
 * Enables consolidation of similar test cases with different parameters
 */

import {describe, it, expect} from 'vitest';

/**
 * Creates parameterized tests from a template
 * @param {string} suiteName - Name of the test suite
 * @param {Array} testCases - Array of test case objects with name and params
 * @param {Function} testTemplate - Template function that receives (testCase, fixture)
 * @param {object} options - Additional options for test configuration
 */
export function createParameterizedTests(suiteName, testCases, testTemplate, options = {}) {
    const {
        skip = [],
        only = [],
        timeout = 5000
    } = options;

    return describe(suiteName, () => {
        testCases.forEach(testCase => {
            const testName = testCase.name || `${suiteName} - ${JSON.stringify(testCase.params)}`;
            const shouldSkip = skip.includes(testCase.name) || skip.includes(testCase.params);
            const shouldOnly = only.length === 0 || only.includes(testCase.name) || only.includes(testCase.params);

            (shouldOnly ? it.only : it)(testName, async function() {
                await testTemplate(testCase, this);
            }, timeout);
        });
    });
}

/**
 * Common parameterized test templates for WebSocket integration tests
 */
export const WEBSOCKET_TEST_TEMPLATES = {
    /**
     * Template for testing different message types
     */
    messageTypes: async (testCase, fixture) => {
        const {messageType, payload, expectedResponseType, responseValidator} = testCase.params;
        const [client] = await fixture.createClients(1);

        // Send message and wait for response
        const response = await fixture.sendAndExpect(
            client,
            {type: messageType, payload},
            (msg) => msg.type === expectedResponseType
        );

        expect(response.type).toBe(expectedResponseType);

        if (responseValidator) {
            responseValidator(response);
        }
    },

    /**
     * Template for testing agent control commands
     */
    agentControl: async (testCase, fixture) => {
        const {command, expectedStatus, additionalAssertions} = testCase.params;
        const [controlClient, listenerClient] = await fixture.createClients(2);

        // Wait for clients to be ready
        await Promise.all([
            fixture.sendAndExpect(controlClient, {type: 'ping'}, (msg) => msg.type === 'pong'),
            fixture.sendAndExpect(listenerClient, {type: 'ping'}, (msg) => msg.type === 'pong')
        ]);

        // Send command and expect status update
        const statusResponse = await fixture.sendAndExpect(
            listenerClient,
            {type: 'agentControl', payload: {command}},
            (msg) => msg.type === 'status_update'
        );

        expect(statusResponse.payload).toBe(expectedStatus);

        if (additionalAssertions) {
            additionalAssertions(statusResponse, controlClient, listenerClient);
        }
    },

    /**
     * Template for testing task operations
     */
    taskOperations: async (testCase, fixture) => {
        const {taskData, operation, expectedEventType, eventValidator} = testCase.params;
        const [controlClient, listenerClient] = await fixture.createClients(2);

        // Wait for clients to be ready
        await Promise.all([
            fixture.sendAndExpect(controlClient, {type: 'ping'}, (msg) => msg.type === 'pong'),
            fixture.sendAndExpect(listenerClient, {type: 'ping'}, (msg) => msg.type === 'pong')
        ]);

        // Listen for the expected event
        const eventPromise = fixture.sendAndExpect(
            listenerClient,
            {type: operation, payload: {taskData}},
            (msg) => msg.type === expectedEventType
        );

        // Send the operation
        controlClient.send(JSON.stringify({
            type: operation,
            payload: {taskData}
        }));

        const event = await eventPromise;
        expect(event.type).toBe(expectedEventType);

        if (eventValidator) {
            eventValidator(event);
        }
    }
};

/**
 * Predefined test case generators for common scenarios
 */
export const TEST_CASE_GENERATORS = {
    /**
     * Generates test cases for different message types
     */
    messageTypes: () => [
        {
            name: 'get_system_stats',
            params: {
                messageType: 'get_system_stats',
                payload: {},
                expectedResponseType: 'system_stats',
                responseValidator: (response) => {
                    expect(response.payload).toHaveProperty('isRunning');
                    expect(response.payload).toHaveProperty('cycleCount');
                }
            }
        },
        {
            name: 'get_beliefs',
            params: {
                messageType: 'get_beliefs',
                payload: {},
                expectedResponseType: 'beliefs_response',
                responseValidator: (response) => {
                    expect(Array.isArray(response.payload.beliefs)).toBe(true);
                }
            }
        },
        {
            name: 'get_goals',
            params: {
                messageType: 'get_goals',
                payload: {},
                expectedResponseType: 'goals_response',
                responseValidator: (response) => {
                    expect(Array.isArray(response.payload.goals)).toBe(true);
                }
            }
        },
        {
            name: 'get_questions',
            params: {
                messageType: 'get_questions',
                payload: {},
                expectedResponseType: 'questions_response',
                responseValidator: (response) => {
                    expect(Array.isArray(response.payload.questions)).toBe(true);
                }
            }
        }
    ],

    /**
     * Generates test cases for agent control commands
     */
    agentControl: () => [
        {
            name: 'start_command',
            params: {
                command: 'start',
                expectedStatus: 'running'
            }
        },
        {
            name: 'stop_command',
            params: {
                command: 'stop',
                expectedStatus: 'stopped'
            }
        },
        {
            name: 'reset_command',
            params: {
                command: 'reset',
                expectedStatus: 'ready'
            }
        }
    ],

    /**
     * Generates test cases for task operations
     */
    taskOperations: () => [
        {
            name: 'add_task',
            params: {
                taskData: {statement: '(test_task --> relation).'},
                operation: 'add_task',
                expectedEventType: 'task_added',
                eventValidator: (event) => {
                    expect(event.payload.termKey).toBe('(test_task --> relation).');
                }
            }
        },
        {
            name: 'add_belief',
            params: {
                taskData: {statement: '(belief_task --> belief).'},
                operation: 'add_belief',
                expectedEventType: 'belief_added',
                eventValidator: (event) => {
                    expect(event.payload.termKey).toBe('(belief_task --> belief).');
                }
            }
        }
    ]
};

/**
 * Performance-optimized batch test runner
 */
export class BatchTestRunner {
    constructor(fixture, options = {}) {
        this.fixture = fixture;
        this.options = {
            batchSize: 3,
            delayBetweenBatches: 100,
            ...options
        };
        this.results = [];
    }

    /**
     * Run multiple test cases in optimized batches
     */
    async runBatch(testCases, testTemplate) {
        const batches = this.chunkArray(testCases, this.options.batchSize);

        for (const batch of batches) {
            const batchPromises = batch.map(testCase =>
                this.runTestCase(testCase, testTemplate)
            );

            const batchResults = await Promise.all(batchPromises);
            this.results.push(...batchResults);

            // Small delay between batches to prevent overwhelming the system
            if (batches.indexOf(batch) < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, this.options.delayBetweenBatches));
            }
        }

        return this.results;
    }

    /**
     * Run a single test case with error handling
     */
    async runTestCase(testCase, testTemplate) {
        try {
            await testTemplate(testCase, this.fixture);
            return {testCase: testCase.name, success: true};
        } catch (error) {
            return {testCase: testCase.name, success: false, error: error.message};
        }
    }

    /**
     * Chunk array into smaller arrays of specified size
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Get test results summary
     */
    getSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.success).length;
        const failed = total - passed;

        return {
            total,
            passed,
            failed,
            successRate: (passed / total) * 100,
            results: this.results
        };
    }
}

/**
 * Creates a batch test suite with performance optimizations
 */
export function createBatchTestSuite(suiteName, testCases, testTemplate, options = {}) {
    return describe(suiteName, () => {
        let fixture;
        let runner;

        beforeAll(async () => {
            // This would be set up by the calling test file
            // fixture = await setupWebSocketFixture();
            fixture = options.fixture;
            runner = new BatchTestRunner(fixture, options);
        });

        it('should run all test cases efficiently', async () => {
            const results = await runner.runBatch(testCases, testTemplate);
            const summary = runner.getSummary();

            expect(summary.failed).toBe(0);
            expect(summary.successRate).toBe(100);
        });
    });
}