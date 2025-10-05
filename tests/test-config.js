/**
 * Unified Test Configuration System
 * Consolidates all test configuration patterns into a single, coherent system
 */

// Default configurations for test data
export const DEFAULT_CONFIGS = {
    TASK: {
        punctuation: '.',
        truth: [1.0, 0.9],
        priority: 0
    },
    TERM: {
        complexity: 1,
        embedding: [0.1, 0.2, 0.3]
    },
    SYSTEM: {
        reasoner: {
            strategy: 'BruteForce'
        }
    }
};

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
 * Creates a context based on predefined configuration
 * @param {string} configName - Name of the predefined configuration
 * @param {object} overrides - Configuration overrides
 * @returns {object} Test context configuration
 */
export const createContextConfig = (configName, overrides = {}) => {
    const config = {
        ...TEST_CONTEXT_CONFIGS[configName] || TEST_CONTEXT_CONFIGS.BASIC,
        ...overrides
    };

    return config;
};

/**
 * Creates a test suite configuration
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
 * Test configuration documentation and validation
 */
export class TestConfigDocumentation {
    constructor() {
        this.options = new Map();
    }

    /**
     * Adds a configuration option to the documentation
     * @param {string} key - Configuration key
     * @param {string} type - Expected type (string, number, boolean, object, etc.)
     * @param {*} defaultValue - Default value
     * @param {string} description - Description of the option
     * @param {Array} allowedValues - Optional list of allowed values for validation
     * @returns {TestConfigDocumentation} Current instance for chaining
     */
    addOption(key, type, defaultValue, description, allowedValues = null) {
        this.options.set(key, {
            key,
            type,
            defaultValue,
            description,
            allowedValues,
            required: defaultValue === undefined
        });
        return this;
    }

    /**
     * Validates a configuration object against documented options
     * @param {object} config - Configuration object to validate
     * @returns {Array} Array of validation errors
     */
    validateConfig(config) {
        const errors = [];

        for (const [key, value] of Object.entries(config)) {
            const option = this.options.get(key);
            if (!option) {
                errors.push(`Unknown configuration option: ${key}`);
                continue;
            }

            // Validate type
            if (typeof value !== option.type && option.type !== 'any') {
                errors.push(`Invalid type for ${key}: expected ${option.type}, got ${typeof value}`);
            }

            // Validate allowed values if specified
            if (option.allowedValues && !option.allowedValues.includes(value)) {
                errors.push(`Invalid value for ${key}: ${value}. Allowed values: ${option.allowedValues.join(', ')}`);
            }
        }

        // Check for required options
        for (const [key, option] of this.options.entries()) {
            if (option.required && !(key in config)) {
                errors.push(`Missing required configuration option: ${key}`);
            }
        }

        return errors;
    }

    /**
     * Generates documentation for all configuration options
     */
    generateDocumentation() {
        let doc = `# Test Configuration Options\n\n`;
        doc += `This document describes all available test configuration options:\n\n`;

        for (const [key, option] of this.options.entries()) {
            doc += `## \`${key}\`\n\n`;
            doc += `- **Type:** ${option.type}\n`;
            doc += `- **Required:** ${option.required ? 'Yes' : 'No'}\n`;
            doc += `- **Default:** ${option.defaultValue === undefined ? 'N/A' : JSON.stringify(option.defaultValue)}\n`;
            doc += `- **Description:** ${option.description}\n`;

            if (option.allowedValues) {
                doc += `- **Allowed Values:** ${option.allowedValues.map(v => `\`${v}\``).join(', ')}\n`;
            }

            doc += `\n`;
        }

        return doc;
    }
}

// Export the documentation generator
export const TestConfigDoc = TestConfigDocumentation;