/**
 * Specialized Test Base Classes and Mixins
 * Base test classes for common test categories and shared setup patterns
 */

import {expect, test} from 'vitest';
import {createTask, createTerm} from './test-data-factory.js';
import {expectToThrowError} from './common-validation-utils.js';
import {
    cleanupTestContext,
    createMemoryContext,
    createTaskProcessingContext,
    createTestContext
} from './test-setup.js';
import {createTestSystem} from './test-setup.js';

/**
 * Base test class for all test categories
 */
export class BaseTestClass {
    constructor() {
        this.context = {};
    }

    /**
     * Setup method to be overridden by subclasses
     */
    async setup() {
        // Default setup - can be overridden
    }

    /**
     * Teardown method to be overridden by subclasses
     */
    async teardown() {
        // Default teardown - can be overridden
    }

    /**
     * Utility method for creating a clean test context
     */
    createTestContext(config = {}) {
        return {
            ...this.context,
            config,
            helpers: {
                createTask,
                createTerm
            }
        };
    }
}

/**
 * Test base class for reasoner-related tests
 */
export class ReasonerTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createTaskProcessingContext({
            testData: {config},
            ...config
        });

        this.systemData = context.systemData;
        this.context = context;
    }

    async teardown() {
        await cleanupTestContext(this.context);
    }

    /**
     * Helper to create and process a task through the reasoner
     * @param {string|Term} termOrKey - Term or key for the task
     * @param {string} punctuation - Punctuation for the task
     * @param {object} truthValue - Truth value for the task
     */
    async processTask(termOrKey, punctuation = '.', truthValue = null) {
        const task = createTask(termOrKey, punctuation, truthValue);
        return await this.context.processTask(task);
    }

    /**
     * Helper to assert inference results
     * @param {Array} inputTasks - Input tasks for inference
     * @param {object} expectedOutput - Expected output structure
     */
    assertInferenceResults(inputTasks, expectedOutput) {
        // This would be implemented based on the specific inference system
        // For now, we'll implement a basic assertion
        expect(inputTasks).toBeDefined();
        expect(expectedOutput).toBeDefined();
    }
}

/**
 * Test base class for memory-related tests
 */
export class MemoryTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createMemoryContext({
            testData: {config},
            ...config
        });

        this.systemData = context.systemData;
        this.context = context;
    }

    async teardown() {
        await cleanupTestContext(this.context);
    }

    /**
     * Helper to add multiple tasks to memory
     * @param {Array} tasksData - Array of task definition objects
     */
    async addTasksToMemory(tasksData) {
        return await this.context.addMultipleTasks(tasksData);
    }

    /**
     * Helper to assert memory state
     * @param {object} expectedState - Expected memory state
     */
    assertMemoryState(expectedState) {
        this.context.assertMemoryState(expectedState);
    }
}

/**
 * Test base class for system-level tests
 */
export class SystemTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createTestContext({
            testData: {config},
            ...config
        });

        this.systemData = context.systemData;
        this.context = context;
    }

    async teardown() {
        await cleanupTestContext(this.context);
    }

    /**
     * Helper to verify system components are properly initialized
     * @param {Array} componentNames - Names of components to verify
     */
    verifyComponents(componentNames) {
        for (const name of componentNames) {
            const component = this.context.container.get(name);
            expect(component).toBeDefined();
            expect(component).not.toBeNull();
        }
    }

    /**
     * Helper to trigger and capture system events
     * @param {Function} action - Action that should trigger events
     * @param {Array} expectedEvents - Expected event types
     */
    async captureSystemEvents(action, expectedEvents) {
        const capturedEvents = [];

        // Set up event listeners
        for (const eventType of expectedEvents) {
            this.context.eventBus.on(eventType, (data) => {
                capturedEvents.push({type: eventType, data});
            });
        }

        // Perform the action
        const result = await action();

        // Verify events were captured
        expect(capturedEvents.length).toBeGreaterThanOrEqual(expectedEvents.length);

        return {result, capturedEvents};
    }
}

/**
 * Test base class for configuration-related tests
 */
