/**
 * High-Performance Validation System
 * Consolidated validation utilities with optimized caching and batch operations
 */

import {expect} from 'vitest';
import {validate, ValidationEngine} from './shared/test-utils.js';

// High-performance validators using batch processing where possible
export const validateObject = (obj, requirements, context = 'object') => {
    validate(obj, 'object', context);

    // Batch all validations for better performance
    const validations = Object.entries(requirements).flatMap(([key, expected]) => {
        if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
            return [
                () => validate(obj[key], 'object', `${context}.${key}`),
                ...Object.entries(expected).map(([subKey, subExpected]) =>
                    () => expect(obj[key][subKey]).toEqual(subExpected, `${context}.${key}.${subKey} mismatch`))
            ];
        }
        return () => expect(obj[key]).toEqual(expected, `${context}.${key} mismatch`);
    });

    validations.forEach(v => v());
    return true;
};

export const validateObjectSpec = (obj, spec, context = 'object') =>
    validate(obj, 'objectSpec', context, spec);

export const validateCollection = (objects, spec, context = 'collection') =>
    validate(objects, 'collection', context, spec);

export const validateTimed = (fn, maxTimeMs, context = 'function', expectedResult) =>
    ValidationEngine.validate(fn, 'timed', context, maxTimeMs, expectedResult);

// Optimized assertion helpers with batch processing
export const expectObject = (obj, options = {}, context = 'object') => {
    const {properties = {}, requiredKeys = [], optionalKeys = [], types = {}} = options;

    expect(obj).toBeDefined(`${context} is required`);

    // Batch all property checks for performance
    const allKeys = [...new Set([...requiredKeys, ...Object.keys(properties), ...Object.keys(types), ...optionalKeys])];
    const validations = allKeys.map(key => () => {
        expect(obj).toHaveProperty(key, `${context} missing property: ${key}`);
        if (properties[key] !== undefined) expect(obj[key]).toEqual(properties[key], `${context}.${key} value mismatch`);
        if (types[key]) expect(typeof obj[key]).toBe(types[key], `${context}.${key} type mismatch`);
    });

    validations.forEach(v => v());
};

export const expectArrayLength = (arr, expectedLength) =>
    expect(arr).toHaveLength(expectedLength);

export const expectArrayContains = (arr, expectedItems) => {
    // Batch containment checks for better performance
    const validations = expectedItems.map(item => () => expect(arr).toContainEqual(item));
    validations.forEach(v => v());
};

export const expectCloseTo = (actual, expected, tolerance = 0.001) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

export const expectToCompleteWithinTime = async (fn, maxTimeMs, description = 'function execution') => {
    const startTime = performance.now();
    try {
        const result = fn();
        const executionTime = performance.now() - startTime;

        if (result?.then) {
            const asyncResult = await result;
            expect(executionTime).toBeLessThanOrEqual(maxTimeMs, `${description} exceeded ${maxTimeMs}ms`);
            return asyncResult;
        }

        expect(executionTime).toBeLessThanOrEqual(maxTimeMs, `${description} exceeded ${maxTimeMs}ms`);
        return result;
    } catch (error) {
        expect(performance.now() - startTime).toBeLessThanOrEqual(maxTimeMs, `${description} threw before timeout`);
        throw error;
    }
};

// Specialized validators for common patterns - consolidated and optimized
export const expectTask = (task, expectedTermKey, expectedPunctuation, expectedTruth = null) => {
    expect(task).toBeDefined('Task is required');
    expect(task.termKey).toBe(expectedTermKey, 'Task termKey mismatch');
    expect(task.punctuation).toBe(expectedPunctuation, 'Task punctuation mismatch');
    expectedTruth && expect(task.state.truthValue).toEqual(expectedTruth, 'Task truth value mismatch');
};

export const expectTerm = (term, expectedKey, expectedComplexity = null) => {
    expect(term).toBeDefined('Term is required');
    expect(term.key).toBe(expectedKey, 'Term key mismatch');
    expectedComplexity !== null && expect(term.complexity).toBe(expectedComplexity, 'Term complexity mismatch');
};

// Optimized error validation
export const expectToThrowError = async (fnOrPromise, expectedError, context = '') => {
    try {
        const result = fnOrPromise?.then ? await fnOrPromise : fnOrPromise();
        throw new Error(`Expected function/promise to throw/reject but resolved. Context: ${context}`);
    } catch (error) {
        const message = error.message;
        if (typeof expectedError === 'string') {
            expect(message).toContain(expectedError);
        } else if (expectedError instanceof RegExp) {
            expect(message).toMatch(expectedError);
        } else if (typeof expectedError === 'function') {
            expect(error).toBeInstanceOf(expectedError);
        } else {
            expect(message).toContain(String(expectedError));
        }
    }
};

// Consolidated assertion helpers
export const expectTruthValue = (actual, expectedFreq, expectedConf, precision = 3) => {
    expect(actual.frequency).toBeCloseTo(expectedFreq, precision);
    expect(actual.confidence).toBeCloseTo(expectedConf, precision);
};

export const assertTask = (task, expectedTermKey, expectedPunctuation, expectedTruth = null) => {
    expect(task).toBeDefined();
    expect(task.termKey).toBe(expectedTermKey);
    expect(task.punctuation).toBe(expectedPunctuation);
    expectedTruth && expectTruthValue(task.state.truthValue, expectedTruth.frequency, expectedTruth.confidence);
};

export const assertTerm = (term, expectedKey, expectedComplexity = null) => {
    expect(term).toBeDefined();
    expect(term.key).toBe(expectedKey);
    expectedComplexity !== null && expect(term.complexity).toBe(expectedComplexity);
};

// Performance monitoring
export const getValidationStats = () => ValidationEngine.getStats();
export const resetValidationCache = () => ValidationEngine.reset();