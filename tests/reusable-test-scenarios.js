/**
 * Reusable Test Scenarios
 * Extracted from complex beforeEach blocks to provide reusable scenario builders
 */

import {createTestSystem} from './test-helpers.js';
import {createTask, createTerm} from './test-data-factory.js';

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
        this.setupFunctions.push(setupFn);
        return this;
    }

    /**
     * Adds a teardown function to be executed after each test
     * @param {Function} teardownFn - Teardown function
     * @returns {TestScenario} Current instance for chaining
     */
    addTeardown(teardownFn) {
        this.teardownFunctions.push(teardownFn);
        return this;
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
 * Common test scenario builders
 */
export const SCENARIO_BUILDERS = {
    /**
     * Creates a basic system test scenario with default setup
     * @param {object} config - Configuration options
     * @returns {TestScenario} Configured test scenario
     */
    basicSystem: (config = {}) => {
        return new TestScenario('basic-system', config)
            .addSetup(async (context, scenarioConfig) => {
                context.systemData = createTestSystem(scenarioConfig);
                context.system = context.systemData.system;
                context.commandBus = context.systemData.commandBus;
                context.eventBus = context.systemData.eventBus;
                context.container = context.systemData.container;
            })
            .addTeardown(async (context) => {
                // Cleanup if needed
                if (context.system && context.system.destroy) {
                    await context.system.destroy();
                }
            });
    },

    /**
     * Creates a task processing test scenario
     * @param {object} config - Configuration options
     * @returns {TestScenario} Configured test scenario
     */
    taskProcessing: (config = {}) => {
        const scenario = SCENARIO_BUILDERS.basicSystem(config);
        scenario.name = 'task-processing';

        scenario.addSetup(async (context, scenarioConfig) => {
            // Add task-specific setup
            context.tasks = [];
            context.processedTasks = [];

            // Add sample tasks if specified in config
            if (scenarioConfig.sampleTasks) {
                for (const taskData of scenarioConfig.sampleTasks) {
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
        });

        return scenario;
    },

    /**
     * Creates a memory management test scenario
     * @param {object} config - Configuration options
     * @returns {TestScenario} Configured test scenario
     */
    memoryManagement: (config = {}) => {
        const scenario = SCENARIO_BUILDERS.basicSystem({
            ...config,
            memory: {capacity: config.capacity || 100}
        });
        scenario.name = 'memory-management';

        scenario.addSetup(async (context, scenarioConfig) => {
            // Access memory from the system container
            context.memory = context.container.get('memory');

            // Set up initial memory state if specified
            if (scenarioConfig.initialTasks) {
                for (const taskDef of scenarioConfig.initialTasks) {
                    if (context.memory.addTask) {
                        const term = createTerm(taskDef.key || 'memory-test');
                        const task = createTask(term, taskDef.punctuation || '.');
                        await context.memory.addTask(task);
                    }
                }
            }

            // Track memory operations
            context.operationLog = [];
        });

        return scenario;
    },

    /**
     * Creates an inference/reasoning test scenario
     * @param {object} config - Configuration options
     * @returns {TestScenario} Configured test scenario
     */
    inference: (config = {}) => {
        const scenario = SCENARIO_BUILDERS.taskProcessing(config);
        scenario.name = 'inference';

        scenario.addSetup(async (context, scenarioConfig) => {
            // Add reasoning-specific setup
            context.reasoner = context.container.get('reasoner');
            context.inferenceEngine = context.container.get('inferenceEngine') || context.reasoner;

            // Set up initial beliefs if specified
            if (scenarioConfig.beliefs) {
                context.beliefs = scenarioConfig.beliefs.map(b =>
                    createTask(b.key || 'belief', b.punctuation || '.', b.truthValue)
                );
            }

            // Set up initial tasks for inference if specified
            if (scenarioConfig.inputTasks) {
                context.inputTasks = scenarioConfig.inputTasks.map(t =>
                    createTask(t.key || 'input', t.punctuation || '.', t.truthValue)
                );
            }
        });

        return scenario;
    },

    /**
     * Creates an error handling test scenario
     * @param {object} config - Configuration options
     * @returns {TestScenario} Configured test scenario
     */
    errorHandling: (config = {}) => {
        const scenario = SCENARIO_BUILDERS.basicSystem(config);
        scenario.name = 'error-handling';

        scenario.addSetup(async (context, scenarioConfig) => {
            context.errors = [];
            context.errorHandler = {
                handle: (error) => {
                    context.errors.push(error);
                    if (scenarioConfig.throwOnErrors) {
                        throw error;
                    }
                }
            };

            // Override global error handling if needed
            if (scenarioConfig.globalErrorHandling) {
                context.originalConsoleError = console.error;
                console.error = (...args) => {
                    context.errors.push(new Error(args.join(' ')));
                };
            }
        });

        scenario.addTeardown(async (context) => {
            // Restore original console error if overridden
            if (context.originalConsoleError) {
                console.error = context.originalConsoleError;
            }
        });

        return scenario;
    },

    /**
     * Creates a performance test scenario
     * @param {object} config - Configuration options
     * @returns {TestScenario} Configured test scenario
     */
    performance: (config = {}) => {
        const scenario = SCENARIO_BUILDERS.basicSystem(config);
        scenario.name = 'performance';

        scenario.addSetup(async (context, scenarioConfig) => {
            context.metrics = {
                startTime: null,
                endTime: null,
                executionTime: 0,
                memoryBefore: null,
                memoryAfter: null,
                operationsCount: 0
            };

            // Start timing
            context.metrics.startTime = process.hrtime.bigint();

            // Capture initial memory stats if available
            if (global.gc) {
                global.gc();
                // Note: We can't access memory usage directly in all environments
                // This would require Node.js specific APIs
            }
        });

        scenario.addTeardown(async (context) => {
            // End timing
            context.metrics.endTime = process.hrtime.bigint();
            context.metrics.executionTime = Number(context.metrics.endTime - context.metrics.startTime) / 1000000; // Convert to milliseconds
        });

        return scenario;
    }
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