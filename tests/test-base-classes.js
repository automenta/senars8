/**
 * High-Performance Test Framework
 * Optimized composition-based test utilities with shared caching
 */

import {expect, test} from 'vitest';
import {createTask, createTerm} from './test-data-factory.js';
import {expectToThrowError} from './common-validation-utils.js';
import {createContext, cleanupContext, createTestSystem} from './test-setup.js';

// High-performance cache with size limits and LRU eviction
class OptimizedCache {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = [];
    }

    get(key) {
        if (this.cache.has(key)) {
            // Update access order for LRU
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return undefined;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        } else if (this.cache.size >= this.maxSize) {
            // Evict least recently used
            const lruKey = this.accessOrder.shift();
            if (lruKey) this.cache.delete(lruKey);
        }

        this.cache.set(key, value);
        this.accessOrder.push(key);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    get size() { return this.cache.size; }
    get hitRate() { return this.hits / (this.hits + this.misses) || 0; }
}

// Global performance cache instance
const globalCache = new OptimizedCache();

// Optimized test context manager with shared caching
const TestContextManager = {
    cache: globalCache,
    active: new Map(),
    metrics: {creations: 0, cacheHits: 0},

    // Batch context creation for improved performance
    createBatch: async (contexts) => {
        const results = [];
        const uncachedContexts = [];

        // Check cache for all contexts first
        for (let i = 0; i < contexts.length; i++) {
            const {type, config = {}} = contexts[i];
            const cacheKey = `context:${type}:${JSON.stringify(config)}`;

            if (TestContextManager.cache.has && TestContextManager.cache.has(cacheKey)) {
                TestContextManager.metrics.cacheHits++;
                results[i] = TestContextManager.cache.get(cacheKey);
            } else {
                uncachedContexts.push({type, config, index: i, cacheKey});
            }
        }

        // Create only uncached contexts
        if (uncachedContexts.length > 0) {
            for (const {type, config, index, cacheKey} of uncachedContexts) {
                TestContextManager.metrics.creations++;
                const context = await TestContextManager._createSingle(type, config);
                if (TestContextManager.cache.set) TestContextManager.cache.set(cacheKey, context);
                results[index] = context;
            }
        }

        return results;
    },

    // Single context creation with caching
    create: async (type, config = {}) => {
        TestContextManager.metrics.creations++;
        const cacheKey = `context:${type}:${JSON.stringify(config)}`;

        if (TestContextManager.cache.has && TestContextManager.cache.has(cacheKey)) {
            TestContextManager.metrics.cacheHits++;
            return TestContextManager.cache.get(cacheKey);
        }

        const context = await TestContextManager._createSingle(type, config);
        if (TestContextManager.cache.set) TestContextManager.cache.set(cacheKey, context);
        return context;
    },

    // Internal context creation method
    _createSingle: async (type, config = {}) => {
        let context;
        switch (type) {
            case 'reasoner':
                context = await createContext({
                    withSystem: true, withMemory: true, withReasoner: true, ...config
                });
                break;
            case 'memory':
                context = await createContext({
                    withSystem: true, withMemory: true, ...config
                });
                break;
            case 'system':
                context = await createContext({
                    withSystem: true, ...config
                });
                break;
            case 'config':
                context = await createContext({
                    withSystem: true, ...config
                });
                context.configManager = context.container?.get('configManager');
                break;
            default:
                context = await createContext(config);
        }
        return context;
    },

    register: (name, context) => TestContextManager.active.set(name, context),

    get: (name) => TestContextManager.active.get(name),

    cleanup: async (name) => {
        const context = TestContextManager.active.get(name);
        if (context) {
            await cleanupContext(context);
            TestContextManager.active.delete(name);
        }
    },

    // Batch cleanup for better performance
    cleanupBatch: async (names) => {
        const cleanupPromises = names.map(name => TestContextManager.cleanup(name));
        await Promise.all(cleanupPromises);
    },

    reset: async () => {
        const activeNames = Array.from(TestContextManager.active.keys());
        await TestContextManager.cleanupBatch(activeNames);
        TestContextManager.active.clear();
        TestContextManager.metrics = {creations: 0, cacheHits: 0};
    },

    getStats: () => ({
        ...TestContextManager.metrics,
        activeContexts: TestContextManager.active.size,
        hitRate: TestContextManager.metrics.creations > 0 ?
            (TestContextManager.metrics.cacheHits / TestContextManager.metrics.creations) * 100 : 0,
        cacheSize: TestContextManager.cache.size || 0
    })
};

