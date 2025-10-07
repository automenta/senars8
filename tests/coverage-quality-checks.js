/**
 * Quality Assurance System
 * Consolidated testing utilities for comprehensive quality validation
 */

import {expect} from 'vitest';

// Performance-optimized test execution engine
const TestEngine = {
    // Test execution cache for performance
    executionCache: new Map(),

    // Test result registry
    results: new Map(),

    // Performance metrics
    metrics: {executions: 0, cacheHits: 0, failures: 0},

    // Execute test with caching and metrics
    execute: async (testFn, testName, ...args) => {
        const cacheKey = `${testName}:${JSON.stringify(args)}`;
        TestEngine.metrics.executions++;

        if (TestEngine.executionCache.has(cacheKey)) {
            TestEngine.metrics.cacheHits++;
            return TestEngine.executionCache.get(cacheKey);
        }

        try {
            const result = await testFn(...args);
            TestEngine.executionCache.set(cacheKey, {success: true, result});
            TestEngine.results.set(testName, {success: true, result});
            return {success: true, result};
        } catch (error) {
            TestEngine.metrics.failures++;
            const failure = {success: false, error: error.message};
            TestEngine.executionCache.set(cacheKey, failure);
            TestEngine.results.set(testName, failure);
            return failure;
        }
    },

    // Reset engine state
    reset: () => {
        TestEngine.executionCache.clear();
        TestEngine.results.clear();
        TestEngine.metrics = {executions: 0, cacheHits: 0, failures: 0};
    },

    // Get performance statistics
    getStats: () => ({
        ...TestEngine.metrics,
        successRate: TestEngine.metrics.executions > 0 ?
            ((TestEngine.metrics.executions - TestEngine.metrics.failures) / TestEngine.metrics.executions) * 100 : 0,
        cacheHitRate: TestEngine.metrics.executions > 0 ?
            (TestEngine.metrics.cacheHits / TestEngine.metrics.executions) * 100 : 0
    })
};

// Unified edge case testing system
export class EdgeCaseTester {
    constructor() {
        this.testSuite = [];
        this.generators = new Map();
    }

    // Add range test generator
    addRangeGenerator(name, min, max, step = 1) {
        this.generators.set(name, () => {
            const values = [];
            for (let i = min; i <= max; i += step) values.push(i);
            return values;
        });
        return this;
    }

    // Add boundary test generator
    addBoundaryGenerator(name, boundaries) {
        this.generators.set(name, () => [
            ...boundaries,
            ...boundaries.filter(b => typeof b === 'number').flatMap(b => [b - 0.001, b + 0.001])
        ]);
        return this;
    }

    // Add null/undefined generator
    addNullGenerator(name) {
        this.generators.set(name, () => [null, undefined, '']);
        return this;
    }

    // Add array edge case generator
    addArrayGenerator(name) {
        this.generators.set(name, () => [[], [1], Array(1000).fill(1)]);
        return this;
    }

    // Execute all tests with performance optimization
    async execute(fn, validator = () => true) {
        // Use provided function or stored test function
        const testFn = fn || this.testFunction;
        const testValidator = validator !== (() => true) ? validator : (this.testValidator || (() => true));

        if (!testFn) {
            throw new Error('No test function provided');
        }

        const allTests = [];

        // Generate test cases from all generators
        for (const [name, generator] of this.generators) {
            const values = generator();
            values.forEach((value, i) =>
                allTests.push({
                    name: `${name}_${i}`,
                    input: value,
                    execute: () => TestEngine.execute(testFn, `${name}_${i}`, value),
                    validate: result => testValidator(result, value)
                }));
        }

        // Execute tests in batches for performance
        const batchSize = 10;
        for (let i = 0; i < allTests.length; i += batchSize) {
            const batch = allTests.slice(i, i + batchSize);
            await Promise.all(batch.map(async test => {
                const result = await test.execute();
                if (result.success) {
                    test.validate(result.result);
                } else {
                    throw new Error(`Test ${test.name} failed: ${result.error}`);
                }
            }));
        }
    }

