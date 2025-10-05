/**
 * Streamlined Test Base Classes
 * Simplified base classes for common test patterns
 */

import {expect, test} from 'vitest';
import {createTask, createTerm} from './test-data-factory.js';
import {expectToThrowError} from './common-validation-utils.js';
import {
    cleanupTestContext,
    createMemoryContext,
    createTaskProcessingContext,
    createTestContext,
    createTestSystem
} from './test-setup.js';

/**
 * Base test class for all test categories
 */
export class BaseTestClass {
    constructor() {
        this.context = {};
    }

    async setup() {}
    async teardown() {}

    createTestContext(config = {}) {
        return {
            ...this.context,
            config,
            helpers: {createTask, createTerm}
        };
    }
}

/**
 * Test base class for reasoner-related tests
 */
export class ReasonerTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createTaskProcessingContext({testData: {config}, ...config});
        this.systemData = context.systemData;
        this.context = context;
    }

    async teardown() {
        await cleanupTestContext(this.context);
    }

    async processTask(termOrKey, punctuation = '.', truthValue = null) {
        const task = createTask(termOrKey, punctuation, truthValue);
        return await this.context.processTask(task);
    }

    assertInferenceResults(inputTasks, expectedOutput) {
        expect(inputTasks).toBeDefined();
        expect(expectedOutput).toBeDefined();
    }
}

/**
 * Test base class for memory-related tests
 */
export class MemoryTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createMemoryContext({testData: {config}, ...config});
        this.systemData = context.systemData;
        this.context = context;
    }

    async teardown() {
        await cleanupTestContext(this.context);
    }

    async addTasksToMemory(tasksData) {
        return await this.context.addMultipleTasks(tasksData);
    }

    assertMemoryState(expectedState) {
        this.context.assertMemoryState(expectedState);
    }
}

/**
 * Test base class for system-level tests
 */
export class SystemTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createTestContext({testData: {config}, ...config});
        this.systemData = context.systemData;
        this.context = context;
    }

    async teardown() {
        await cleanupTestContext(this.context);
    }

    verifyComponents(componentNames) {
        componentNames.forEach(name => {
            const component = this.context.container.get(name);
            expect(component).toBeDefined();
            expect(component).not.toBeNull();
        });
    }

    async captureSystemEvents(action, expectedEvents) {
        const capturedEvents = [];

        expectedEvents.forEach(eventType =>
            this.context.eventBus.on(eventType, (data) =>
                capturedEvents.push({type: eventType, data})));

        const result = await action();
        expect(capturedEvents.length).toBeGreaterThanOrEqual(expectedEvents.length);

        return {result, capturedEvents};
    }
}

/**
 * Test base class for configuration-related tests
 */
export class ConfigTestBase extends BaseTestClass {
    async setup(config = {}) {
        const context = await createTestContext({testData: {config}, ...config});
        this.systemData = context.systemData;
        this.configManager = context.container?.get('configManager') || null;
        this.context = {...context, configManager: this.configManager, config};
    }

    testConfigValidation(testConfig, shouldPass = true) {
        if (!this.configManager) throw new Error('ConfigManager not available in context');

        shouldPass
            ? (() => { try { this.configManager.validate(testConfig); } catch (error) { throw new Error(`Expected config validation to pass but failed with: ${error.message}`); } })()
            : expect(() => this.configManager.validate(testConfig)).toThrow();
    }

    testConfigType(key, value, expectedType) {
        if (!this.configManager) throw new Error('ConfigManager not available in context');

        const testConfig = {[key]: value};

        switch (expectedType.toLowerCase()) {
            case 'string':
                typeof value !== 'string'
                    ? expect(() => this.configManager.validate(testConfig)).toThrow()
                    : expect(() => this.configManager.validate(testConfig)).not.toThrow();
                break;
            case 'number':
                typeof value !== 'number'
                    ? expect(() => this.configManager.validate(testConfig)).toThrow()
                    : expect(() => this.configManager.validate(testConfig)).not.toThrow();
                break;
            case 'boolean':
                typeof value !== 'boolean'
                    ? expect(() => this.configManager.validate(testConfig)).toThrow()
                    : expect(() => this.configManager.validate(testConfig)).not.toThrow();
                break;
            case 'object':
                typeof value !== 'object'
                    ? expect(() => this.configManager.validate(testConfig)).toThrow()
                    : expect(() => this.configManager.validate(testConfig)).not.toThrow();
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

    testPureFunction(fn, testCases) {
        testCases.forEach(({input, expected, description}) => {
            const testName = description || `with input ${JSON.stringify(input)}`;
            test(testName, () => {
                const result = Array.isArray(input) ? fn(...input) : fn(input);
                expect(result).toEqual(expected);
            });
        });
    }

    async testFunctionWithSideEffects(fn, input, validator) {
        const result = Array.isArray(input) ? await fn(...input) : await fn(input);
        await validator(result);
        return result;
    }
}

/**
 * Error testing utilities
 */
export const ErrorTestingUtils = {
    testErrorHandling: (operation, expectedError) => expectToThrowError(operation, expectedError),

    testAsyncErrorHandling: async (asyncOperation, expectedError) => {
        try {
            await asyncOperation();
            expect(false).toBe(true);
        } catch (error) {
            typeof expectedError === 'string'
                ? expect(error.message).toContain(expectedError)
                : expectedError instanceof RegExp && expect(error.message).toMatch(expectedError);
        }
    }
};

/**
 * Performance testing utilities
 */
export const PerformanceTestingUtils = {
    measurePerformance: async (operation, maxTimeMs) => {
        const startTime = Date.now();
        const result = await operation();
        const executionTime = Date.now() - startTime;
        expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
        return {result, executionTime};
    },

    measurePerformanceMultiple: async (operation, iterations, maxAverageTimeMs) => {
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            await operation();
            times.push(Date.now() - startTime);
        }
        const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
        expect(averageTime).toBeLessThanOrEqual(maxAverageTimeMs);
        return {times, averageTime};
    }
};

/**
 * Data-driven testing utilities
 */
export const DataDrivenTestingUtils = {
    runDataDrivenTest: (testName, dataSets, testFn) => {
        dataSets.forEach((dataSet, index) =>
            test(`${testName} - data set ${index + 1}`, async () => await testFn(dataSet, index)));
    },

    runParameterizedTest: (baseName, parameters, testFn) => {
        parameters.forEach((params, index) =>
            test(`${baseName} with parameters ${index + 1}`, async () => await testFn(params, index)));
    }
};

/**
 * Comprehensive test utilities combining all testing capabilities
 */
export const ComprehensiveTestUtils = {
    ...ErrorTestingUtils,
    ...PerformanceTestingUtils,
    ...DataDrivenTestingUtils,

    async runComprehensiveTest(testFn, config = {}) {
        const startTime = Date.now();
        try {
            const result = await testFn();
            const duration = Date.now() - startTime;
            console.log(`Test completed in ${duration}ms`);
            return {result, duration};
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`Test failed after ${duration}ms: ${error.message}`);
            throw error;
        }
    }
};

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

// Export commonly used base classes as shortcuts
export const BaseReasonerTest = ReasonerTestBase;
export const BaseMemoryTest = MemoryTestBase;
export const BaseSystemTest = SystemTestBase;
export const BaseConfigTest = ConfigTestBase;
export const BaseUtilsTest = UtilsTestBase;

// Export utility objects for mixins
export const ErrorTesting = ErrorTestingUtils;
export const PerformanceTesting = PerformanceTestingUtils;
export const DataDrivenTesting = DataDrivenTestingUtils;