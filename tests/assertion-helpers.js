/**
 * Standardized Error Handling and Assertion Utilities
 * Provides consistent error handling and assertion patterns across tests
 */

import { expect } from 'vitest';

/**
 * Common truth value validation helper
 * @param {Object} actual - Actual truth value object
 * @param {number} expectedFreq - Expected frequency
 * @param {number} expectedConf - Expected confidence
 */
export const expectTruthValue = (actual, expectedFreq, expectedConf) => {
  expect(actual.frequency).toBeCloseTo(expectedFreq, 3);
  expect(actual.confidence).toBeCloseTo(expectedConf, 3);
};

/**
 * Common assertion for testing if an object is a valid task
 * @param {Object} task - The task to validate
 * @param {string} expectedTermKey - Expected term key
 * @param {string} expectedPunctuation - Expected punctuation
 * @param {Object} expectedTruth - Expected truth values
 */
export const assertTask = (task, expectedTermKey, expectedPunctuation, expectedTruth = null) => {
  expect(task).toBeDefined();
  expect(task.termKey).toBe(expectedTermKey);
  expect(task.punctuation).toBe(expectedPunctuation);
  if (expectedTruth) {
    expectTruthValue(task.state.truthValue, expectedTruth.frequency, expectedTruth.confidence);
  }
};

/**
 * Asserts that a function throws an error with the expected message
 * @param {Function} fn - Function to execute
 * @param {string|RegExp} expectedMessage - Expected error message or pattern
 * @param {string} context - Context for the assertion (for better error messages)
 */
export const expectToThrowError = (fn, expectedMessage, context = '') => {
  if (typeof expectedMessage === 'string') {
    expect(fn).toThrow(expectedMessage);
  } else if (expectedMessage instanceof RegExp) {
    const error = expect(() => fn()).toThrow();
    expect(error.message).toMatch(expectedMessage);
  } else {
    expect(fn).toThrow(expectedMessage);
  }
};

/**
 * Asserts that an async function rejects with the expected error
 * @param {Promise} promise - Promise to await
 * @param {string|RegExp} expectedMessage - Expected error message or pattern
 * @param {string} context - Context for the assertion (for better error messages)
 */
export const expectToRejectWithError = async (promise, expectedMessage, context = '') => {
  try {
    await promise;
    // If we reach this point, the promise didn't reject
    throw new Error(`Expected promise to reject but it resolved instead. Context: ${context}`);
  } catch (error) {
    if (typeof expectedMessage === 'string') {
      expect(error).toThrow(expectedMessage);
    } else if (expectedMessage instanceof RegExp) {
      expect(error.message).toMatch(expectedMessage);
    } else {
      expect(error).toBeInstanceOf(expectedMessage);
    }
  }
};

/**
 * Creates a reusable error validation function for specific error types
 * @param {string|RegExp} expectedMessage - Expected error message or pattern
 * @param {Function} errorConstructor - Expected error constructor (optional)
 * @returns {Function} Validation function
 */
export const createErrorValidator = (expectedMessage, errorConstructor = null) => {
  return (fn) => {
    if (errorConstructor) {
      const error = expect(fn).toThrow();
      expect(error).toBeInstanceOf(errorConstructor);
    } else {
      expectToThrowError(fn, expectedMessage);
    }
  };
};

/**
 * Validates that a function throws an error with the expected message containing specific text
 * @param {Function} fn - Function to test
 * @param {string} expectedText - Text that should be contained in the error message
 */
export const expectErrorToContain = (fn, expectedText) => {
  const error = expect(() => fn()).toThrow();
  expect(error.message).toContain(expectedText);
};

/**
 * Validates that an async function rejects with an error containing specific text
 * @param {Promise} promise - Promise to test
 * @param {string} expectedText - Text that should be contained in the error message
 */
export const expectRejectionToContain = async (promise, expectedText) => {
  try {
    await promise;
    throw new Error('Expected promise to reject but it resolved instead.');
  } catch (error) {
    expect(error.message).toContain(expectedText);
  }
};

/**
 * Assertion helper for validating object properties
 * @param {Object} obj - Object to validate
 * @param {Object} expectedProps - Object with expected property values
 */
