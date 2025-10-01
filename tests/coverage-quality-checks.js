/**
 * Test Coverage Improvements and Quality Checks
 * Enhanced utilities for comprehensive testing and quality validation
 */

import { expect } from 'vitest';

/**
 * Utility for testing edge cases systematically
 */
export class EdgeCaseTester {
  constructor() {
    this.tests = [];
  }

  /**
   * Adds a range test for numeric values
   * @param {Function} fn - Function to test
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} step - Step increment
   * @param {Function} validator - Validation function
   */
  addRangeTest(fn, min, max, step = 1, validator = () => {}) {
    for (let i = min; i <= max; i += step) {
      this.tests.push({
        name: `Range test value ${i}`,
        execute: () => fn(i),
        validate: (result) => validator(result, i)
      });
    }
    return this;
  }

  /**
   * Adds boundary value tests
   * @param {Function} fn - Function to test
   * @param {Array} boundaries - Array of boundary values to test
   * @param {Function} validator - Validation function
   */
  addBoundaryTests(fn, boundaries, validator = () => {}) {
    boundaries.forEach(boundary => {
      // Test the boundary value itself
      this.tests.push({
        name: `Boundary test: ${boundary}`,
        execute: () => fn(boundary),
        validate: (result) => validator(result, boundary)
      });

      // Test just below the boundary
      if (typeof boundary === 'number') {
        const justBelow = boundary - 0.001;
        this.tests.push({
          name: `Below boundary: ${justBelow}`,
          execute: () => fn(justBelow),
          validate: (result) => validator(result, justBelow)
        });

        // Test just above the boundary
        const justAbove = boundary + 0.001;
        this.tests.push({
          name: `Above boundary: ${justAbove}`,
          execute: () => fn(justAbove),
          validate: (result) => validator(result, justAbove)
        });
      }
    });
    return this;
  }

  /**
   * Adds null/undefined/empty tests
   * @param {Function} fn - Function to test
   * @param {Function} validator - Validation function for error cases
   */
  addNullUndefinedTests(fn, validator = (result, input) => {}) {
    [null, undefined, ''].forEach(value => {
      this.tests.push({
        name: `Null/undefined test: ${String(value)}`,
        execute: () => {
          try {
            return fn(value);
          } catch (error) {
            return { error };
          }
        },
        validate: (result) => validator(result, value)
      });
    });
    return this;
  }

  /**
   * Adds array edge case tests
   * @param {Function} fn - Function to test
   * @param {Function} validator - Validation function
   */
  addArrayEdgeCaseTests(fn, validator = () => {}) {
    // Empty array
    this.tests.push({
      name: 'Empty array test',
      execute: () => fn([]),
      validate: (result) => validator(result, [])
    });

    // Single element array
    this.tests.push({
      name: 'Single element array test',
      execute: () => fn([1]),
      validate: (result) => validator(result, [1])
    });

    // Large array
    const largeArray = Array(10000).fill(1);
    this.tests.push({
      name: 'Large array test',
      execute: () => fn(largeArray),
      validate: (result) => validator(result, largeArray)
    });

    return this;
  }

  /**
   * Runs all added tests
   */
  async runAll() {
    for (const test of this.tests) {
      try {
        const result = await test.execute();
        test.validate(result);
        // Optionally log success
        // console.log(`✓ ${test.name}`);
      } catch (error) {
        console.error(`✗ ${test.name}: ${error.message}`);
        throw new Error(`Edge case test failed: ${test.name}. Error: ${error.message}`);
      }
    }
  }
}

/**
 * Property-based testing utility
 */
export class PropertyBasedTester {
  constructor(generatorFn) {
    this.generator = generatorFn;
    this.properties = [];
  }

  /**
   * Adds a property to test
   * @param {string} name - Name of the property
   * @param {Function} propertyFn - Function that tests the property
   */
  addProperty(name, propertyFn) {
    this.properties.push({ name, propertyFn });
    return this;
  }

  /**
   * Runs property tests with generated inputs
   * @param {number} iterations - Number of iterations to run
   */
  async run(iterations = 100) {
    for (let i = 0; i < iterations; i++) {
      const input = this.generator();
      for (const prop of this.properties) {
        try {
          const result = prop.propertyFn(input);
          expect(result).toBe(true);
        } catch (error) {
          throw new Error(`Property "${prop.name}" failed for input ${JSON.stringify(input)}: ${error.message}`);
        }
      }
    }
  }
}

