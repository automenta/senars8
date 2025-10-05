/**
 * Reusable Test Scenarios
 * Extracted from complex beforeEach blocks to provide reusable scenario builders
 */

import {createTestSystem} from './test-setup.js';
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

    // Apply system config with overrides
    const systemConfig = {...(config.systemConfig || {}), ...overrides};

    // Build setup functions with inheritance
    const setupFunctions = [];
    const teardownFunctions = [];

    // Add parent setup if extending
    if (config.extends) {
        const parentScenario = createScenarioFromTemplate(config.extends, systemConfig);
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