export const expectObjectProperties = (obj, expectedProps) => {
  expect(obj).toBeDefined();
  Object.keys(expectedProps).forEach(key => {
    expect(obj[key]).toEqual(expectedProps[key]);
  });
};

/**
 * Assertion helper for validating object structure (keys present)
 * @param {Object} obj - Object to validate
 * @param {string[]} expectedKeys - Array of expected keys
 */
export const expectObjectStructure = (obj, expectedKeys) => {
  expect(obj).toBeDefined();
  expectedKeys.forEach(key => {
    expect(obj).toHaveProperty(key);
  });
};

/**
 * Assertion helper for validating array length
 * @param {Array} arr - Array to validate
 * @param {number} expectedLength - Expected length
 */
export const expectArrayLength = (arr, expectedLength) => {
  expect(arr).toHaveLength(expectedLength);
};

/**
 * Assertion helper for validating array contains specific items
 * @param {Array} arr - Array to validate
 * @param {any[]} expectedItems - Array of expected items
 */
export const expectArrayContains = (arr, expectedItems) => {
  expectedItems.forEach(item => {
    expect(arr).toContainEqual(item);
  });
};

/**
 * Assertion helper for validating that a value is close to expected value within tolerance
 * @param {number} actual - Actual value
 * @param {number} expected - Expected value
 * @param {number} tolerance - Tolerance level (default: 0.001)
 */
export const expectCloseTo = (actual, expected, tolerance = 0.001) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

/**
 * Validates that a function completes within a specified time
 * @param {Function} fn - Function to execute
 * @param {number} maxTimeMs - Maximum allowed time in milliseconds
 * @param {string} description - Description of the test for error reporting
 */
export const expectToCompleteWithinTime = (fn, maxTimeMs, description = 'function execution') => {
  const startTime = Date.now();
  const result = fn();
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  
  expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
  return result; // Return the result in case it's needed
};

/**
 * Validates that an async function completes within a specified time
 * @param {Function} asyncFn - Async function to execute
 * @param {number} maxTimeMs - Maximum allowed time in milliseconds
 * @param {string} description - Description of the test for error reporting
 */
export const expectAsyncToCompleteWithinTime = async (asyncFn, maxTimeMs, description = 'async function execution') => {
  const startTime = Date.now();
  const result = await asyncFn();
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  
  expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
  return result; // Return the result in case it's needed
};

/**
 * Common assertion for testing term properties
 * @param {Object} term - The term to validate
 * @param {string} expectedKey - Expected term key
 * @param {number} expectedComplexity - Expected complexity (optional)
 */
export const assertTerm = (term, expectedKey, expectedComplexity = null) => {
  expect(term).toBeDefined();
  expect(term.key).toBe(expectedKey);
  if (expectedComplexity !== null) {
    expect(term.complexity).toBe(expectedComplexity);
  }
};

/**
 * Assertion helper for validating truth value properties with custom precision
 * @param {Object} truthValue - Truth value object to validate
 * @param {number} expectedFreq - Expected frequency
 * @param {number} expectedConf - Expected confidence
 * @param {number} precision - Number of decimal places precision (default: 3)
 */
export const expectTruthValueWithPrecision = (truthValue, expectedFreq, expectedConf, precision = 3) => {
  expect(truthValue.frequency).toBeCloseTo(expectedFreq, precision);
  expect(truthValue.confidence).toBeCloseTo(expectedConf, precision);
};

/**
 * Creates a comprehensive validation helper for task objects
 * @param {Object} task - Task object to validate
 * @param {Object} validationRules - Object with validation rules
 */
export const validateTask = (task, validationRules) => {
  if (validationRules.hasOwnProperty('termKey')) {
    expect(task.termKey).toBe(validationRules.termKey);
  }
  if (validationRules.hasOwnProperty('punctuation')) {
    expect(task.punctuation).toBe(validationRules.punctuation);
  }
  if (validationRules.truth) {
    expectTruthValue(
      task.state.truthValue,
      validationRules.truth.frequency,
      validationRules.truth.confidence
    );
  }
  if (validationRules.priority !== undefined) {
    expect(task.state.priority).toBe(validationRules.priority);
  }
  if (validationRules.hasOwnProperty('type')) {
    expect(task.type).toBe(validationRules.type);
  }
};