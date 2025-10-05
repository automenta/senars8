/**
 * Unified Test Configuration System
 * Streamlined configuration patterns for consistent testing
 */

// Default configurations for test data
export const DEFAULT_CONFIGS = {
    TASK: {punctuation: '.', truth: [1.0, 0.9], priority: 0},
    TERM: {complexity: 1, embedding: [0.1, 0.2, 0.3]},
    SYSTEM: {reasoner: {strategy: 'BruteForce'}}
};

/**
 * Base test configuration templates
 */
export const TEST_CONFIG_TEMPLATES = {
    UNIT: {timeout: 5000, setup: 'unit', mockLevel: 'full', validation: {errorHandling: true, edgeCases: true}},
    INTEGRATION: {timeout: 10000, setup: 'integration', mockLevel: 'partial', validation: {componentInteraction: true, dataFlow: true, performance: true}},
    SYSTEM: {timeout: 30000, setup: 'system', mockLevel: 'minimal', validation: {endToEnd: true, performance: true, errorRecovery: true}}
};

/**
 * Configuration for different types of test contexts
 */
export const TEST_CONTEXT_CONFIGS = {
    BASIC: {},
    WITH_MEMORY: {withMemory: true},
    WITH_REASONER: {withReasoner: true},
    FULL_SYSTEM: {withMemory: true, withReasoner: true},
    MINIMAL: {withSystem: false}
};

/**
 * Test suite configuration with different testing contexts
 */
export const TEST_SUITE_CONFIGS = {
    PERFORMANCE: {
        iterations: 1000,
        timeout: 30000,
        memoryThreshold: 100 * 1024 * 1024, // 100 MB
        executionTimeThreshold: 1000, // 1 second
        validation: ['execution_time', 'memory_usage', 'accuracy']
    },

    STRESS: {
        iterations: 10000,
        concurrency: 10,
        timeout: 60000,
        validation: ['error_rate', 'resource_usage', 'recovery']
    },

    REGRESSION: {
        focus: ['critical_path', 'common_scenarios'],
        validation: ['behavior', 'output_consistency'],
        comparison: true
    },

    COMPATIBILITY: {
        versions: ['current', 'previous'],
        validation: ['api_compatibility', 'data_format'],
        comparison: true
    }
};

/**
 * Test matrix for combinatorial testing
 */
export class TestMatrix {
    constructor() {
        this.dimensions = {};
        this.filters = [];
    }

    addDimension(name, values) {
        return this.dimensions[name] = values, this;
    }

    addFilter(filter) {
        return this.filters.push(filter), this;
    }

    generateCombinations() {
        const dimensionNames = Object.keys(this.dimensions);
        const dimensionValues = Object.values(this.dimensions);

        return this.cartesianProduct(dimensionValues)
            .map(values => {
                const combination = {};
                dimensionNames.forEach((name, index) => combination[name] = values[index]);
                return combination;
            })
            .filter(combination => this.filters.every(filter => filter(combination)));
    }

    cartesianProduct(arrays) {
        return arrays.reduce((acc, curr) =>
            acc.flatMap(d => curr.map(e => [...d, e])), [[]]);
    }

    createTests(suiteName, testFunction) {
        const combinations = this.generateCombinations();
        describe(suiteName, () =>
            combinations.forEach((combination, index) =>
                test(`Combination ${index + 1}: ${JSON.stringify(combination)}`, async () =>
                    await testFunction(combination, index))));
    }
}

/**
 * Creates a test configuration based on a template with overrides
 * @param {string} templateName - Name of the template to use
 * @param {object} overrides - Configuration overrides
 * @returns {object} Test configuration object
 */
export const createTestConfig = (templateName, overrides = {}) => ({
    ...(TEST_CONFIG_TEMPLATES[templateName] || TEST_CONFIG_TEMPLATES.UNIT),
    ...overrides
});

/**
 * Creates a context based on predefined configuration
 * @param {string} configName - Name of the predefined configuration
 * @param {object} overrides - Configuration overrides
 * @returns {object} Test context configuration
 */
export const createContextConfig = (configName, overrides = {}) => ({
    ...(TEST_CONTEXT_CONFIGS[configName] || TEST_CONTEXT_CONFIGS.BASIC),
    ...overrides
});


// ============================================================================
// CONFIG-DRIVEN TESTING - Consolidated from config-driven-tests.js
// ============================================================================

/**
 * Test scenario definition structure
 */