/**
 * Async behavior testing utilities
 */
export class AsyncTestUtils {
  /**
   * Tests that a promise resolves within a timeout
   * @param {Promise} promise - Promise to test
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  static async expectToResolveWithin(promise, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Promise did not resolve within ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Tests that a promise rejects within a timeout
   * @param {Promise} promise - Promise to test
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  static async expectToRejectWithin(promise, timeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Promise did not reject within ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      await Promise.race([promise.then(() => { throw new Error('Expected promise to reject but it resolved'); }), timeoutPromise]);
    } catch (error) {
      if (error.message.includes('Expected promise to reject')) {
        throw error;
      }
      // If we get here, the promise rejected within the timeout as expected
      return;
    }
  }

  /**
   * Tests concurrent execution of promises
   * @param {Array} promiseFactories - Array of promise factory functions
   */
  static async testConcurrentExecution(promiseFactories, expectedResults = null) {
    const promises = promiseFactories.map(factory => factory());
    const results = await Promise.all(promises);

    if (expectedResults) {
      expect(results).toEqual(expectedResults);
    }

    return results;
  }

  /**
   * Tests for race conditions
   * @param {Array} promiseFactories - Array of promise factory functions
   * @param {Function} validator - Function to validate results
   */
  static async testRaceConditions(promiseFactories, validator) {
    const promises = promiseFactories.map(factory => factory());
    const results = await Promise.allSettled(promises);
    
    // Check if all promises resolved successfully
    const rejected = results.filter(result => result.status === 'rejected');
    if (rejected.length > 0) {
      const errorMessages = rejected.map(r => r.reason.message).join(', ');
      throw new Error(`Race condition detected - some promises failed: ${errorMessages}`);
    }
    
    const fulfilledValues = results.filter(result => result.status === 'fulfilled').map(r => r.value);
    return validator(fulfilledValues);
  }
}

/**
 * Timing-sensitive test utilities
 */
export class TimingTestUtils {
  /**
   * Tests that a function is called after a certain delay
   * @param {Function} fn - Function to test
   * @param {number} expectedDelay - Expected delay in milliseconds
   * @param {number} tolerance - Tolerance in milliseconds
   */
  static async testFunctionTiming(fn, expectedDelay, tolerance = 100) {
    const startTime = Date.now();
    await fn();
    const actualDelay = Date.now() - startTime;
    
    expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - tolerance);
    expect(actualDelay).toBeLessThanOrEqual(expectedDelay + tolerance);
  }

  /**
   * Tests forgetting mechanism with timing
   * @param {Object} memory - Memory object with forgetting capabilities
   * @param {number} forgetTime - Time after which items should be forgotten
   */
  static async testForgettingMechanism(memory, forgetTime) {
    // Add an item to memory
    const testItem = { id: 'test', timestamp: Date.now() };
    if (memory.addItem) {
      await memory.addItem(testItem);
    }
    
    // Wait for the forgetting time
    await new Promise(resolve => setTimeout(resolve, forgetTime + 100));
    
    // Check if the item has been forgotten
    let isForgotten = false;
    if (memory.removeItem && memory.hasItem) {
      isForgotten = !memory.hasItem(testItem.id);
    } else if (memory.delete && memory.get) {
      isForgotten = memory.get(testItem.id) === undefined;
    }
    
    expect(isForgotten).toBe(true);
  }

  /**
   * Tests periodic operations
   * @param {Function} operation - Operation to test
   * @param {number} interval - Expected interval in milliseconds
   * @param {number} iterations - Number of iterations to test
   */
  static async testPeriodicOperation(operation, interval, iterations = 5) {
    const timestamps = [];
    
    for (let i = 0; i < iterations; i++) {
      timestamps.push(Date.now());
      await operation();
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    // Validate that the intervals are approximately correct
    for (let i = 1; i < timestamps.length; i++) {
      const actualInterval = timestamps[i] - timestamps[i - 1];
      const tolerance = interval * 0.5; // 50% tolerance
      expect(actualInterval).toBeGreaterThanOrEqual(interval - tolerance);
      expect(actualInterval).toBeLessThanOrEqual(interval + tolerance);
    }
  }
}