export class ConfigTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createTestContext({
            testData: {config},
            ...config
        });

        this.systemData = context.systemData;
        this.configManager = context.container?.get('configManager') || null;
        this.context = {
            ...context,
            configManager: this.configManager,
            config: config
        };
    }

    /**
     * Helper to test configuration validation
     * @param {object} testConfig - Configuration to test
     * @param {boolean} shouldPass - Whether validation should pass
     */
    testConfigValidation(testConfig, shouldPass = true) {
        if (!this.configManager) {
            throw new Error('ConfigManager not available in context');
        }

        if (shouldPass) {
            // If we expect it to pass, just try to validate
            try {
                this.configManager.validate(testConfig);
                // If no error is thrown, validation passed as expected
                expect(true).toBe(true);
            } catch (error) {
                throw new Error(`Expected config validation to pass but failed with: ${error.message}`);
            }
        } else {
            // If we expect it to fail, verify that it throws an error
            expect(() => this.configManager.validate(testConfig)).toThrow();
        }
    }

    /**
     * Helper to test configuration type validation
     * @param {string} key - Configuration key
     * @param {*} value - Value to test
     * @param {string} expectedType - Expected type
     */
    testConfigType(key, value, expectedType) {
        if (!this.configManager) {
            throw new Error('ConfigManager not available in context');
        }

        // Create a config with the test value
        const testConfig = {[key]: value};

        // Validate based on expected type
        switch (expectedType.toLowerCase()) {
            case 'string':
                if (typeof value !== 'string') {
                    expect(() => this.configManager.validate(testConfig)).toThrow();
                } else {
                    expect(() => this.configManager.validate(testConfig)).not.toThrow();
                }
                break;
            case 'number':
                if (typeof value !== 'number') {
                    expect(() => this.configManager.validate(testConfig)).toThrow();
                } else {
                    expect(() => this.configManager.validate(testConfig)).not.toThrow();
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    expect(() => this.configManager.validate(testConfig)).toThrow();
                } else {
                    expect(() => this.configManager.validate(testConfig)).not.toThrow();
                }
                break;
            case 'object':
                if (typeof value !== 'object') {
                    expect(() => this.configManager.validate(testConfig)).toThrow();
                } else {
                    expect(() => this.configManager.validate(testConfig)).not.toThrow();
                }
                break;
            default:
                throw new Error(`Unknown expected type: ${expectedType}`);
        }
    }
}

/**
 * Test base class for utility function tests
 */
export class UtilsTestBase extends BaseTestClass {
    async setup(config = {}) {
        this.context = {config};
    }

    /**
     * Helper to test pure functions with various inputs
     * @param {Function} fn - Function to test
     * @param {Array} testCases - Array of { input, expected } test cases
     */
    testPureFunction(fn, testCases) {
        for (const {input, expected, description} of testCases) {
            const testName = description || `with input ${JSON.stringify(input)}`;
            test(testName, () => {
                const result = Array.isArray(input) ? fn(...input) : fn(input);
                expect(result).toEqual(expected);
            });
        }
    }

    /**
     * Helper to test function with side effects
     * @param {Function} fn - Function to test
     * @param {any} input - Input for the function
     * @param {Function} validator - Function to validate side effects
     */
    async testFunctionWithSideEffects(fn, input, validator) {
        const result = Array.isArray(input) ? await fn(...input) : await fn(input);
        await validator(result);
        return result;
    }
}

/**
 * Mixin for error testing capabilities
 */
export const ErrorTestingMixin = (BaseClass) => class extends BaseClass {
    /**
     * Helper to test that an operation throws an expected error
     * @param {Function} operation - Operation to test
     * @param {string|RegExp} expectedError - Expected error message or pattern
     */
    testErrorHandling(operation, expectedError) {
        expectToThrowError(operation, expectedError);
    }

    /**
     * Helper to test async operation error handling
     * @param {Function} asyncOperation - Async operation to test
     * @param {string|RegExp} expectedError - Expected error message or pattern
     */
    async testAsyncErrorHandling(asyncOperation, expectedError) {
        try {
            await asyncOperation();
            expect(false).toBe(true); // Should not reach here
        } catch (error) {
            if (typeof expectedError === 'string') {
                expect(error.message).toContain(expectedError);
            } else if (expectedError instanceof RegExp) {
                expect(error.message).toMatch(expectedError);
            }
        }
    }
};

