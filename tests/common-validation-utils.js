/**
 * Core Validation System
 * Streamlined validation utilities for test assertions
 */

import {expect} from 'vitest';

// Core validation functions
export const validateObject = (obj, requirements, context = 'object') => {
    if (!obj) throw new Error(`${context} is null or undefined`);

    for (const [key, expectedValue] of Object.entries(requirements)) {
        typeof expectedValue === 'object' && expectedValue !== null && !Array.isArray(expectedValue)
            ? validateObject(obj[key], expectedValue, `${context}.${key}`)
            : (expect(obj[key]).toBeDefined(`${context} should have property ${key}`),
               expectedValue !== null && typeof expectedValue !== 'undefined' &&
               expect(obj[key]).toEqual(expectedValue, `${context}.${key} should equal expected value`));
    }
};

/**
 * Validates object properties with flexible comparison
 * @param {any} obj - Object to validate
 * @param {object} validators - Object with validation functions
 * @param {string} context - Context for error reporting
 */
export const validateObjectWithValidators = (obj, validators, context = 'object') => {
    if (!obj) throw new Error(`${context} is null or undefined`);

    for (const [key, validator] of Object.entries(validators)) {
        typeof validator === 'function'
            ? validator(obj[key], `${context}.${key}`)
            : validator?.hasOwnProperty('validator')
                ? validator.validator(obj[key], `${context}.${key}`, validator.options)
                : expect(obj[key]).toEqual(validator, `${context}.${key} validation failed`);
    }
};

/**
 * Generic assertion for object properties with common patterns
 * @param {any} obj - Object to validate
 * @param {object} specs - Specification object with property expectations
 * @param {string} context - Context for error reporting
 */
export const assertObjectSpec = (obj, specs, context = 'object') => {
    if (!obj) throw new Error(`${context} is null or undefined`);

    // Check required properties exist
    specs.required?.forEach(prop =>
        expect(obj).toHaveProperty(prop, `${context} should have required property: ${prop}`));

    // Check property values match expected values
    specs.properties && Object.entries(specs.properties).forEach(([prop, expected]) => {
        expected === null
            ? expect(obj[prop]).toBeDefined(`${context}.${prop} should be defined`)
            : typeof expected === 'function'
                ? expected(obj[prop])
                : expect(obj[prop]).toEqual(expected, `${context}.${prop} should match expected value`);
    });

    // Check property types
    specs.types && Object.entries(specs.types).forEach(([prop, expectedType]) => {
        const actualType = typeof obj[prop];
        expect(actualType).toBe(expectedType, `${context}.${prop} should be of type ${expectedType}, got ${actualType}`);
    });
};

/**
 * Validates a collection of objects against a specification
 * @param {Array} objects - Array of objects to validate
 * @param {object} spec - Specification to validate against
 * @param {string} context - Context for error reporting
 */
export const validateObjectCollection = (objects, spec, context = 'collection') => {
    expect(objects).toBeDefined(`${context} should be defined`);
    expect(Array.isArray(objects)).toBe(true, `${context} should be an array`);

    objects.forEach((obj, i) => assertObjectSpec(obj, spec, `${context}[${i}]`));
};

/**
 * Validates that a function returns expected result within timing constraints
 * @param {Function} fn - Function to validate
 * @param {any} expectedResult - Expected result
 * @param {number} maxTimeMs - Maximum allowed execution time
 * @param {string} context - Context for error reporting
 */
export const validateTimedFunction = (fn, expectedResult, maxTimeMs, context = 'function') => {
    const startTime = Date.now();
    const result = fn();
    const executionTime = Date.now() - startTime;

    expect(executionTime).toBeLessThanOrEqual(maxTimeMs, `${context} should execute within ${maxTimeMs}ms, took ${executionTime}ms`);
    expect(result).toEqual(expectedResult, `${context} should return expected result`);

    return {result, executionTime};
};

/**
 * Validates that an async function returns expected result within timing constraints
 * @param {Function} asyncFn - Async function to validate
 * @param {any} expectedResult - Expected result
 * @param {number} maxTimeMs - Maximum allowed execution time
 * @param {string} context - Context for error reporting
 */
export const validateTimedAsyncFunction = async (asyncFn, expectedResult, maxTimeMs, context = 'async function') => {
    const startTime = Date.now();
    const result = await asyncFn();
    const executionTime = Date.now() - startTime;

    expect(executionTime).toBeLessThanOrEqual(maxTimeMs, `${context} should execute within ${maxTimeMs}ms, took ${executionTime}ms`);
    expect(result).toEqual(expectedResult, `${context} should return expected result`);

    return {result, executionTime};
};

/**
 * Creates a validator function with predefined options
 * @param {object} options - Validation options
 * @returns {Function} Validation function
 */