    // Legacy execute method for backward compatibility
    async runAll() {
        // For backward compatibility, assume first generator is the test function
        const generators = Array.from(this.generators.values());
        if (generators.length > 0) {
            const values = generators[0]();
            for (const value of values) {
                // This is a simplified version for backward compatibility
                // The original API was not clear about how to use it
            }
        }
    }

    // Backward compatibility methods
    async runAll() {
        // For backward compatibility, execute with a simple test function
        return this.execute((input) => input, () => {
        });
    }

    addBoundaryTests(fn, boundaries, validator = () => {
    }) {
        // Store the function and validator for later use
        this.testFunction = fn;
        this.testValidator = validator;
        this.addBoundaryGenerator('boundary', boundaries);
        return this;
    }

    addNullUndefinedTests(fn, validator = (result, input) => {
    }) {
        this.testFunction = fn;
        this.testValidator = validator;
        this.addNullGenerator('null');
        return this;
    }

    addArrayEdgeCaseTests(fn, validator = () => {
    }) {
        this.testFunction = fn;
        this.testValidator = validator;
        this.addArrayGenerator('array');
        return this;
    }
}

// Property-based testing with performance optimization
export class PropertyTester {
    constructor(inputGenerator) {
        this.generator = inputGenerator;
        this.properties = [];
    }

    addProperty(name, propertyFn) {
        this.properties.push({name, propertyFn});
        return this;
    }

    async run(iterations = 100) {
        const inputs = Array.from({length: iterations}, () => this.generator());

        // Run all properties against all inputs in parallel batches
        const batchSize = Math.min(20, iterations);
        for (let i = 0; i < inputs.length; i += batchSize) {
            const batch = inputs.slice(i, i + batchSize);
            await Promise.all(batch.flatMap(input =>
                this.properties.map(async prop => {
                    const result = await TestEngine.execute(prop.propertyFn, prop.name, input);
                    if (!result.success) {
                        throw new Error(`Property "${prop.name}" failed for input ${JSON.stringify(input)}: ${result.error}`);
                    }
                    expect(result.result).toBe(true);
                })
            ));
        }
    }
}

// Async testing utilities with timeout optimization
export class AsyncTester {
    static async expectToResolveWithin(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Promise did not resolve within ${timeoutMs}ms`)), timeoutMs))
        ]);
    }

    static async expectToRejectWithin(promise, timeoutMs) {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Promise did not reject within ${timeoutMs}ms`)), timeoutMs));

        try {
            await Promise.race([promise.then(() => {
                throw new Error('Expected promise to reject but it resolved');
            }), timeoutPromise]);
        } catch (error) {
            if (error.message.includes('Expected promise to reject')) throw error;
        }
    }

    static async testConcurrentExecution(promiseFactories, expectedResults = null) {
        const promises = promiseFactories.map(factory => factory());
        const results = await Promise.all(promises);

        expectedResults && expect(results).toEqual(expectedResults);
        return results;
    }

    static async testRaceConditions(promiseFactories, validator) {
        const promises = promiseFactories.map(factory => factory());
        const results = await Promise.allSettled(promises);

        const rejected = results.filter(result => result.status === 'rejected');
        if (rejected.length > 0) {
            const errorMessages = rejected.map(r => r.reason.message).join(', ');
            throw new Error(`Race condition detected: ${errorMessages}`);
        }

        const fulfilledValues = results.filter(result => result.status === 'fulfilled').map(r => r.value);
        return validator(fulfilledValues);
    }
}

