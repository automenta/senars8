/**
 * Configuration-driven Testing Approach
 * Provides centralized test configuration objects and template-based test creation
 */

/**
 * Base test configuration templates
 */
export const TEST_CONFIG_TEMPLATES = {
    UNIT: {
        timeout: 5000,
        setup: 'unit',
        mockLevel: 'full',
        validation: {
            errorHandling: true,
            edgeCases: true
        }
    },
    INTEGRATION: {
        timeout: 10000,
        setup: 'integration',
        mockLevel: 'partial',
        validation: {
            componentInteraction: true,
            dataFlow: true,
            performance: true
        }
    },
    SYSTEM: {
        timeout: 30000,
        setup: 'system',
        mockLevel: 'minimal',
        validation: {
            endToEnd: true,
            performance: true,
            errorRecovery: true
        }
    }
};

/**
 * Creates a test configuration based on a template with overrides
 * @param {string} templateName - Name of the template to use
 * @param {object} overrides - Configuration overrides
 * @returns {object} Test configuration object
 */
export const createTestConfig = (templateName, overrides = {}) => {
    const template = TEST_CONFIG_TEMPLATES[templateName] || TEST_CONFIG_TEMPLATES.UNIT;
    return {
        ...template,
        ...overrides
    };
};

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
            input: {sentence: '<cat --> animal>', punctuation: '.', truth: [0.8, 0.9]},
            expected: {success: true, resultType: 'processed'}
        },
        {
            name: 'complex inheritance task',
            input: {sentence: '(<cat --> animal> && <animal --> living>)', punctuation: '.', truth: [0.7, 0.85]},
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
                {sentence: '<bird --> animal>', truth: [0.9, 0.8]},
                {sentence: '<animal --> living_thing>', truth: [0.95, 0.85]}
            ],
            expected: {conclusion: '<bird --> living_thing>', truth: [0.85, 0.72]}
        },
        {
            name: 'induction',
            premises: [
                {sentence: '<robin --> bird>', truth: [1.0, 0.9]},
                {sentence: '<robin --> flyer>', truth: [0.8, 0.85]}
            ],
            expected: {conclusion: '<bird --> flyer>', truth: [0.8, 0.68]}
        },
        {
            name: 'abduction',
            premises: [
                {sentence: '<eagle --> bird>', truth: [1.0, 0.9]},
                {sentence: '<eagle --> flyer>', truth: [0.9, 0.85]}
            ],
            expected: {conclusion: '<bird --> flyer>', truth: [0.9, 0.77]}
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
                    sentence: params.sentence || '<test --> term>',
                    punctuation: params.punctuation || '.',
                    truth: params.truth || [0.9, 0.8]
                }
            };

        case 'REASONING_CYCLE':
            return {
                inputTasks: params.inputTasks || [
                    {sentence: '<A --> B>', truth: [0.8, 0.9]},
                    {sentence: '<B --> C>', truth: [0.85, 0.88]}
                ],
                expectedOutput: params.expectedOutput || {sentence: '<A --> C>', truth: [0.68, 0.70]},
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
 * Creates a test suite based on configuration
 * @param {string} suiteType - Type of test suite to create
 * @param {Function} testExecutor - Function to execute the actual tests
 * @returns {object} Configured test suite
 */
export const createConfiguredTestSuite = (suiteType, testExecutor) => {
    const config = TEST_SUITE_CONFIGS[suiteType];
    if (!config) {
        throw new Error(`Unknown test suite type: ${suiteType}`);
    }

    return {
        type: suiteType,
        config,
        execute: testExecutor
    };
};

/**
 * Utility to run tests with different configurations
 * @param {Array} configs - Array of configuration objects
 * @param {Function} testFn - Test function to execute with each config
 */
export const runWithConfigurations = async (configs, testFn) => {
    for (const [index, config] of configs.entries()) {
        describe(`Configuration ${index + 1}: ${config.name || 'unnamed'}`, () => {
            test(`should pass with ${config.name || 'configuration ' + (index + 1)}`, async () => {
                await testFn(config, index);
            });
        });
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

    /**
     * Adds a dimension to the test matrix
     * @param {string} name - Dimension name
     * @param {Array} values - Possible values for this dimension
     * @returns {TestMatrix} Current instance for chaining
     */
    addDimension(name, values) {
        this.dimensions[name] = values;
        return this;
    }

    /**
     * Adds a filter function to exclude certain combinations
     * @param {Function} filter - Filter function that returns false for excluded combinations
     * @returns {TestMatrix} Current instance for chaining
     */
    addFilter(filter) {
        this.filters.push(filter);
        return this;
    }

    /**
     * Generates all valid combinations based on dimensions and filters
     * @returns {Array} Array of combination objects
     */
    generateCombinations() {
        // Get dimension names and values
        const dimensionNames = Object.keys(this.dimensions);
        const dimensionValues = Object.values(this.dimensions);

        // Generate cartesian product
        const combinations = this.cartesianProduct(dimensionValues)
            .map(values => {
                const combination = {};
                dimensionNames.forEach((name, index) => {
                    combination[name] = values[index];
                });
                return combination;
            })
            .filter(combination =>
                this.filters.every(filter => filter(combination))
            );

        return combinations;
    }

    /**
     * Computes cartesian product of arrays
     * @param {Array} arrays - Array of arrays to compute cartesian product for
     * @returns {Array} Cartesian product
     */
    cartesianProduct(arrays) {
        return arrays.reduce((acc, curr) => {
            return acc.flatMap(d => {
                return curr.map(e => {
                    return [...d, e];
                });
            });
        }, [[]]);
    }

    /**
     * Creates parameterized tests based on the matrix
     * @param {string} suiteName - Name of the test suite
     * @param {Function} testFunction - Function to test each combination
     */
    createTests(suiteName, testFunction) {
        const combinations = this.generateCombinations();

        describe(suiteName, () => {
            combinations.forEach((combination, index) => {
                test(`Combination ${index + 1}: ${JSON.stringify(combination)}`, async () => {
                    await testFunction(combination, index);
                });
            });
        });
    }
}