export const createValidator = (options = {}) => (value, propertyContext = 'value') => {
    options.notNull && value === null && (() => { throw new Error(`${propertyContext} should not be null`); })();
    options.defined && typeof value === 'undefined' && (() => { throw new Error(`${propertyContext} should be defined`); })();
    options.type && typeof value !== options.type && (() => { throw new Error(`${propertyContext} should be of type ${options.type}, got ${typeof value}`); })();
    options.min !== undefined && value < options.min && (() => { throw new Error(`${propertyContext} should be >= ${options.min}, got ${value}`); })();
    options.max !== undefined && value > options.max && (() => { throw new Error(`${propertyContext} should be <= ${options.max}, got ${value}`); })();
    options.inArray && Array.isArray(options.inArray) && !options.inArray.includes(value) && (() => { throw new Error(`${propertyContext} should be one of [${options.inArray.join(', ')}], got ${value}`); })();
};

// Common validators that can be reused
export const commonValidators = {
    truthValue: (freq, conf) => (value, context = 'truthValue') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value.frequency).toBeCloseTo(freq, 3, `${context}.frequency should be close to ${freq}`);
        expect(value.confidence).toBeCloseTo(conf, 3, `${context}.confidence should be close to ${conf}`);
    },
    termKey: (expectedKey) => (value, context = 'termKey') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value).toBe(expectedKey, `${context} should equal ${expectedKey}`);
    },
    punctuation: (expectedPunct) => (value, context = 'punctuation') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value).toBe(expectedPunct, `${context} should equal ${expectedPunct}`);
    },
    priority: (expectedPriority) => (value, context = 'priority') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value).toBe(expectedPriority, `${context} should equal ${expectedPriority}`);
    }
};

// ============================================================================
// ASSERTION HELPERS - Consolidated from assertion-helpers.js
// ============================================================================

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
    expectedTruth && expectTruthValue(task.state.truthValue, expectedTruth.frequency, expectedTruth.confidence);
};

/**
 * Enhanced task assertion using common validators
 * @param {Object} task - The task to validate
 * @param {Object} validationSpec - Specification with expected values
 */
export const assertTaskWithSpec = (task, validationSpec) => {
    const {termKey, punctuation, truth} = validationSpec;

    termKey !== undefined && commonValidators.termKey(termKey)(task.termKey, 'task.termKey');
    punctuation !== undefined && commonValidators.punctuation(punctuation)(task.punctuation, 'task.punctuation');
    truth?.frequency !== undefined && truth?.confidence !== undefined &&
        commonValidators.truthValue(truth.frequency, truth.confidence)(task.state.truthValue, 'task.state.truthValue');
};

/**
 * Generic error assertion that handles both sync and async functions
 * @param {Function|Promise} fnOrPromise - Function to execute or Promise to await
 * @param {string|RegExp|Function} expectedError - Expected error message, pattern, or constructor
 * @param {string} context - Context for the assertion (for better error messages)
 */
export const expectToThrowError = async (fnOrPromise, expectedError, context = '') => {
    try {
        const result = fnOrPromise && typeof fnOrPromise.then === 'function' ? await fnOrPromise : fnOrPromise();
        throw new Error(`Expected function/promise to throw/reject but it resolved instead. Context: ${context}`);
    } catch (error) {
        typeof expectedError === 'string'
            ? expect(error.message).toContain(expectedError)
            : expectedError instanceof RegExp
                ? expect(error.message).toMatch(expectedError)
                : typeof expectedError === 'function'
                    ? expect(error).toBeInstanceOf(expectedError)
                    : expect(error.message).toContain(String(expectedError));
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
    requiredKeys.forEach(key => expect(obj).toHaveProperty(key));

    // Check properties match expected values
    Object.keys(properties).forEach(key => expect(obj[key]).toEqual(properties[key]));

    // Check types if specified
    Object.keys(types).forEach(key =>
        obj[key] !== undefined && expect(typeof obj[key]).toBe(types[key]));

    // Check optional keys are present if specified
    optionalKeys.forEach(key =>
        options.checkOptional !== false && expect(obj).toHaveProperty(key));
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
        const result = fn();
        if (result && typeof result.then === 'function') {
            const asyncResult = await result;
            expect(Date.now() - startTime).toBeLessThanOrEqual(maxTimeMs);
            return asyncResult;
        }
        expect(Date.now() - startTime).toBeLessThanOrEqual(maxTimeMs);
        return result;
    } catch (error) {
        expect(Date.now() - startTime).toBeLessThanOrEqual(maxTimeMs);
        throw error;
    }
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
 * Creates a comprehensive validation helper for task objects
 * @param {Object} task - Task object to validate
 * @param {Object} validationRules - Object with validation rules
 */
export const validateTask = (task, validationRules) => {
    validationRules.hasOwnProperty('termKey') && expect(task.termKey).toBe(validationRules.termKey);
    validationRules.hasOwnProperty('punctuation') && expect(task.punctuation).toBe(validationRules.punctuation);
    validationRules.truth && expectTruthValue(task.state.truthValue, validationRules.truth.frequency, validationRules.truth.confidence);
    validationRules.priority !== undefined && expect(task.state.priority).toBe(validationRules.priority);
    validationRules.hasOwnProperty('type') && expect(task.type).toBe(validationRules.type);
};