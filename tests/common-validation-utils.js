/**
 * Common Validation Utilities
 * Consolidated validation utilities to reduce duplication across test files
 */

import {expect} from 'vitest';

/**
 * Validates that an object has required properties with expected values
 * @param {any} obj - Object to validate
 * @param {object} requirements - Object with property requirements
 * @param {string} context - Context for error reporting
 */
export const validateObject = (obj, requirements, context = 'object') => {
    if (!obj) {
        throw new Error(`${context} is null or undefined`);
    }

    for (const [key, expectedValue] of Object.entries(requirements)) {
        if (typeof expectedValue === 'object' && expectedValue !== null && !Array.isArray(expectedValue)) {
            // If the expected value is an object, validate its properties too
            validateObject(obj[key], expectedValue, `${context}.${key}`);
        } else {
            expect(obj[key]).toBeDefined(`${context} should have property ${key}`);
            if (expectedValue !== null && typeof expectedValue !== 'undefined') {
                expect(obj[key]).toEqual(expectedValue, `${context}.${key} should equal expected value`);
            }
        }
    }
};

/**
 * Validates object properties with flexible comparison
 * @param {any} obj - Object to validate
 * @param {object} validators - Object with validation functions
 * @param {string} context - Context for error reporting
 */
export const validateObjectWithValidators = (obj, validators, context = 'object') => {
    if (!obj) {
        throw new Error(`${context} is null or undefined`);
    }

    for (const [key, validator] of Object.entries(validators)) {
        if (typeof validator === 'function') {
            // Custom validation function
            validator(obj[key], `${context}.${key}`);
        } else if (typeof validator === 'object' && validator.hasOwnProperty('validator')) {
            // Validator object with specific options
            validator.validator(obj[key], `${context}.${key}`, validator.options);
        } else {
            // Direct value comparison
            expect(obj[key]).toEqual(validator, `${context}.${key} validation failed`);
        }
    }
};

/**
 * Generic assertion for object properties with common patterns
 * @param {any} obj - Object to validate
 * @param {object} specs - Specification object with property expectations
 * @param {string} context - Context for error reporting
 */
export const assertObjectSpec = (obj, specs, context = 'object') => {
    if (!obj) {
        throw new Error(`${context} is null or undefined`);
    }

    // Check required properties exist
    if (specs.required) {
        for (const prop of specs.required) {
            expect(obj).toHaveProperty(prop, `${context} should have required property: ${prop}`);
        }
    }

    // Check property values match expected values
    if (specs.properties) {
        for (const [prop, expected] of Object.entries(specs.properties)) {
            if (expected === null) {
                expect(obj[prop]).toBeDefined(`${context}.${prop} should be defined`);
            } else if (typeof expected === 'function') {
                // Custom validation function
                expected(obj[prop]);
            } else {
                expect(obj[prop]).toEqual(expected, `${context}.${prop} should match expected value`);
            }
        }
    }

    // Check property types
    if (specs.types) {
        for (const [prop, expectedType] of Object.entries(specs.types)) {
            const actualType = typeof obj[prop];
            expect(actualType).toBe(expectedType, `${context}.${prop} should be of type ${expectedType}, got ${actualType}`);
        }
    }
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

    for (let i = 0; i < objects.length; i++) {
        assertObjectSpec(objects[i], spec, `${context}[${i}]`);
    }
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
export const createValidator = (options = {}) => {
    return (value, propertyContext = 'value') => {
        if (options.notNull && value === null) {
            throw new Error(`${propertyContext} should not be null`);
        }
        if (options.defined && typeof value === 'undefined') {
            throw new Error(`${propertyContext} should be defined`);
        }
        if (options.type && typeof value !== options.type) {
            throw new Error(`${propertyContext} should be of type ${options.type}, got ${typeof value}`);
        }
        if (options.min !== undefined && value < options.min) {
            throw new Error(`${propertyContext} should be >= ${options.min}, got ${value}`);
        }
        if (options.max !== undefined && value > options.max) {
            throw new Error(`${propertyContext} should be <= ${options.max}, got ${value}`);
        }
        if (options.inArray && Array.isArray(options.inArray) && !options.inArray.includes(value)) {
            throw new Error(`${propertyContext} should be one of [${options.inArray.join(', ')}], got ${value}`);
        }
    };
};

// Common validators that can be reused
export const commonValidators = {
    // Truth value validator
    truthValue: (freq, conf) => (value, context = 'truthValue') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value.frequency).toBeCloseTo(freq, 3, `${context}.frequency should be close to ${freq}`);
        expect(value.confidence).toBeCloseTo(conf, 3, `${context}.confidence should be close to ${conf}`);
    },

    // Term key validator
    termKey: (expectedKey) => (value, context = 'termKey') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value).toBe(expectedKey, `${context} should equal ${expectedKey}`);
    },

    // Punctuation validator
    punctuation: (expectedPunct) => (value, context = 'punctuation') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value).toBe(expectedPunct, `${context} should equal ${expectedPunct}`);
    },

    // Priority validator
    priority: (expectedPriority) => (value, context = 'priority') => {
        expect(value).toBeDefined(`${context} should be defined`);
        expect(value).toBe(expectedPriority, `${context} should equal ${expectedPriority}`);
    }
};