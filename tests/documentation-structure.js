/**
 * Unified Documentation System
 * Consolidated documentation utilities for test organization
 */

import {DocumentationRegistry, generateDoc} from './shared/test-utils.js';

// Register documentation templates
DocumentationRegistry.register('suite', (data) => {
    const {name, description, category, testCases = [], setupRequirements = [], invariants = []} = data;

    let doc = `# Test Suite: ${name}\n\n`;
    doc += `**Category:** ${category}\n\n`;
    doc += `**Description:** ${description}\n\n`;

    if (setupRequirements.length > 0) {
        doc += `## Setup Requirements\n\n`;
        setupRequirements.forEach(req => doc += `- ${req}\n`);
        doc += '\n';
    }

    if (invariants.length > 0) {
        doc += `## System Invariants\n\n`;
        invariants.forEach(inv => doc += `- ${inv}\n`);
        doc += '\n';
    }

    if (testCases.length > 0) {
        doc += `## Test Cases\n\n`;
        testCases.forEach(testCase => {
            doc += `### ${testCase.name}\n\n`;
            doc += `- **Purpose:** ${testCase.purpose}\n`;
            doc += `- **Scenario:** ${testCase.scenario}\n`;
            doc += `- **Expected Result:** ${testCase.expectedResult}\n\n`;
        });
    }

    return doc;
});

DocumentationRegistry.register('gherkin', (data) => {
    const {feature, scenario, preconditions = [], given, when, then, postconditions = [], errorConditions = [], edgeCases = []} = data;

    let doc = `Feature: ${feature}\n\n`;
    doc += `  Scenario: ${scenario}\n`;

    if (preconditions.length > 0) {
        doc += `    # Pre-conditions\n`;
        preconditions.forEach(condition => doc += `    # Given ${condition}\n`);
        doc += `\n`;
    }

    doc += `    Given ${given}\n`;
    doc += `    When ${when}\n`;
    doc += `    Then ${then}\n`;

    if (postconditions.length > 0) {
        doc += `\n    # Post-conditions\n`;
        postconditions.forEach(condition => doc += `    # Then ${condition}\n`);
    }

    if (errorConditions.length > 0) {
        doc += `\n    # Error conditions\n`;
        errorConditions.forEach(condition => doc += `    # When error condition: ${condition}\n`);
    }

    if (edgeCases.length > 0) {
        doc += `\n    # Edge cases covered:\n`;
        edgeCases.forEach(edgeCase => doc += `    # - ${edgeCase}\n`);
    }

    return doc;
});

// Unified documentation API
export const generateDocumentation = (type, data) => generateDoc(type, data);

// Test organization guidelines
export const TEST_GUIDELINES = {
    NAMING: {
        pattern: '[component-name].[test-type].test.js',
        examples: ['task-processing.unit.test.js', 'memory-management.integration.test.js']
    },
    STRUCTURE: {
        organizeBy: ['type', 'feature'],
        parallelToSource: true,
        useIndexFiles: true
    },
    DOCUMENTATION: {
        documentPurpose: true,
        descriptiveNames: true,
        includeEdgeCases: true
    },
    CODE: {
        consistentSetup: true,
        aaaPattern: true,
        focusedTests: true
    },
    MOCKING: {
        centralizedFactories: true,
        documentBehavior: true,
        validateUsage: true
    }
};

// Common test patterns with examples
export const TEST_PATTERNS = {
    AAA: {
        description: 'Arrange-Act-Assert pattern for clear test structure',
        example: `test('should process task correctly', () => {
  // Arrange - Setup test data
  const task = createTask('test', '.');
  const processor = new TaskProcessor();

  // Act - Execute the operation
  const result = processor.process(task);

  // Assert - Validate the result
  expect(result).toBeDefined();
});`
    },
    BDD: {
        description: 'Given-When-Then pattern for behavior-driven tests',
        example: `test('when task has high priority then it should be processed first', () => {
  // Given a high priority task
  const highPriorityTask = createTask('urgent', '!', { priority: 1.0 });
  const lowPriorityTask = createTask('normal', '.', { priority: 0.1 });

  // When both tasks are added to queue
  processor.addTask(lowPriorityTask);
  processor.addTask(highPriorityTask);

  // Then high priority task is processed first
  const firstProcessed = processor.getNextTask();
  expect(firstProcessed).toBe(highPriorityTask);
});`
    },
    DATA_BUILDERS: {
        description: 'Factory functions for consistent test data creation',
        example: `export const createTaskDef = (sentence, punctuation = '.', truth = [1.0, 0.9]) => ({
  sentence, punctuation, truth
});`
    },
    PARAMETERIZED: {
        description: 'Run the same test logic with different data sets',
        example: `const testCases = [
  { input: 'data1', expected: 'result1' },
  { input: 'data2', expected: 'result2' }
];

testCases.forEach(({ input, expected }) => {
  test(\`should handle input \${input}\`, () => {
    const result = system.process(input);
    expect(result).toBe(expected);
  });
});`
    }
};