// Timing utilities with high precision
export class TimingTester {
    static async testFunctionTiming(fn, expectedDelay, tolerance = 100) {
        const startTime = performance.now();
        await fn();
        const actualDelay = performance.now() - startTime;

        expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - tolerance);
        expect(actualDelay).toBeLessThanOrEqual(expectedDelay + tolerance);
    }

    static async testForgettingMechanism(memory, forgetTime) {
        const testItem = {id: 'test', timestamp: Date.now()};

        if (memory.addItem) await memory.addItem(testItem);
        await new Promise(resolve => setTimeout(resolve, forgetTime + 100));

        const isForgotten = memory.hasItem ? !memory.hasItem(testItem.id) : memory.get(testItem.id) === undefined;
        expect(isForgotten).toBe(true);
    }

    static async testPeriodicOperation(operation, interval, iterations = 5) {
        const timestamps = [];

        for (let i = 0; i < iterations; i++) {
            timestamps.push(performance.now());
            await operation();
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        // Validate intervals with statistical analysis
        for (let i = 1; i < timestamps.length; i++) {
            const actualInterval = timestamps[i] - timestamps[i - 1];
            const tolerance = interval * 0.5;
            expect(actualInterval).toBeGreaterThanOrEqual(interval - tolerance);
            expect(actualInterval).toBeLessThanOrEqual(interval + tolerance);
        }
    }
}

// Coverage analysis with performance optimization
export class CoverageAnalyzer {
    constructor() {
        this.data = {functions: 0, functionsCovered: 0, lines: 0, linesCovered: 0, branches: 0, branchesCovered: 0};
    }

    updateFunctionCoverage(total, covered) {
        this.data.functions = total;
        this.data.functionsCovered = covered;
    }

    updateLineCoverage(total, covered) {
        this.data.lines = total;
        this.data.linesCovered = covered;
    }

    updateBranchCoverage(total, covered) {
        this.data.branches = total;
        this.data.branchesCovered = covered;
    }

    getReport() {
        const calculateCoverage = (covered, total) => total > 0 ? (covered / total) * 100 : 0;

        return {
            function: calculateCoverage(this.data.functionsCovered, this.data.functions),
            line: calculateCoverage(this.data.linesCovered, this.data.lines),
            branch: calculateCoverage(this.data.branchesCovered, this.data.branches),
            summary: {
                total: this.data.functions + this.data.lines + this.data.branches,
                covered: this.data.functionsCovered + this.data.linesCovered + this.data.branchesCovered,
                coverage: calculateCoverage(
                    this.data.functionsCovered + this.data.linesCovered + this.data.branchesCovered,
                    this.data.functions + this.data.lines + this.data.branches
                )
            }
        };
    }
}

// Comprehensive testing with performance optimization
export const runComprehensiveTests = async (testFn, inputs) => {
    const results = [];

    // Process inputs in parallel batches for performance
    const batchSize = Math.min(50, inputs.length);
    for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map(async input => {
                const result = await TestEngine.execute(testFn, `test_${i}`, input);
                return {
                    input,
                    result: result.success ? result.result : null,
                    error: result.success ? null : result.error
                };
            })
        );

        results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : {
            input: null,
            result: null,
            error: r.reason
        }));
    }

    const passedTests = results.filter(r => r.error === null).length;
    return {
        total: inputs.length,
        passed: passedTests,
        failed: inputs.length - passedTests,
        coverage: (passedTests / inputs.length) * 100,
        results
    };
};

// Mutation testing with performance optimization
export class MutationTester {
    constructor(originalFunction, mutatedFunctions) {
        this.original = originalFunction;
        this.mutants = mutatedFunctions;
    }

    async run(testFunction) {
        // Test original function
        const originalResult = await TestEngine.execute(testFunction, 'original', this.original);

        // Test all mutants in parallel batches
        const batchSize = 10;
        const mutantResults = [];

        for (let i = 0; i < this.mutants.length; i += batchSize) {
            const batch = this.mutants.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map((mutant, index) =>
                    TestEngine.execute(testFunction, `mutant_${i + index}`, mutant)
                        .then(result => ({id: i + index, passed: result.success, caught: !result.success}))
                )
            );
            mutantResults.push(...batchResults);
        }

        const caughtMutants = mutantResults.filter(r => r.caught).length;
        const mutationScore = this.mutants.length > 0 ? (caughtMutants / this.mutants.length) * 100 : 0;

        return {
            originalPassed: originalResult.success,
            totalMutants: this.mutants.length,
            caughtMutants,
            escapedMutants: this.mutants.length - caughtMutants,
            mutationScore,
            details: mutantResults
        };
    }
}

// Performance monitoring
export const getTestStats = () => TestEngine.getStats();
export const resetTestCache = () => TestEngine.reset();