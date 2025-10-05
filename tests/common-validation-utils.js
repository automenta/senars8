/**
 * High-Performance Validation System
 * Consolidated validation utilities with optimized caching and batch operations
 */

import {expect} from 'vitest';

// High-performance cache with size limits and LRU eviction
class OptimizedCache {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = [];
    }

    get(key) {
        if (this.cache.has(key)) {
            // Update access order for LRU
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return undefined;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        } else if (this.cache.size >= this.maxSize) {
            // Evict least recently used
            const lruKey = this.accessOrder.shift();
            if (lruKey) this.cache.delete(lruKey);
        }

        this.cache.set(key, value);
        this.accessOrder.push(key);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    get size() { return this.cache.size; }
    get hitRate() { return this.hits / (this.hits + this.misses) || 0; }
}

// Global performance cache instance
const globalCache = new OptimizedCache();

// Optimized validation engine with batch processing
const ValidationEngine = {
    cache: globalCache,
    rules: new Map(),
    metrics: {validations: 0, cacheHits: 0, batches: 0},

    register: (name, rule) => ValidationEngine.rules.set(name, rule),

    // Batch validation for improved performance
    validateBatch: (targets, ruleName, context = 'validation') => {
        ValidationEngine.metrics.batches++;
        const results = [];
        const uncachedTargets = [];

        // Check cache for all targets first
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const cacheKey = `${ruleName}:${JSON.stringify(target)}`;

            if (ValidationEngine.cache.has(cacheKey)) {
                ValidationEngine.metrics.cacheHits++;
                results[i] = ValidationEngine.cache.get(cacheKey);
            } else {
                uncachedTargets.push({target, index: i, cacheKey});
            }
        }

        // Process only uncached targets
        if (uncachedTargets.length > 0) {
            const rule = ValidationEngine.rules.get(ruleName);
            if (!rule) throw new Error(`Unknown validation rule: ${ruleName}`);

            for (const {target, index, cacheKey} of uncachedTargets) {
                ValidationEngine.metrics.validations++;
                const result = rule(target, `${context}[${index}]`);
                ValidationEngine.cache.set(cacheKey, result);
                results[index] = result;
            }
        }

        return results;
    },

    // Single validation with caching
    validate: (target, ruleName, context = 'validation') => {
        const cacheKey = `${ruleName}:${JSON.stringify(target)}`;
        ValidationEngine.metrics.validations++;

        if (ValidationEngine.cache.has(cacheKey)) {
            ValidationEngine.metrics.cacheHits++;
            return ValidationEngine.cache.get(cacheKey);
        }

        const rule = ValidationEngine.rules.get(ruleName);
        if (!rule) throw new Error(`Unknown validation rule: ${ruleName}`);

        const result = rule(target, context);
        ValidationEngine.cache.set(cacheKey, result);
        return result;
    },

    reset: () => {
        ValidationEngine.cache.clear();
        ValidationEngine.metrics = {validations: 0, cacheHits: 0, batches: 0};
    },

    getStats: () => ({
        ...ValidationEngine.metrics,
        hitRate: ValidationEngine.metrics.validations > 0 ?
            ValidationEngine.metrics.cacheHits / ValidationEngine.metrics.validations : 0,
        cacheSize: ValidationEngine.cache.size
    })
};

// Optimized validation rules with batch processing
ValidationEngine.register('object', (obj, context) => {
    if (!obj) throw new Error(`${context} is null or undefined`);
    return obj;
});

ValidationEngine.register('objectSpec', (obj, context, spec) => {
    if (!obj) throw new Error(`${context} is null or undefined`);

    // Batch property validations for performance
    const validations = [];

    // Required properties - batch check
    spec.required?.forEach(prop =>
        validations.push(() => expect(obj).toHaveProperty(prop, `${context} missing required property: ${prop}`)));

    // Property values - optimized batch processing
    spec.properties && Object.entries(spec.properties).forEach(([prop, expected]) => {
        validations.push(() => {
            if (expected === null) {
                expect(obj[prop]).toBeDefined(`${context}.${prop} should be defined`);
            } else if (typeof expected === 'function') {
                expected(obj[prop]);
            } else {
                expect(obj[prop]).toEqual(expected, `${context}.${prop} mismatch`);
            }
        });
    });

    // Property types - batch check
    spec.types && Object.entries(spec.types).forEach(([prop, expectedType]) => {
        obj[prop] !== undefined && validations.push(() =>
            expect(typeof obj[prop]).toBe(expectedType, `${context}.${prop} type mismatch`));
    });

    // Execute all validations
    validations.forEach(validate => validate());

    return obj;
});

ValidationEngine.register('collection', (objects, context, spec) => {
    expect(objects).toBeDefined(`${context} should be defined`);
    expect(Array.isArray(objects)).toBe(true, `${context} should be an array`);

    // Use batch validation for collections
    return ValidationEngine.validateBatch(objects, 'objectSpec', `${context}[i]`, spec);
});

ValidationEngine.register('timed', async (fn, context, maxTimeMs, expectedResult) => {
    const startTime = performance.now();
    const result = await (typeof fn === 'function' ? fn() : fn);
    const executionTime = performance.now() - startTime;

    expect(executionTime).toBeLessThanOrEqual(maxTimeMs, `${context} exceeded ${maxTimeMs}ms: ${executionTime}ms`);
    expectedResult !== undefined && expect(result).toEqual(expectedResult, `${context} result mismatch`);

    return {result, executionTime};
});

// Unified validation API with performance optimizations
export const validate = (target, rule, context = 'validation', ...args) =>
    ValidationEngine.validate(target, rule, context, ...args);

// Optimized batch validation functions
export const validateBatch = (targets, rule, context = 'validation', ...args) =>
    ValidationEngine.validateBatch(targets, rule, context, ...args);

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

    validations.forEach(validate => validate());
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

    validations.forEach(validate => validate());
};

export const expectArrayLength = (arr, expectedLength) =>
    expect(arr).toHaveLength(expectedLength);

export const expectArrayContains = (arr, expectedItems) => {
    // Batch containment checks for better performance
    const validations = expectedItems.map(item => () => expect(arr).toContainEqual(item));
    validations.forEach(validate => validate());
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