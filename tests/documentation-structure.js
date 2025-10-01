/**
 * Enhanced Test Documentation and Structure
 * Provides better organization and documentation for test files
 */

/**
 * Test Organization Guidelines
 * 
 * This document outlines the recommended structure and documentation practices
 * for tests in this project to ensure maintainability and clarity.
 * 
 * 1. FILE NAMING
 *    - Use descriptive names that clearly indicate what is being tested
 *    - Follow the pattern: [component-name].[test-type].test.js
 *    - Examples: task-processing.unit.test.js, memory-management.integration.test.js
 * 
 * 2. DIRECTORY STRUCTURE
 *    - Organize tests by type (unit, integration, system) and feature
 *    - Maintain parallel structure to source code when possible
 *    - Use index files to group related tests
 * 
 * 3. TEST DOCUMENTATION
 *    - Document the purpose of each test suite and test case
 *    - Use clear, descriptive test names that read like specifications
 *    - Include expected behavior and edge cases in comments
 * 
 * 4. CODE STRUCTURE
 *    - Use consistent setup and teardown patterns
 *    - Follow AAA pattern: Arrange, Act, Assert
 *    - Keep tests focused and independent
 * 
 * 5. MOCKING STRATEGY
 *    - Use centralized mock factories for consistency
 *    - Document mock behavior and expectations
 *    - Validate mock usage to ensure test integrity
 */

/**
 * Test Suite Documentation Template
 * 
 * Use this template to document test suites with clear structure and purpose.
 */
export class TestSuiteDocumentation {
  constructor(name, description, category) {
    this.name = name;
    this.description = description;
    this.category = category; // unit, integration, system, etc.
    this.testCases = [];
    this.setupRequirements = [];
    this.invariants = [];
  }

  /**
   * Adds a test case to the documentation
   * @param {string} name - Name of the test case
   * @param {string} purpose - What the test case verifies
   * @param {string} scenario - Test scenario description
   * @param {string} expectedResult - Expected outcome
   * @returns {TestSuiteDocumentation} Current instance for chaining
   */
  addTestCase(name, purpose, scenario, expectedResult) {
    this.testCases.push({
      name,
      purpose,
      scenario,
      expectedResult
    });
    return this;
  }

  /**
   * Adds a setup requirement to the documentation
   * @param {string} requirement - Setup requirement
   * @returns {TestSuiteDocumentation} Current instance for chaining
   */
  addSetupRequirement(requirement) {
    this.setupRequirements.push(requirement);
    return this;
  }

  /**
   * Adds an invariant that should hold during tests
   * @param {string} invariant - System invariant to maintain
   * @returns {TestSuiteDocumentation} Current instance for chaining
   */
  addInvariant(invariant) {
    this.invariants.push(invariant);
    return this;
  }

  /**
   * Generates markdown documentation for the test suite
   */
  generateMarkdown() {
    let doc = `# Test Suite: ${this.name}\n\n`;
    doc += `**Category:** ${this.category}\n\n`;
    doc += `**Description:** ${this.description}\n\n`;
    
    if (this.setupRequirements.length > 0) {
      doc += `## Setup Requirements\n\n`;
      this.setupRequirements.forEach(req => {
        doc += `- ${req}\n`;
      });
      doc += '\n';
    }
    
    if (this.invariants.length > 0) {
      doc += `## System Invariants\n\n`;
      this.invariants.forEach(inv => {
        doc += `- ${inv}\n`;
      });
      doc += '\n';
    }
    
    if (this.testCases.length > 0) {
      doc += `## Test Cases\n\n`;
      this.testCases.forEach(testCase => {
        doc += `### ${testCase.name}\n\n`;
        doc += `- **Purpose:** ${testCase.purpose}\n`;
        doc += `- **Scenario:** ${testCase.scenario}\n`;
        doc += `- **Expected Result:** ${testCase.expectedResult}\n\n`;
      });
    }
    
    return doc;
  }
}

/**
 * Test Case Documentation Template
 * 
 * Use this template to document individual test cases with clear structure.
 */
export class TestCaseDocumentation {
  constructor(testName, feature, scenario, given, when, then, edgeCases = []) {
    this.testName = testName;
    this.feature = feature;
    this.scenario = scenario;
    this.given = given;  // Pre-conditions
    this.when = when;    // Action performed
    this.then = then;    // Expected outcome
    this.edgeCases = edgeCases;
    this.preconditions = [];
    this.postconditions = [];
    this.errorConditions = [];
  }

