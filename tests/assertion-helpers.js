/**
 * Standardized Error Handling and Assertion Utilities
 * Provides consistent error handling and assertion patterns across tests
 */

import {expect} from 'vitest';
import {commonValidators} from './common-validation-utils.js';

/**
 * Common truth value validation helper with configurable precision
 * @param {Object} actual - Actual truth value object
 * @param {number} expectedFreq - Expected frequency
 * @param {number} expectedConf - Expected confidence
 * @param {number} precision - Number of decimal places precision (default: 3)
 */
export const expectTruthValue = (actual, expectedFreq, expectedConf, precision = 3) => {
    expect(actual.frequency).toBeCloseTo(expectedFreq, precision);
    expect(actual.confidence).toBeCloseTo(expectedConf, precision);
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
 * Enhanced task assertion using common validators
 * @param {Object} task - The task to validate
 * @param {Object} validationSpec - Specification with expected values
 */
export const assertTaskWithSpec = (task, validationSpec) => {
    const {termKey, punctuation, truth} = validationSpec;

    if (termKey !== undefined) commonValidators.termKey(termKey)(task.termKey, 'task.termKey');
    if (punctuation !== undefined) commonValidators.punctuation(punctuation)(task.punctuation, 'task.punctuation');
    if (truth && truth.frequency !== undefined && truth.confidence !== undefined) {
        commonValidators.truthValue(truth.frequency, truth.confidence)(task.state.truthValue, 'task.state.truthValue');
    }
};

/**
 * Generic error assertion that handles both sync and async functions
 * @param {Function|Promise} fnOrPromise - Function to execute or Promise to await
 * @param {string|RegExp|Function} expectedError - Expected error message, pattern, or constructor
 * @param {string} context - Context for the assertion (for better error messages)
 */
export const expectToThrowError = async (fnOrPromise, expectedError, context = '') => {
    try {
        // Handle both sync and async cases
        const result = fnOrPromise && typeof fnOrPromise.then === 'function' ? await fnOrPromise : fnOrPromise();

        // If we reach this point, no error was thrown
        throw new Error(`Expected function/promise to throw/reject but it resolved instead. Context: ${context}`);
    } catch (error) {
        if (typeof expectedError === 'string') {
            expect(error.message).toContain(expectedError);
        } else if (expectedError instanceof RegExp) {
            expect(error.message).toMatch(expectedError);
        } else if (typeof expectedError === 'function') {
            expect(error).toBeInstanceOf(expectedError);
        } else {
            expect(error.message).toContain(String(expectedError));
        }
    }
};

/**
 * @deprecated Use expectToThrowError for both sync and async cases
 */
export const expectToRejectWithError = expectToThrowError;

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
 * Unified object validation helper with flexible options
 * @param {Object} obj - Object to validate
 * @param {Object} options - Validation options
 * @param {Object} options.properties - Object with expected property values
 * @param {string[]} options.requiredKeys - Array of required keys that must be present
 * @param {string[]} options.optionalKeys - Array of optional keys that may be present
 * @param {Object} options.types - Object mapping keys to expected types
 * @param {string} context - Context for error messages
 */
export const expectObject = (obj, options = {}, context = 'object') => {
    expect(obj).toBeDefined();

    const {properties = {}, requiredKeys = [], optionalKeys = [], types = {}} = options;

    // Check required keys are present
    requiredKeys.forEach(key => {
        expect(obj).toHaveProperty(key);
    });

    // Check properties match expected values
    Object.keys(properties).forEach(key => {
        expect(obj[key]).toEqual(properties[key]);
    });

    // Check types if specified
    Object.keys(types).forEach(key => {
        if (obj[key] !== undefined) {
            expect(typeof obj[key]).toBe(types[key]);
        }
    });

    // Check optional keys are present if specified
    optionalKeys.forEach(key => {
        if (options.checkOptional !== false) {
            expect(obj).toHaveProperty(key);
        }
    });
};

/**
 * @deprecated Use expectObject with {properties: expectedProps} instead
 */
export const expectObjectProperties = (obj, expectedProps) => {
    return expectObject(obj, {properties: expectedProps});
};

/**
 * @deprecated Use expectObject with {requiredKeys: expectedKeys} instead
 */
export const expectObjectStructure = (obj, expectedKeys) => {
    return expectObject(obj, {requiredKeys: expectedKeys});
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
 * @param {Function} fn - Function to execute (sync or async)
 * @param {number} maxTimeMs - Maximum allowed time in milliseconds
 * @param {string} description - Description of the test for error reporting
 * @returns {Promise|any} Function result
 */
export const expectToCompleteWithinTime = async (fn, maxTimeMs, description = 'function execution') => {
    const startTime = Date.now();

    try {
        // Check if it's an async function
        const result = fn();
        if (result && typeof result.then === 'function') {
            // It's a Promise
            const asyncResult = await result;
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
            return asyncResult;
        } else {
            // It's synchronous
            const endTime = Date.now();
            const executionTime = endTime - startTime;
            expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
            return result;
        }
    } catch (error) {
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
        throw error; // Re-throw the error after timing check
    }
};

/**
 * @deprecated Use expectToCompleteWithinTime for both sync and async functions
 */
export const expectAsyncToCompleteWithinTime = expectToCompleteWithinTime;

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