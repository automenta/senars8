/**
 * Base test class providing common functionality for all test types
 * Ensures consistent test patterns across Core, Agent, and UI modules
 */

import { TEST_CONFIG, TestUtilities, PerformanceTester } from './TestConfig.js';
import {SeNARSError} from '../core/utils/errorHandling.js';

export class BaseTest {
  constructor(options = {}) {
    this.options = {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
      retries: TEST_CONFIG.DEFAULT_RETRIES,
      ...options
    };
    
    this.startTime = null;
    this.endTime = null;
    this.testResults = [];
    this.errors = [];
  }

  // Setup method to be overridden by subclasses
  async setup() {
    this.startTime = Date.now();
  }

  // Teardown method to be overridden by subclasses
  async teardown() {
    this.endTime = Date.now();
  }

  // Run a single test case
  async runTest(testName, testFn) {
    const testResult = {
      name: testName,
      passed: false,
      error: null,
      startTime: Date.now(),
      endTime: null,
      executionTime: null
    };

    try {
      await TestUtilities.safeTest(async () => {
        await testFn();
      }, `Test "${testName}" failed`);
      
      testResult.passed = true;
    } catch (error) {
      testResult.error = error;
      this.errors.push({ testName, error });
    } finally {
      testResult.endTime = Date.now();
      testResult.executionTime = testResult.endTime - testResult.startTime;
      this.testResults.push(testResult);
    }

    return testResult;
  }

  // Run test with retries
  async runTestWithRetry(testName, testFn, retries = this.options.retries) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.runTest(testName, testFn);
      } catch (error) {
        lastError = error;
        if (attempt === retries) break;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }
    
    // If all retries failed, add the error to test results manually
    const testResult = {
      name: testName,
      passed: false,
      error: lastError,
      startTime: Date.now(),
      endTime: Date.now(),
      executionTime: 0
    };
    
    this.testResults.push(testResult);
    this.errors.push({ testName, error: lastError });
    return testResult;
  }

  // Performance test
  async runPerformanceTest(testName, operationFn, threshold = TEST_CONFIG.PERFORMANCE.MAX_RENDER_TIME) {
    const testResult = {
      name: testName,
      passed: false,
      error: null,
      startTime: Date.now(),
      endTime: null,
      executionTime: null,
      performance: null
    };

    try {
      const perfResult = await PerformanceTester.measureAsyncOperation(operationFn);
      testResult.performance = perfResult;
      testResult.executionTime = perfResult.executionTime;
      
      PerformanceTester.assertPerformance(perfResult, threshold);
      testResult.passed = true;
    } catch (error) {
      testResult.error = error;
      this.errors.push({ testName, error });
    } finally {
      testResult.endTime = Date.now();
      this.testResults.push(testResult);
    }

    return testResult;
  }

  // Assert helpers
  assert(condition, message = 'Assertion failed') {
    if (!condition) {
      throw new SeNARSError(message, 'TEST_ASSERTION', 'HIGH');
    }
  }

  assertEquals(actual, expected, message = `Expected ${expected}, got ${actual}`) {
    this.assert(actual === expected, message);
  }

  assertNotEquals(actual, expected, message = `Expected value other than ${expected}`) {
    this.assert(actual !== expected, message);
  }

  assertTruthy(value, message = `Expected truthy value, got ${value}`) {
    this.assert(!!value, message);
  }

  assertFalsey(value, message = `Expected falsy value, got ${value}`) {
    this.assert(!value, message);
  }

  assertInstanceOf(obj, constructor, message = `Expected instance of ${constructor.name}`) {
    this.assert(obj instanceof constructor, message);
  }

  // Async assertion helpers
  async assertResolves(promise, message = 'Expected promise to resolve') {
    try {
      await promise;
    } catch (error) {
      throw new SeNARSError(`${message}: ${error.message}`, 'TEST_ASSERTION', 'HIGH');
    }
  }

  async assertRejects(promise, expectedError = null, message = 'Expected promise to reject') {
    try {
      await promise;
      throw new SeNARSError(message, 'TEST_ASSERTION', 'HIGH');
    } catch (error) {
      if (expectedError && !(error instanceof expectedError)) {
        throw new SeNARSError(
          `Expected error of type ${expectedError.name}, got ${error.constructor.name}`,
          'TEST_ASSERTION',
          'HIGH'
        );
      }
    }
  }

  // Get test statistics
  getStats() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const totalTime = (this.endTime || Date.now()) - (this.startTime || Date.now());
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      totalTime: this.endTime ? totalTime : 0,
      averageTestTime: totalTests > 0 ? 
        this.testResults.reduce((sum, t) => sum + t.executionTime, 0) / totalTests : 0
    };
  }

  // Print test report
  printReport() {
    const stats = this.getStats();
    
    console.log('\\n=== Test Report ===');
    console.log(`Total Tests: ${stats.totalTests}`);
    console.log(`Passed: ${stats.passedTests}`);
    console.log(`Failed: ${stats.failedTests}`);
    console.log(`Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`Total Time: ${stats.totalTime}ms`);
    
    if (this.errors.length > 0) {
      console.log('\\nErrors:');
      this.errors.forEach(({ testName, error }) => {
        console.log(`  ${testName}: ${error.message}`);
      });
    }
    
    console.log('==================\\n');
  }
}

// Extended base class for API testing
export class APITest extends BaseTest {
  constructor(api, options = {}) {
    super(options);
    this.api = api;
  }

  async setup() {
    await super.setup();
    this.assertTruthy(this.api, 'API instance is required for APITest');
  }
}

// Extended base class for component testing
export class ComponentTest extends BaseTest {
  constructor(component, options = {}) {
    super(options);
    this.component = component;
  }

  async setup() {
    await super.setup();
  }
}

// Extended base class for integration testing
export class IntegrationTest extends BaseTest {
  constructor(options = {}) {
    super(options);
    this.services = new Map();
  }

  registerService(name, service) {
    this.services.set(name, service);
  }

  getService(name) {
    return this.services.get(name);
  }

  async setup() {
    await super.setup();
  }
}

export default BaseTest;