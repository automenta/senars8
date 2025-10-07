/**
 * High-Performance Configuration System
 * Optimized configuration management with shared caching and batch operations
 */

import {ConfigRegistry} from './shared/test-utils.js';

// Register core configuration templates
ConfigRegistry.registerTemplate('TASK', {
    punctuation: '.', truth: [1.0, 0.9], priority: 0
});

ConfigRegistry.registerTemplate('TERM', {
    complexity: 1, embedding: [0.1, 0.2, 0.3]
});

ConfigRegistry.registerTemplate('SYSTEM', {
    reasoner: {strategy: 'BruteForce'}
});

ConfigRegistry.registerTemplate('UNIT_TEST', {
    timeout: 5000, setup: 'unit', mockLevel: 'full',
    validation: {errorHandling: true, edgeCases: true}
});

ConfigRegistry.registerTemplate('INTEGRATION_TEST', {
    timeout: 10000, setup: 'integration', mockLevel: 'partial',
    validation: {componentInteraction: true, dataFlow: true, performance: true}
});

ConfigRegistry.registerTemplate('SYSTEM_TEST', {
    timeout: 30000, setup: 'system', mockLevel: 'minimal',
    validation: {endToEnd: true, performance: true, errorRecovery: true}
});

// Test context configurations
export const TEST_CONTEXTS = {
    BASIC: {},
    WITH_MEMORY: {withMemory: true},
    WITH_REASONER: {withReasoner: true},
    FULL_SYSTEM: {withMemory: true, withReasoner: true},
    MINIMAL: {withSystem: false}
};

// Test suite configurations
export const TEST_SUITES = {
    PERFORMANCE: {
        iterations: 1000, timeout: 30000, memoryThreshold: 100 * 1024 * 1024,
        executionTimeThreshold: 1000, validation: ['execution_time', 'memory_usage', 'accuracy']
    },
    STRESS: {
        iterations: 10000, concurrency: 10, timeout: 60000,
        validation: ['error_rate', 'resource_usage', 'recovery']
    },
    REGRESSION: {
        focus: ['critical_path', 'common_scenarios'],
        validation: ['behavior', 'output_consistency'], comparison: true
    },
    COMPATIBILITY: {
        versions: ['current', 'previous'],
        validation: ['api_compatibility', 'data_format'], comparison: true
    }
};


// Combinatorial testing with performance optimization
export class TestMatrix {
    constructor() {
        this.dimensions = new Map();
        this.filters = [];
    }

    addDimension(name, values) {
        this.dimensions.set(name, values);
        return this;
    }

    addFilter(filter) {
        this.filters.push(filter);
        return this;
    }

    generateCombinations() {
        const dimensionNames = Array.from(this.dimensions.keys());
        const dimensionValues = Array.from(this.dimensions.values());

        // Optimized cartesian product using iterative approach
        let combinations = [{}];
        for (let i = 0; i < dimensionValues.length; i++) {
            const currentValues = dimensionValues[i];
            const newCombinations = [];

            for (const combination of combinations) {
                for (const value of currentValues) {
                    newCombinations.push({...combination, [dimensionNames[i]]: value});
                }
            }

            combinations = newCombinations;
        }

        return combinations.filter(combination =>
            this.filters.every(filter => filter(combination)));
    }

    createTests(suiteName, testFunction) {
        const combinations = this.generateCombinations();
        describe(suiteName, () =>
            combinations.forEach((combination, index) =>
                test(`Combination ${index + 1}: ${JSON.stringify(combination)}`, async () =>
                    await testFunction(combination, index))));
    }
}

// Scenario-based testing with performance optimization
export class TestScenario {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.stages = {given: [], when: null, then: [], cleanup: []};
    }

    givenConditions(conditions) {
        this.stages.given = Array.isArray(conditions) ? conditions : [conditions];
        return this;
    }

    whenAction(action) {
        this.stages.when = action;
        return this;
    }

    thenExpectations(expectations) {
        this.stages.then = Array.isArray(expectations) ? expectations : [expectations];
        return this;
    }

    withCleanup(cleanupFunctions) {
        this.stages.cleanup = Array.isArray(cleanupFunctions) ? cleanupFunctions : [cleanupFunctions];
        return this;
    }

    async execute(context = {}) {
        // Execute stages in optimized order
        for (const condition of this.stages.given) {
            await condition(context);
        }

        let result;
        try {
            result = await this.stages.when(context);
            context.result = result;

            // Execute expectations in parallel where possible
            await Promise.all(this.stages.then.map(expectation => expectation(context)));
        } finally {
            // Execute cleanup in reverse order
            for (const cleanup of this.stages.cleanup.reverse()) {
                await cleanup(context);
            }
        }

        return result;
    }
}