/**
 * Mixin for performance testing capabilities
 */
export const PerformanceTestingMixin = (BaseClass) => class extends BaseClass {
    /**
     * Helper to measure execution time of an operation
     * @param {Function} operation - Operation to measure
     * @param {number} maxTimeMs - Maximum allowed time in milliseconds
     */
    async measurePerformance(operation, maxTimeMs) {
        const startTime = Date.now();
        const result = await operation();
        const executionTime = Date.now() - startTime;

        expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
        return {result, executionTime};
    }

    /**
     * Helper to measure performance of an operation multiple times
     * @param {Function} operation - Operation to measure
     * @param {number} iterations - Number of iterations
     * @param {number} maxAverageTimeMs - Maximum allowed average time
     */
    async measurePerformanceMultiple(operation, iterations, maxAverageTimeMs) {
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            await operation();
            const executionTime = Date.now() - startTime;
            times.push(executionTime);
        }

        const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
        expect(averageTime).toBeLessThanOrEqual(maxAverageTimeMs);

        return {times, averageTime};
    }
};

/**
 * Mixin for data-driven testing capabilities
 */
export const DataDrivenTestingMixin = (BaseClass) => class extends BaseClass {
    /**
     * Helper to run the same test with different data sets
     * @param {string} testName - Name of the test
     * @param {Array} dataSets - Array of data sets to use
     * @param {Function} testFn - Test function to run for each data set
     */
    runDataDrivenTest(testName, dataSets, testFn) {
        for (const [index, dataSet] of dataSets.entries()) {
            test(`${testName} - data set ${index + 1}`, async () => {
                await testFn(dataSet, index);
            });
        }
    }

    /**
     * Helper to run parameterized tests
     * @param {string} baseName - Base name for the tests
     * @param {Array} parameters - Array of parameter sets
     * @param {Function} testFn - Test function to run with each parameter set
     */
    runParameterizedTest(baseName, parameters, testFn) {
        for (const [index, params] of parameters.entries()) {
            const name = `${baseName} with parameters ${index + 1}`;
            test(name, async () => {
                await testFn(params, index);
            });
        }
    }
};

/**
 * Combined base class with all mixins for comprehensive testing
 */
export class ComprehensiveTestBase extends DataDrivenTestingMixin(
    PerformanceTestingMixin(
        ErrorTestingMixin(BaseTestClass)
    )
) {
    /**
     * Set up the comprehensive test base with all capabilities
     */
    async setup(config = {}) {
        await super.setup(config);

        // Additional setup for comprehensive tests
        this.context.testStart = Date.now();
    }

    /**
     * Tear down the comprehensive test base
     */
    async teardown() {
        await super.teardown();

        // Additional teardown for comprehensive tests
        const testDuration = Date.now() - this.context.testStart;
        console.log(`Test completed in ${testDuration}ms`);
    }
}

// ============================================================================
// SCENARIO-BASED TESTING - Consolidated from reusable-test-scenarios.js
// ============================================================================

/**
 * Base test scenario class for common setup patterns
 */
export class TestScenario {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.setupFunctions = [];
        this.teardownFunctions = [];
    }

    /**
     * Adds a setup function to be executed before each test
     * @param {Function} setupFn - Setup function
     * @returns {TestScenario} Current instance for chaining
     */
    addSetup(setupFn) {
        return this.setupFunctions.push(setupFn), this;
    }

    /**
     * Adds a teardown function to be executed after each test
     * @param {Function} teardownFn - Teardown function
     * @returns {TestScenario} Current instance for chaining
     */
    addTeardown(teardownFn) {
        return this.teardownFunctions.push(teardownFn), this;
    }

    /**
     * Executes the complete setup
     * @param {object} context - Test context to modify
     * @returns {object} Updated context
     */
    async setup(context = {}) {
        for (const setupFn of this.setupFunctions) {
            await setupFn(context, this.config);
        }
        return context;
    }

    /**
     * Executes the complete teardown
     * @param {object} context - Test context
     */
    async teardown(context = {}) {
        for (const teardownFn of this.teardownFunctions) {
            await teardownFn(context, this.config);
        }
    }
}