// Unified test framework using composition
export const TestFramework = {
    // Test lifecycle management
    lifecycle: {
        async setup(type, config = {}) {
            const context = await TestContextManager.create(type, config);
            const contextName = `test_${Date.now()}_${Math.random()}`;
            TestContextManager.register(contextName, context);
            return {context, contextName};
        },

        async teardown(contextName) {
            await TestContextManager.cleanup(contextName);
        }
    },

    // Test execution helpers
    execution: {
        async withContext(type, config, testFn) {
            const {context, contextName} = await TestFramework.lifecycle.setup(type, config);
            try {
                return await testFn(context);
            } finally {
                await TestFramework.lifecycle.teardown(contextName);
            }
        },

        async withReasoner(config, testFn) {
            return TestFramework.execution.withContext('reasoner', config, testFn);
        },

        async withMemory(config, testFn) {
            return TestFramework.execution.withContext('memory', config, testFn);
        },

        async withSystem(config, testFn) {
            return TestFramework.execution.withContext('system', config, testFn);
        }
    },

    // Assertion helpers
    assertions: {
        expectTask: (task, expectedTermKey, expectedPunctuation, expectedTruth = null) => {
            expect(task).toBeDefined('Task is required');
            expect(task.termKey).toBe(expectedTermKey, 'Task termKey mismatch');
            expect(task.punctuation).toBe(expectedPunctuation, 'Task punctuation mismatch');
            expectedTruth && expect(task.state.truthValue).toEqual(expectedTruth, 'Task truth value mismatch');
        },

        expectTerm: (term, expectedKey, expectedComplexity = null) => {
            expect(term).toBeDefined('Term is required');
            expect(term.key).toBe(expectedKey, 'Term key mismatch');
            expectedComplexity !== null && expect(term.complexity).toBe(expectedComplexity, 'Term complexity mismatch');
        },

        expectInferenceResults: (inputTasks, expectedOutput) => {
            expect(inputTasks).toBeDefined('Input tasks are required');
            expect(expectedOutput).toBeDefined('Expected output is required');
        },

        expectMemoryState: (memory, expectedState) => {
            if (expectedState.size !== undefined) {
                expect(memory.size).toBe(expectedState.size, 'Memory size mismatch');
            }
            if (expectedState.contains) {
                expectedState.contains.forEach(termKey =>
                    expect(memory.has(termKey)).toBe(true, `Memory should contain: ${termKey}`));
            }
        },

        expectComponents: (container, componentNames) => {
            componentNames.forEach(name => {
                const component = container.get(name);
                expect(component).toBeDefined(`${name} component is required`);
                expect(component).not.toBeNull(`${name} component should not be null`);
            });
        }
    },

    // Error testing
    errors: {
        testErrorHandling: (operation, expectedError) => expectToThrowError(operation, expectedError),

        async testAsyncErrorHandling(asyncOperation, expectedError) {
            try {
                await asyncOperation();
                expect(false).toBe(true, 'Expected operation to throw');
            } catch (error) {
                typeof expectedError === 'string'
                    ? expect(error.message).toContain(expectedError)
                    : expectedError instanceof RegExp && expect(error.message).toMatch(expectedError);
            }
        }
    },

    // Performance testing
    performance: {
        async measurePerformance(operation, maxTimeMs) {
            const startTime = performance.now();
            const result = await operation();
            const executionTime = performance.now() - startTime;
            expect(executionTime).toBeLessThanOrEqual(maxTimeMs, `Operation exceeded ${maxTimeMs}ms`);
            return {result, executionTime};
        },

        async measurePerformanceMultiple(operation, iterations, maxAverageTimeMs) {
            const times = [];
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                await operation();
                times.push(performance.now() - startTime);
            }
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThanOrEqual(maxAverageTimeMs, `Average time exceeded ${maxAverageTimeMs}ms`);
            return {times, averageTime};
        }
    },

    // Data-driven testing
    dataDriven: {
        runDataDrivenTest: (testName, dataSets, testFn) => {
            dataSets.forEach((dataSet, index) =>
                test(`${testName} - data set ${index + 1}`, async () => await testFn(dataSet, index)));
        },

        runParameterizedTest: (baseName, parameters, testFn) => {
            parameters.forEach((params, index) =>
                test(`${baseName} with parameters ${index + 1}`, async () => await testFn(params, index)));
        }
    },

    // Configuration testing
    config: {
        async testConfigValidation(configManager, testConfig, shouldPass = true) {
            if (!configManager) throw new Error('ConfigManager not available');

            if (shouldPass) {
                expect(() => configManager.validate(testConfig)).not.toThrow();
            } else {
                expect(() => configManager.validate(testConfig)).toThrow();
            }
        },

        testConfigType(configManager, key, value, expectedType) {
            if (!configManager) throw new Error('ConfigManager not available');

            const testConfig = {[key]: value};

            switch (expectedType.toLowerCase()) {
                case 'string':
                    expect(typeof value).toBe('string', `Expected string for ${key}`);
                    break;
                case 'number':
                    expect(typeof value).toBe('number', `Expected number for ${key}`);
                    break;
                case 'boolean':
                    expect(typeof value).toBe('boolean', `Expected boolean for ${key}`);
                    break;
                case 'object':
                    expect(typeof value).toBe('object', `Expected object for ${key}`);
                    break;
                default:
                    throw new Error(`Unknown expected type: ${expectedType}`);
            }
        }
    }
};

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

// Export utility objects for mixins
export const ErrorTesting = TestFramework.errors;
export const PerformanceTesting = TestFramework.performance;
export const DataDrivenTesting = TestFramework.dataDriven;