// Parameterized testing with batch execution
export const createParameterizedTestSuite = (suiteName, testCases, testFunction, config = {}) => {
    describe(suiteName, () => {
        // Execute tests in batches for performance
        const batchSize = 10;
        for (let i = 0; i < testCases.length; i += batchSize) {
            const batch = testCases.slice(i, i + batchSize);
            batch.forEach((testCase, index) => {
                const testName = testCase.name || `test case ${i + index + 1}`;
                test(testName, async () => {
                    try {
                        await testFunction(testCase, config);
                    } catch (error) {
                        error.message = `Failed in test case "${testName}": ${error.message}`;
                        throw error;
                    }
                });
            });
        }
    });
};

// Predefined test data sets for common scenarios
export const TEST_DATA_SETS = {
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
        }
    ]
};

// Scenario data factory with caching
export const createScenarioData = (scenarioType, params = {}) => {
    const cacheKey = `${scenarioType}:${JSON.stringify(params)}`;

    if (ConfigRegistry.cache.get(cacheKey)) {
        return ConfigRegistry.cache.get(cacheKey);
    }

    let data;

    switch (scenarioType) {
        case 'TASK_CREATION':
            data = {
                taskDef: {
                    sentence: params.sentence || '(test --> term)',
                    punctuation: params.punctuation || '.',
                    truth: params.truth || [0.9, 0.8]
                }
            };
            break;

        case 'REASONING_CYCLE':
            data = {
                inputTasks: params.inputTasks || [
                    {sentence: '(A --> B)', truth: [0.8, 0.9]},
                    {sentence: '(B --> C)', truth: [0.85, 0.88]}
                ],
                expectedOutput: params.expectedOutput || {sentence: '(A --> C)', truth: [0.68, 0.70]},
                config: params.config || {strategy: 'BruteForce'}
            };
            break;

        case 'MEMORY_OPERATION':
            data = {
                initialMemory: params.initialMemory || [],
                operations: params.operations || [],
                expectedState: params.expectedState || {}
            };
            break;

        case 'ERROR_HANDLING':
            data = {
                inputs: params.inputs || [],
                expectedErrors: params.expectedErrors || [],
                recoverySteps: params.recoverySteps || []
            };
            break;

        default:
            data = params;
    }

    ConfigRegistry.cache.set(cacheKey, data);
    return data;
};

// Backward compatibility exports - only export the function, not the templates
export const createTestConfig = (templateNameOrConfig = 'UNIT', overrides = {}) => {
    // Handle case where first parameter is an object (direct config)
    if (typeof templateNameOrConfig === 'object' && templateNameOrConfig !== null) {
        return {...ConfigRegistry.get('UNIT_TEST'), ...templateNameOrConfig};
    }

    // Handle case where first parameter is a string (template name)
    const templateName = templateNameOrConfig || 'UNIT';
    const resolvedTemplateName = templateName === 'UNIT' ? 'UNIT_TEST' :
        templateName === 'INTEGRATION' ? 'INTEGRATION_TEST' :
            templateName === 'SYSTEM' ? 'SYSTEM_TEST' : templateName;

    // Get the base template and merge with overrides
    const baseConfig = ConfigRegistry.get(resolvedTemplateName);
    return {...baseConfig, ...overrides};
};

// Legacy exports for backward compatibility
export const TEST_CONFIG_TEMPLATES = {
    UNIT: {timeout: 5000, setup: 'unit', mockLevel: 'full', validation: {errorHandling: true, edgeCases: true}},
    INTEGRATION: {
        timeout: 10000,
        setup: 'integration',
        mockLevel: 'partial',
        validation: {componentInteraction: true, dataFlow: true, performance: true}
    },
    SYSTEM: {
        timeout: 30000,
        setup: 'system',
        mockLevel: 'minimal',
        validation: {endToEnd: true, performance: true, errorRecovery: true}
    }
};

export const TEST_CONTEXT_CONFIGS = {
    BASIC: {},
    WITH_MEMORY: {withMemory: true},
    WITH_REASONER: {withReasoner: true},
    FULL_SYSTEM: {withMemory: true, withReasoner: true},
    MINIMAL: {withSystem: false}
};

export const TEST_SUITE_CONFIGS = {
    PERFORMANCE: {
        iterations: 1000, timeout: 30000, memoryThreshold: 100 * 1024 * 1024,
        executionTimeThreshold: 1000, validation: ['execution_time', 'memory_usage', 'accuracy']
    },
    STRESS: {
        iterations: 10000, concurrency: 10, timeout: 60000,
        validation: ['error_rate', 'resource_usage', 'recovery']
    },
    REGRESSION: {
        focus: ['critical_path', 'common_scenarios'],
        validation: ['behavior', 'output_consistency'], comparison: true
    },
    COMPATIBILITY: {
        versions: ['current', 'previous'],
        validation: ['api_compatibility', 'data_format'], comparison: true
    }
};

// Performance monitoring
export const getConfigStats = () => ConfigRegistry.getStats();
export const resetConfigCache = () => ConfigRegistry.reset();