/**
 * Scenario configuration templates for common patterns
 */
const SCENARIO_TEMPLATES = {
    basicSystem: {
        name: 'basic-system',
        systemConfig: {},
        setup: async (context, config) => {
            context.systemData = createTestSystem(config);
            context.system = context.systemData.system;
            context.commandBus = context.systemData.commandBus;
            context.eventBus = context.systemData.eventBus;
            context.container = context.systemData.container;
        },
        teardown: async (context) => {
            if (context.system?.destroy) {
                await context.system.destroy();
            }
        }
    },

    taskProcessing: {
        name: 'task-processing',
        extends: 'basicSystem',
        setup: async (context, config) => {
            context.tasks = [];
            context.processedTasks = [];

            if (config.sampleTasks) {
                for (const taskData of config.sampleTasks) {
                    const term = createTerm(taskData.key || 'sample');
                    const task = createTask(
                        term,
                        taskData.punctuation || '.',
                        taskData.truthValue,
                        taskData.stamp
                    );
                    context.tasks.push(task);
                }
            }
        }
    },

    memoryManagement: {
        name: 'memory-management',
        extends: 'basicSystem',
        systemConfig: {memory: {capacity: 100}},
        setup: async (context, config) => {
            context.memory = context.container.get('memory');

            if (config.initialTasks) {
                for (const taskDef of config.initialTasks) {
                    if (context.memory.addTask) {
                        const term = createTerm(taskDef.key || 'memory-test');
                        const task = createTask(term, taskDef.punctuation || '.');
                        await context.memory.addTask(task);
                    }
                }
            }

            context.operationLog = [];
        }
    },

    inference: {
        name: 'inference',
        extends: 'taskProcessing',
        setup: async (context, config) => {
            context.reasoner = context.container.get('reasoner');
            context.inferenceEngine = context.container.get('inferenceEngine') || context.reasoner;

            if (config.beliefs) {
                context.beliefs = config.beliefs.map(b =>
                    createTask(b.key || 'belief', b.punctuation || '.', b.truthValue)
                );
            }

            if (config.inputTasks) {
                context.inputTasks = config.inputTasks.map(t =>
                    createTask(t.key || 'input', t.punctuation || '.', t.truthValue)
                );
            }
        }
    },

    errorHandling: {
        name: 'error-handling',
        extends: 'basicSystem',
        setup: async (context, config) => {
            context.errors = [];
            context.errorHandler = {
                handle: (error) => {
                    context.errors.push(error);
                    if (config.throwOnErrors) {
                        throw error;
                    }
                }
            };

            if (config.globalErrorHandling) {
                context.originalConsoleError = console.error;
                console.error = (...args) => {
                    context.errors.push(new Error(args.join(' ')));
                };
            }
        },
        teardown: async (context) => {
            if (context.originalConsoleError) {
                console.error = context.originalConsoleError;
            }
        }
    },

    performance: {
        name: 'performance',
        extends: 'basicSystem',
        setup: async (context, config) => {
            context.metrics = {
                startTime: process.hrtime.bigint(),
                endTime: null,
                executionTime: 0,
                memoryBefore: null,
                memoryAfter: null,
                operationsCount: 0
            };

            if (global.gc) {
                global.gc();
            }
        },
        teardown: async (context) => {
            context.metrics.endTime = process.hrtime.bigint();
            context.metrics.executionTime = Number(context.metrics.endTime - context.metrics.startTime) / 1000000;
        }
    }
};

/**
 * Creates a scenario from template with inheritance support
 * @param {string} templateName - Name of the template to use
 * @param {object} overrides - Configuration overrides
 * @returns {TestScenario} Configured test scenario
 */