/**
 * Coverage reporting utilities
 */
export class CoverageReporter {
  constructor() {
    this.coverageData = {
      functions: 0,
      functionsCovered: 0,
      lines: 0,
      linesCovered: 0,
      branches: 0,
      branchesCovered: 0
    };
  }

  /**
   * Reports coverage statistics
   */
  report() {
    const functionCoverage = this.coverageData.functions > 0 ? 
      (this.coverageData.functionsCovered / this.coverageData.functions) * 100 : 0;
    const lineCoverage = this.coverageData.lines > 0 ? 
      (this.coverageData.linesCovered / this.coverageData.lines) * 100 : 0;
    const branchCoverage = this.coverageData.branches > 0 ? 
      (this.coverageData.branchesCovered / this.coverageData.branches) * 100 : 0;

    console.log(`Function coverage: ${this.coverageData.functionsCovered}/${this.coverageData.functions} (${functionCoverage.toFixed(2)}%)`);
    console.log(`Line coverage: ${this.coverageData.linesCovered}/${this.coverageData.lines} (${lineCoverage.toFixed(2)}%)`);
    console.log(`Branch coverage: ${this.coverageData.branchesCovered}/${this.coverageData.branches} (${branchCoverage.toFixed(2)}%)`);
    
    return {
      function: functionCoverage,
      line: lineCoverage,
      branch: branchCoverage
    };
  }

  /**
   * Updates function coverage data
   * @param {number} total - Total number of functions
   * @param {number} covered - Number of covered functions
   */
  updateFunctionCoverage(total, covered) {
    this.coverageData.functions = total;
    this.coverageData.functionsCovered = covered;
  }

  /**
   * Updates line coverage data
   * @param {number} total - Total number of lines
   * @param {number} covered - Number of covered lines
   */
  updateLineCoverage(total, covered) {
    this.coverageData.lines = total;
    this.coverageData.linesCovered = covered;
  }

  /**
   * Updates branch coverage data
   * @param {number} total - Total number of branches
   * @param {number} covered - Number of covered branches
   */
  updateBranchCoverage(total, covered) {
    this.coverageData.branches = total;
    this.coverageData.branchesCovered = covered;
  }
}

/**
 * Comprehensive test coverage checker
 */
export const runComprehensiveCoverageTests = async (testFn, inputs) => {
  const results = [];
  
  // Test all inputs
  for (const input of inputs) {
    try {
      const result = await testFn(input);
      results.push({ input, result, error: null });
    } catch (error) {
      results.push({ input, result: null, error: error.message });
    }
  }
  
  // Calculate coverage metrics
  const totalTests = inputs.length;
  const passedTests = results.filter(r => r.error === null).length;
  const coveragePercentage = (passedTests / totalTests) * 100;
  
  return {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    coverage: coveragePercentage,
    results
  };
};

/**
 * Mutation testing helper - tests if tests can catch changes
 */
export class MutationTester {
  constructor(originalFunction, mutatedFunctions) {
    this.original = originalFunction;
    this.mutants = mutatedFunctions;
  }

  /**
   * Runs tests against original and mutated functions
   * @param {Function} testFunction - Test function to run
   * @returns {object} Mutation testing report
   */
  async run(testFunction) {
    // Run test against original
    let originalPassed = true;
    try {
      await testFunction(this.original);
    } catch {
      originalPassed = false;
    }

    // Run test against each mutant
    const results = [];
    for (let i = 0; i < this.mutants.length; i++) {
      let mutantPassed = true;
      try {
        await testFunction(this.mutants[i]);
      } catch {
        mutantPassed = false;
      }
      
      results.push({
        id: i,
        passed: mutantPassed,
        caught: !mutantPassed // If mutant failed the test, it was "caught"
      });
    }

    const caughtMutants = results.filter(r => r.caught).length;
    const mutationScore = results.length > 0 ? (caughtMutants / results.length) * 100 : 0;

    return {
      originalPassed,
      totalMutants: results.length,
      caughtMutants,
      escapedMutants: results.length - caughtMutants,
      mutationScore,
      details: results
    };
  }
}