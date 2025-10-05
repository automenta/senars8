/**
 * High-Performance Test Framework
 * Optimized composition-based test utilities with shared caching
 */

import {expect, test} from 'vitest';
import {createTask, createTerm} from './test-data-factory.js';
import {expectToThrowError} from './common-validation-utils.js';
import {createContext, cleanupContext, createTestSystem} from './test-setup.js';
import {TestContextManager, TestFramework} from './shared/test-utils.js';

// Extract utility objects from TestFramework for convenience
export const ErrorTesting = TestFramework.errors;
export const PerformanceTesting = TestFramework.performance;
export const DataDrivenTesting = TestFramework.dataDriven;

// Unified test framework using composition (now imported from shared utils)

// Utility functions for common test patterns
export const createTestContext = (type, config = {}) =>
    TestContextManager.create(type, config);

export const withTestContext = (type, config, testFn) =>
    TestFramework.execution.withContext(type, config, testFn);

export const withReasoner = (config, testFn) =>
    TestFramework.execution.withReasoner(config, testFn);

export const withMemory = (config, testFn) =>
    TestFramework.execution.withMemory(config, testFn);

export const withSystem = (config, testFn) =>
    TestFramework.execution.withSystem(config, testFn);

// Pure function testing utility
export const testPureFunction = (fn, testCases) => {
    testCases.forEach(({input, expected, description}) => {
        const testName = description || `with input ${JSON.stringify(input)}`;
        test(testName, () => {
            const result = Array.isArray(input) ? fn(...input) : fn(input);
            expect(result).toEqual(expected);
        });
    });
};

// Function with side effects testing utility
export const testFunctionWithSideEffects = async (fn, input, validator) => {
    const result = Array.isArray(input) ? await fn(...input) : await fn(input);
    await validator(result);
    return result;
};

// Comprehensive test runner
export const runComprehensiveTest = async (testFn, config = {}) => {
    const startTime = performance.now();
    try {
        const result = await testFn();
        const duration = performance.now() - startTime;
        console.log(`Test completed in ${duration.toFixed(2)}ms`);
        return {result, duration};
    } catch (error) {
        const duration = performance.now() - startTime;
        console.log(`Test failed after ${duration.toFixed(2)}ms: ${error.message}`);
        throw error;
    }
};

// Performance monitoring
export const getTestStats = () => TestContextManager.getStats();
export const resetTestCache = async () => await TestContextManager.reset();

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

// Legacy class-based interface for backward compatibility
export class LegacyBaseTestClass {
    constructor() {
        this.context = {};
    }

    async setup(config = {}) {
        const {context} = await TestFramework.lifecycle.setup('basic', config);
        this.context = context;
        return context;
    }

    async teardown() {
        if (this.contextName) {
            await TestFramework.lifecycle.teardown(this.contextName);
        }
    }

    createTestContext(config = {}) {
        return {
            ...this.context,
            config,
            helpers: {createTask, createTerm}
        };
    }
}

export class LegacyReasonerTestBase extends LegacyBaseTestClass {
    async setup(config = {}) {
        const {context, contextName} = await TestFramework.lifecycle.setup('reasoner', config);
        this.context = context;
        this.contextName = contextName;
        return context;
    }

    async processTask(termOrKey, punctuation = '.', truthValue = null) {
        const task = createTask(termOrKey, punctuation, truthValue);
        return await this.context.processTask(task);
    }

    assertInferenceResults(inputTasks, expectedOutput) {
        TestFramework.assertions.expectInferenceResults(inputTasks, expectedOutput);
    }
}

export class LegacyMemoryTestBase extends LegacyBaseTestClass {
    async setup(config = {}) {
        const {context, contextName} = await TestFramework.lifecycle.setup('memory', config);
        this.context = context;
        this.contextName = contextName;
        return context;
    }

    async addTasksToMemory(tasksData) {
        return await this.context.addMultipleTasks(tasksData);
    }

    assertMemoryState(expectedState) {
        TestFramework.assertions.expectMemoryState(this.context.memory, expectedState);
    }
}

export class LegacySystemTestBase extends LegacyBaseTestClass {
    async setup(config = {}) {
        const {context, contextName} = await TestFramework.lifecycle.setup('system', config);
        this.context = context;
        this.contextName = contextName;
        return context;
    }

    verifyComponents(componentNames) {
        TestFramework.assertions.expectComponents(this.context.container, componentNames);
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

export class LegacyConfigTestBase extends LegacyBaseTestClass {
    async setup(config = {}) {
        const {context, contextName} = await TestFramework.lifecycle.setup('config', config);
        this.context = context;
        this.contextName = contextName;
        this.configManager = context.configManager;
        return context;
    }

    testConfigValidation(testConfig, shouldPass = true) {
        return TestFramework.config.testConfigValidation(this.configManager, testConfig, shouldPass);
    }

    testConfigType(key, value, expectedType) {
        return TestFramework.config.testConfigType(this.configManager, key, value, expectedType);
    }
}

export class LegacyUtilsTestBase extends LegacyBaseTestClass {
    async setup(config = {}) {
        const {context, contextName} = await TestFramework.lifecycle.setup('basic', config);
        this.context = context;
        this.contextName = contextName;
        return context;
    }

    testPureFunction(fn, testCases) {
        testPureFunction(fn, testCases);
    }

    async testFunctionWithSideEffects(fn, input, validator) {
        return await testFunctionWithSideEffects(fn, input, validator);
    }
}

// Update exports to use legacy classes for backward compatibility
export const BaseReasonerTest = LegacyReasonerTestBase;
export const BaseMemoryTest = LegacyMemoryTestBase;
export const BaseSystemTest = LegacySystemTestBase;
export const BaseConfigTest = LegacyConfigTestBase;
export const BaseUtilsTest = LegacyUtilsTestBase;

// Export utility objects for mixins (now extracted from TestFramework above)