const createScenarioFromTemplate = (templateName, overrides = {}) => {
    const template = SCENARIO_TEMPLATES[templateName];
    if (!template) {
        throw new Error(`Unknown scenario template: ${templateName}`);
    }

    const config = {...template, ...overrides};
    const scenario = new TestScenario(config.name, config);

    // Build setup functions with inheritance
    const setupFunctions = [];
    const teardownFunctions = [];

    // Add parent setup if extending
    if (config.extends) {
        const parentScenario = createScenarioFromTemplate(config.extends, {...config.systemConfig, ...overrides});
        setupFunctions.push(...parentScenario.setupFunctions);
        teardownFunctions.push(...parentScenario.teardownFunctions);
    }

    // Add current template setup
    if (template.setup) {
        setupFunctions.push(template.setup);
    }

    // Add current template teardown
    if (template.teardown) {
        teardownFunctions.push(template.teardown);
    }

    // Apply setup functions
    setupFunctions.forEach(setupFn => {
        scenario.addSetup(setupFn);
    });

    // Apply teardown functions (in reverse order)
    teardownFunctions.reverse().forEach(teardownFn => {
        scenario.addTeardown(teardownFn);
    });

    return scenario;
};

/**
 * Common test scenario builders using templates
 */
export const SCENARIO_BUILDERS = {
    basicSystem: (config = {}) => createScenarioFromTemplate('basicSystem', config),
    taskProcessing: (config = {}) => createScenarioFromTemplate('taskProcessing', config),
    memoryManagement: (config = {}) => createScenarioFromTemplate('memoryManagement', config),
    inference: (config = {}) => createScenarioFromTemplate('inference', config),
    errorHandling: (config = {}) => createScenarioFromTemplate('errorHandling', config),
    performance: (config = {}) => createScenarioFromTemplate('performance', config)
};

/**
 * Parameterized scenario factory for different testing contexts
 */
export const createScenarioForContext = (contextType, config = {}) => {
    switch (contextType) {
        case 'unit':
            return SCENARIO_BUILDERS.basicSystem(config);
        case 'integration':
            return SCENARIO_BUILDERS.taskProcessing(config);
        case 'system':
            return SCENARIO_BUILDERS.inference(config);
        case 'memory':
            return SCENARIO_BUILDERS.memoryManagement(config);
        case 'error':
            return SCENARIO_BUILDERS.errorHandling(config);
        case 'performance':
            return SCENARIO_BUILDERS.performance(config);
        default:
            return SCENARIO_BUILDERS.basicSystem(config);
    }
};

/**
 * Helper to run tests with specific scenarios
 * @param {string} scenarioType - Type of scenario to use
 * @param {string} testName - Name of the test
 * @param {Function} testFn - Test function to execute
 * @param {object} config - Scenario configuration
 */
export const runWithScenario = async (scenarioType, testName, testFn, config = {}) => {
    const scenario = createScenarioForContext(scenarioType, config);

    await scenario.setup();

    try {
        await testFn(scenario, config);
    } finally {
        await scenario.teardown();
    }
};

/**
 * Creates a test suite with a specific scenario
 * @param {string} scenarioType - Type of scenario to use
 * @param {object} config - Scenario configuration
 * @param {Function} suiteFn - Suite definition function
 */
export const describeWithScenario = (scenarioType, config = {}, suiteFn) => {
    const scenario = createScenarioForContext(scenarioType, config);

    describe(`${scenarioType} scenario`, () => {
        let context = {};

        beforeEach(async () => {
            context = await scenario.setup(context);
        });

        afterEach(async () => {
            await scenario.teardown(context);
        });

        suiteFn(context);
    });
};

// Export commonly used scenarios as shortcuts
export const BasicSystemScenario = SCENARIO_BUILDERS.basicSystem;
export const TaskProcessingScenario = SCENARIO_BUILDERS.taskProcessing;
export const MemoryManagementScenario = SCENARIO_BUILDERS.memoryManagement;
export const InferenceScenario = SCENARIO_BUILDERS.inference;
export const ErrorHandlingScenario = SCENARIO_BUILDERS.errorHandling;
export const PerformanceScenario = SCENARIO_BUILDERS.performance;

// Export commonly used base classes and mixins as shortcuts
export const BaseReasonerTest = ReasonerTestBase;
export const BaseMemoryTest = MemoryTestBase;
export const BaseSystemTest = SystemTestBase;
export const BaseConfigTest = ConfigTestBase;
export const BaseUtilsTest = UtilsTestBase;

export const ErrorTestMixin = ErrorTestingMixin;
export const PerformanceTestMixin = PerformanceTestingMixin;
export const DataDrivenTestMixin = DataDrivenTestingMixin;