// Backward compatibility exports
export const TestDocumentationGenerator = {
    createSuiteDoc: (name, description, category) => ({
        name, description, category,
        testCases: [],
        setupRequirements: [],
        invariants: [],
        addTestCase: function(name, purpose, scenario, expectedResult) {
            this.testCases.push({name, purpose, scenario, expectedResult});
            return this;
        },
        addSetupRequirement: function(requirement) {
            this.setupRequirements.push(requirement);
            return this;
        },
        addInvariant: function(invariant) {
            this.invariants.push(invariant);
            return this;
        },
        generateMarkdown: function() {
            return generateDocumentation('suite', this);
        }
    }),
    createCaseDoc: (testName, feature, scenario, given, when, then, edgeCases = []) => ({
        testName, feature, scenario, given, when, then, edgeCases,
        preconditions: [],
        postconditions: [],
        errorConditions: [],
        addPrecondition: function(condition) {
            this.preconditions.push(condition);
            return this;
        },
        addPostcondition: function(condition) {
            this.postconditions.push(condition);
            return this;
        },
        addErrorCondition: function(condition) {
            this.errorConditions.push(condition);
            return this;
        },
        generateGherkin: function() {
            return generateDocumentation('gherkin', this);
        }
    }),
    createConfigDoc: () => ({
        options: new Map(),
        addOption: function(key, type, defaultValue, description, allowedValues = null) {
            this.options.set(key, {key, type, defaultValue, description, allowedValues, required: defaultValue === undefined});
            return this;
        },
        validateConfig: function(config) {
            const errors = [];
            for (const [key, value] of Object.entries(config)) {
                const option = this.options.get(key);
                if (!option) {
                    errors.push(`Unknown configuration option: ${key}`);
                    continue;
                }
                if (typeof value !== option.type && option.type !== 'any') {
                    errors.push(`Invalid type for ${key}: expected ${option.type}, got ${typeof value}`);
                }
                if (option.allowedValues && !option.allowedValues.includes(value)) {
                    errors.push(`Invalid value for ${key}: ${value}. Allowed values: ${option.allowedValues.join(', ')}`);
                }
            }
            for (const [key, option] of this.options.entries()) {
                if (option.required && !(key in config)) {
                    errors.push(`Missing required configuration option: ${key}`);
                }
            }
            return errors;
        },
        generateDocumentation: function() {
            return generateDocumentation('config', Array.from(this.options.values()));
        }
    }),
    createMetadata: () => ({
        metadata: new Map(),
        add: function(testName, data) {
            if (!this.metadata.has(testName)) {
                this.metadata.set(testName, []);
            }
            this.metadata.get(testName).push(data);
        },
        get: function(testName) {
            return this.metadata.get(testName) || [];
        },
        filterTests: function(predicate) {
            const matchingTests = [];
            for (const [testName, metadataList] of this.metadata.entries()) {
                if (metadataList.some(metadata => predicate(metadata))) {
                    matchingTests.push(testName);
                }
            }
            return matchingTests;
        },
        generateIndex: function() {
            const index = {byCategory: {}, byFeature: {}, byPriority: {}, byStatus: {}};
            for (const [testName, metadataList] of this.metadata.entries()) {
                for (const metadata of metadataList) {
                    if (metadata.category) {
                        if (!index.byCategory[metadata.category]) index.byCategory[metadata.category] = [];
                        index.byCategory[metadata.category].push(testName);
                    }
                    if (metadata.feature) {
                        if (!index.byFeature[metadata.feature]) index.byFeature[metadata.feature] = [];
                        index.byFeature[metadata.feature].push(testName);
                    }
                    if (metadata.priority) {
                        if (!index.byPriority[metadata.priority]) index.byPriority[metadata.priority] = [];
                        index.byPriority[metadata.priority].push(testName);
                    }
                    if (metadata.status) {
                        if (!index.byStatus[metadata.status]) index.byStatus[metadata.status] = [];
                        index.byStatus[metadata.status].push(testName);
                    }
                }
            }
            return index;
        }
    })
};

// Performance monitoring
export const getDocumentationStats = () => DocumentationRegistry.getStats();
export const resetDocumentationCache = () => DocumentationRegistry.reset();