export class TestScenario {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.given = [];
        this.when = null;
        this.then = [];
        this.cleanup = [];
    }

    /**
     * Sets the 'given' preconditions for the test
     * @param {Function|Array} conditions - Precondition setup function(s)
     * @returns {TestScenario} Current instance for chaining
     */
    givenConditions(conditions) {
        this.given = Array.isArray(conditions) ? conditions : [conditions];
        return this;
    }

    /**
     * Sets the 'when' action to be tested
     * @param {Function} action - Action to execute
     * @returns {TestScenario} Current instance for chaining
     */
    whenAction(action) {
        this.when = action;
        return this;
    }

    /**
     * Sets the 'then' expectations to be validated
     * @param {Function|Array} expectations - Expectation validation function(s)
     * @returns {TestScenario} Current instance for chaining
     */
    thenExpectations(expectations) {
        this.then = Array.isArray(expectations) ? expectations : [expectations];
        return this;
    }

    /**
     * Sets cleanup functions to run after the test
     * @param {Function|Array} cleanupFunctions - Cleanup function(s)
     * @returns {TestScenario} Current instance for chaining
     */
    withCleanup(cleanupFunctions) {
        this.cleanup = Array.isArray(cleanupFunctions) ? cleanupFunctions : [cleanupFunctions];
        return this;
    }

    /**
     * Executes the test scenario
     * @param {object} context - Test context object
     */
    async execute(context = {}) {
        // Setup preconditions
        for (const condition of this.given) {
            await condition(context);
        }

        try {
            // Execute the action
            const result = await this.when(context);
            context.result = result;

            // Validate expectations
            for (const expectation of this.then) {
                await expectation(context);
            }
        } finally {
            // Perform cleanup
            for (const cleanup of this.cleanup) {
                await cleanup(context);
            }
        }
    }
}

/**
 * Creates a parameterized test suite for testing the same logic with different inputs
 * @param {string} suiteName - Name of the test suite
 * @param {Array} testCases - Array of test case objects
 * @param {Function} testFunction - Function to execute for each test case
 * @param {object} config - Test configuration
 */
export const createParameterizedTestSuite = (suiteName, testCases, testFunction, config = {}) => {
    describe(suiteName, () => {
        testCases.forEach((testCase, index) => {
            const testName = testCase.name || `test case ${index + 1}`;
            test(testName, async () => {
                try {
                    await testFunction(testCase, config);
                } catch (error) {
                    error.message = `Failed in test case "${testName}": ${error.message}`;
                    throw error;
                }
            });
        });
    });
};

/**
 * Data-driven test configuration
 */
export const DATA_DRIVEN_TESTS = {
    TASK_PROCESSING: [
        {
            name: 'basic task processing',
            input: {sentence: '(cat --> animal)', punctuation: '.', truth: [0.8, 0.9]},
            expected: {success: true, resultType: 'processed'}
        },
        {
            name: 'complex inheritance task',
            input: {sentence: '((cat --> animal) && (animal --> living))', punctuation: '.', truth: [0.7, 0.85]},
            expected: {success: true, resultType: 'inference'}
        },
        {
            name: 'invalid task format',
            input: {sentence: 'invalid format', punctuation: '?', truth: [1.0, 0.0]},
            expected: {success: false, errorType: 'ValidationError'}
        }
    ],

    REASONING_INFERENCES: [
        {
            name: 'deduction',
            premises: [
                {sentence: '(bird --> animal)', truth: [0.9, 0.8]},
                {sentence: '(animal --> living_thing)', truth: [0.95, 0.85]}
            ],
            expected: {conclusion: '(bird --> living_thing)', truth: [0.85, 0.72]}
        },
        {
            name: 'induction',
            premises: [
                {sentence: '(robin --> bird)', truth: [1.0, 0.9]},
                {sentence: '(robin --> flyer)', truth: [0.8, 0.85]}
            ],
            expected: {conclusion: '(bird --> flyer)', truth: [0.8, 0.68]}
        },
        {
            name: 'abduction',
            premises: [
                {sentence: '(eagle --> bird)', truth: [1.0, 0.9]},
                {sentence: '(eagle --> flyer)', truth: [0.9, 0.85]}
            ],
            expected: {conclusion: '(bird --> flyer)', truth: [0.9, 0.77]}
        }
    ],

    CONFIGURATION_VALIDATION: [
        {
            name: 'valid configuration',
            config: {reasoner: {strategy: 'BruteForce'}, memory: {capacity: 1000}},
            expected: {valid: true}
        },
        {
            name: 'invalid strategy config',
            config: {reasoner: {strategy: 'invalid_strategy'}},
            expected: {valid: false, error: /invalid.*strategy/i}
        },
        {
            name: 'missing required config',
            config: {reasoner: {}},
            expected: {valid: false, error: /required.*config/i}
        }
    ]
};

/**
 * Creates test data based on scenario configuration
 * @param {string} scenarioType - Type of scenario to create
 * @param {object} params - Parameters for the scenario
 * @returns {object} Test data for the scenario
 */
export const createScenarioData = (scenarioType, params = {}) => {
    switch (scenarioType) {
        case 'TASK_CREATION':
            return {
                taskDef: {
                    sentence: params.sentence || '(test --> term)',
                    punctuation: params.punctuation || '.',
                    truth: params.truth || [0.9, 0.8]
                }
            };

        case 'REASONING_CYCLE':
            return {
                inputTasks: params.inputTasks || [
                    {sentence: '(A --> B)', truth: [0.8, 0.9]},
                    {sentence: '(B --> C)', truth: [0.85, 0.88]}
                ],
                expectedOutput: params.expectedOutput || {sentence: '(A --> C)', truth: [0.68, 0.70]},
                config: params.config || {strategy: 'BruteForce'}
            };

        case 'MEMORY_OPERATION':
            return {
                initialMemory: params.initialMemory || [],
                operations: params.operations || [],
                expectedState: params.expectedState || {}
            };

        case 'ERROR_HANDLING':
            return {
                inputs: params.inputs || [],
                expectedErrors: params.expectedErrors || [],
                recoverySteps: params.recoverySteps || []
            };

        default:
            return params;
    }
};