  /**
   * Adds a pre-condition to the test case documentation
   * @param {string} condition - Pre-condition that must be true
   * @returns {TestCaseDocumentation} Current instance for chaining
   */
  addPrecondition(condition) {
    this.preconditions.push(condition);
    return this;
  }

  /**
   * Adds a post-condition to the test case documentation
   * @param {string} condition - Post-condition that should be true after test
   * @returns {TestCaseDocumentation} Current instance for chaining
   */
  addPostcondition(condition) {
    this.postconditions.push(condition);
    return this;
  }

  /**
   * Adds an error condition to the test case documentation
   * @param {string} condition - Error condition to test for
   * @returns {TestCaseDocumentation} Current instance for chaining
   */
  addErrorCondition(condition) {
    this.errorConditions.push(condition);
    return this;
  }

  /**
   * Generates Gherkin-style documentation for the test case
   */
  generateGherkin() {
    let doc = `Feature: ${this.feature}\n\n`;
    doc += `  Scenario: ${this.scenario}\n`;
    
    if (this.preconditions.length > 0) {
      doc += `    # Pre-conditions\n`;
      this.preconditions.forEach(condition => {
        doc += `    # Given ${condition}\n`;
      });
      doc += `\n`;
    }
    
    doc += `    Given ${this.given}\n`;
    doc += `    When ${this.when}\n`;
    doc += `    Then ${this.then}\n`;
    
    if (this.postconditions.length > 0) {
      doc += `\n    # Post-conditions\n`;
      this.postconditions.forEach(condition => {
        doc += `    # Then ${condition}\n`;
      });
    }
    
    if (this.errorConditions.length > 0) {
      doc += `\n    # Error conditions\n`;
      this.errorConditions.forEach(condition => {
        doc += `    # When error condition: ${condition}\n`;
      });
    }
    
    if (this.edgeCases.length > 0) {
      doc += `\n    # Edge cases covered:\n`;
      this.edgeCases.forEach(edgeCase => {
        doc += `    # - ${edgeCase}\n`;
      });
    }
    
    return doc;
  }

  /**
   * Generates a test plan entry for the test case
   */
  generateTestPlanEntry() {
    return {
      testName: this.testName,
      feature: this.feature,
      scenario: this.scenario,
      steps: [
        { step: 'Given', action: this.given },
        { step: 'When', action: this.when },
        { step: 'Then', action: this.then }
      ],
      preconditions: this.preconditions,
      postconditions: this.postconditions,
      edgeCases: this.edgeCases,
      errorConditions: this.errorConditions
    };
  }
}

/**
 * Test Configuration Documentation
 * 
 * Provides documentation for test configuration options and their meanings.
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

/**
 * Test Metadata Utility
 * 
 * Provides utilities for adding metadata to tests to improve organization and searchability.
 */
export class TestMetadata {
  constructor() {
    this.metadata = new Map();
  }

  /**
   * Adds metadata to a test
   * @param {string} testName - Name of the test
   * @param {object} data - Metadata to add
   */
  add(testName, data) {
    if (!this.metadata.has(testName)) {
      this.metadata.set(testName, []);
    }
    this.metadata.get(testName).push(data);
  }

  /**
   * Gets metadata for a test
   * @param {string} testName - Name of the test
   * @returns {Array} Array of metadata objects
   */
  get(testName) {
    return this.metadata.get(testName) || [];
  }

  /**
   * Filters tests by metadata
   * @param {Function} predicate - Function to test metadata
   * @returns {Array} Array of test names that match the predicate
   */
  filterTests(predicate) {
    const matchingTests = [];
    
    for (const [testName, metadataList] of this.metadata.entries()) {
      if (metadataList.some(metadata => predicate(metadata))) {
        matchingTests.push(testName);
      }
    }
    
    return matchingTests;
  }

  /**
   * Generates a test index based on metadata
   */
  generateIndex() {
    const index = {
      byCategory: {},
      byFeature: {},
      byPriority: {},
      byStatus: {}
    };

    for (const [testName, metadataList] of this.metadata.entries()) {
      for (const metadata of metadataList) {
        // Categorize by category
        if (metadata.category) {
          if (!index.byCategory[metadata.category]) {
            index.byCategory[metadata.category] = [];
          }
          index.byCategory[metadata.category].push(testName);
        }

        // Categorize by feature
        if (metadata.feature) {
          if (!index.byFeature[metadata.feature]) {
            index.byFeature[metadata.feature] = [];
          }
          index.byFeature[metadata.feature].push(testName);
        }

        // Categorize by priority
        if (metadata.priority) {
          if (!index.byPriority[metadata.priority]) {
            index.byPriority[metadata.priority] = [];
          }
          index.byPriority[metadata.priority].push(testName);
        }

        // Categorize by status
        if (metadata.status) {
          if (!index.byStatus[metadata.status]) {
            index.byStatus[metadata.status] = [];
          }
          index.byStatus[metadata.status].push(testName);
        }
      }
    }

    return index;
  }
}

/**
 * Utility for generating test documentation
 */
export const TestDocumentationGenerator = {
  /**
   * Creates a test suite documentation template
   * @param {string} name - Name of the test suite
   * @param {string} description - Description of the test suite
   * @param {string} category - Category of the test suite (unit, integration, etc.)
   * @returns {TestSuiteDocumentation} New test suite documentation instance
   */
  createSuiteDoc(name, description, category) {
    return new TestSuiteDocumentation(name, description, category);
  },

  /**
   * Creates a test case documentation template
   * @param {string} testName - Name of the test case
   * @param {string} feature - Feature being tested
   * @param {string} scenario - Test scenario
   * @param {string} given - Given condition
   * @param {string} when - When action
   * @param {string} then - Then expectation
   * @param {Array} edgeCases - List of edge cases covered
   * @returns {TestCaseDocumentation} New test case documentation instance
   */
  createCaseDoc(testName, feature, scenario, given, when, then, edgeCases = []) {
    return new TestCaseDocumentation(testName, feature, scenario, given, when, then, edgeCases);
  },

  /**
   * Creates a test configuration documentation
   * @returns {TestConfigDocumentation} New test config documentation instance
   */
  createConfigDoc() {
    return new TestConfigDocumentation();
  },

  /**
   * Creates a test metadata instance
   * @returns {TestMetadata} New test metadata instance
   */
  createMetadata() {
    return new TestMetadata();
  }
};

/**
 * Documentation for common test patterns used in this project
 */
export const COMMON_TEST_PATTERNS = {
  'AAA (Arrange-Act-Assert)': {
    description: 'Structure tests with clear setup, execution, and validation phases',
    example: `
      test('should process task correctly', () => {
        // Arrange - Setup test data
        const task = createTask('test', '.');
        const processor = new TaskProcessor();
        
        // Act - Execute the operation
        const result = processor.process(task);
        
        // Assert - Validate the result
        expect(result).toBeDefined();
      });
    `
  },
  
  'Given-When-Then': {
    description: 'Behavior-driven test structure that describes conditions and outcomes',
    example: `
      test('when task has high priority then it should be processed first', () => {
        // Given a high priority task
        const highPriorityTask = createTask('urgent', '!', { priority: 1.0 });
        const lowPriorityTask = createTask('normal', '.', { priority: 0.1 });
        
        // When both tasks are added to queue
        processor.addTask(lowPriorityTask);
        processor.addTask(highPriorityTask);
        
        // Then high priority task is processed first
        const firstProcessed = processor.getNextTask();
        expect(firstProcessed).toBe(highPriorityTask);
      });
    `
  },
  
  'Test Data Builders': {
    description: 'Use factory functions to create consistent test data',
    example: `
      // In test-data-factory.js
      export const createTaskDef = (sentence, punctuation = '.', truth = [1.0, 0.9]) => {
        return { sentence, punctuation, truth };
      };
    `
  },
  
  'Parameterized Testing': {
    description: 'Run the same test with different data sets',
    example: `
      const testCases = [
        { input: 'data1', expected: 'result1' },
        { input: 'data2', expected: 'result2' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        test(\`should handle input \${input}\`, () => {
          const result = system.process(input);
          expect(result).toBe(expected);
        });
      });
    `
  }
};

// Export the documentation generator
export const DocGen = TestDocumentationGenerator;