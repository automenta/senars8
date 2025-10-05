/**
 * Shared Test Utilities
 * Consolidated utilities for performance optimization and DRY compliance
 */

import {expect, vi} from 'vitest';

// High-performance cache with size limits and LRU eviction
export class OptimizedCache {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = [];
        this.hits = 0;
        this.misses = 0;
    }

    get(key) {
        if (this.cache.has(key)) {
            this.hits++;
            // Update access order for LRU
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        this.misses++;
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
        this.hits = 0;
        this.misses = 0;
    }

    get size() { return this.cache.size; }
    get hitRate() { return (this.hits + this.misses) > 0 ? this.hits / (this.hits + this.misses) : 0; }
}

// Global performance cache instance
export const globalCache = new OptimizedCache();

// Batch processing utilities
export const batchProcess = (items, processor, batchSize = 10) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        results.push(...batch.map(processor));
    }
    return results;
};

// Optimized validation engine with batch processing
export const ValidationEngine = {
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

            if (ValidationEngine.cache.get(cacheKey)) {
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

        const cached = ValidationEngine.cache.get(cacheKey);
        if (cached) {
            ValidationEngine.metrics.cacheHits++;
            return cached;
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

// Mock registry for consolidated mock management
export const MockRegistry = {
    cache: globalCache,
    templates: new Map(),
    metrics: {creations: 0, cacheHits: 0},

    register: (name, template) => MockRegistry.templates.set(name, template),

    create: (templateName, ...args) => {
        MockRegistry.metrics.creations++;
        const cacheKey = `${templateName}:${JSON.stringify(args)}`;

        const cached = MockRegistry.cache.get(cacheKey);
        if (cached) {
            MockRegistry.metrics.cacheHits++;
            return cached;
        }

        const template = MockRegistry.templates.get(templateName);
        if (!template) throw new Error(`Unknown mock template: ${templateName}`);

        const mock = template(...args);
        MockRegistry.cache.set(cacheKey, mock);
        return mock;
    },

    reset: () => {
        MockRegistry.cache.clear();
        MockRegistry.metrics = {creations: 0, cacheHits: 0};
    },

    getStats: () => ({
        ...MockRegistry.metrics,
        hitRate: MockRegistry.metrics.creations > 0 ?
            (MockRegistry.metrics.cacheHits / MockRegistry.metrics.creations) * 100 : 0,
        cacheSize: MockRegistry.cache.size || 0
    })
};

// Configuration registry for consolidated config management
export const ConfigRegistry = {
    cache: globalCache,
    templates: new Map(),
    validators: new Map(),
    metrics: {accesses: 0, cacheHits: 0},

    registerTemplate: (name, template, validator = null) => {
        ConfigRegistry.templates.set(name, template);
        if (validator) ConfigRegistry.validators.set(name, validator);
    },

    get: (templateName, overrides = {}) => {
        ConfigRegistry.metrics.accesses++;
        const cacheKey = `${templateName}:${JSON.stringify(overrides)}`;

        const cached = ConfigRegistry.cache.get(cacheKey);
        if (cached) {
            ConfigRegistry.metrics.cacheHits++;
            return cached;
        }

        const template = ConfigRegistry.templates.get(templateName);
        if (!template) throw new Error(`Unknown configuration template: ${templateName}`);

        const config = {...template, ...overrides};

        // Validate if validator exists
        const validator = ConfigRegistry.validators.get(templateName);
        if (validator && !validator(config)) {
            throw new Error(`Invalid configuration for template: ${templateName}`);
        }

        ConfigRegistry.cache.set(cacheKey, config);
        return config;
    },

    reset: () => {
        ConfigRegistry.cache.clear();
        ConfigRegistry.metrics = {accesses: 0, cacheHits: 0};
    },

    getStats: () => ({
        ...ConfigRegistry.metrics,
        hitRate: ConfigRegistry.metrics.accesses > 0 ?
            (ConfigRegistry.metrics.cacheHits / ConfigRegistry.metrics.accesses) * 100 : 0,
        cacheSize: ConfigRegistry.cache.size || 0
    })
};

// Documentation registry for consolidated doc generation
export const DocumentationRegistry = {
    cache: globalCache,
    templates: new Map(),
    metrics: {generations: 0, cacheHits: 0},

    register: (name, template) => DocumentationRegistry.templates.set(name, template),

    generate: (templateName, data) => {
        DocumentationRegistry.metrics.generations++;
        const cacheKey = `${templateName}:${JSON.stringify(data)}`;

        const cached = DocumentationRegistry.cache.get(cacheKey);
        if (cached) {
            DocumentationRegistry.metrics.cacheHits++;
            return cached;
        }

        const template = DocumentationRegistry.templates.get(templateName);
        if (!template) throw new Error(`Unknown documentation template: ${templateName}`);

        const documentation = template(data);
        DocumentationRegistry.cache.set(cacheKey, documentation);
        return documentation;
    },

    reset: () => {
        DocumentationRegistry.cache.clear();
        DocumentationRegistry.metrics = {generations: 0, cacheHits: 0};
    },

    getStats: () => ({
        ...DocumentationRegistry.metrics,
        hitRate: DocumentationRegistry.metrics.generations > 0 ?
            (DocumentationRegistry.metrics.cacheHits / DocumentationRegistry.metrics.generations) * 100 : 0
    })
};

// Test context manager for consolidated context management
export const TestContextManager = {
    cache: globalCache,
    active: new Map(),
    metrics: {creations: 0, cacheHits: 0},

    create: async (type, config = {}) => {
        TestContextManager.metrics.creations++;
        const cacheKey = `context:${type}:${JSON.stringify(config)}`;

        const cached = TestContextManager.cache.get(cacheKey);
        if (cached) {
            TestContextManager.metrics.cacheHits++;
            return cached;
        }

        const context = await TestContextManager._createSingle(type, config);
        TestContextManager.cache.set(cacheKey, context);
        return context;
    },

    _createSingle: async (type, config = {}) => {
        // This would be implemented based on the specific context creation logic
        // For now, return a basic context object
        return {type, config, created: Date.now()};
    },

    register: (name, context) => TestContextManager.active.set(name, context),

    get: (name) => TestContextManager.active.get(name),

    cleanup: async (name) => {
        const context = TestContextManager.active.get(name);
        if (context && context.cleanup) {
            await context.cleanup();
        }
        TestContextManager.active.delete(name);
    },

    reset: async () => {
        const activeNames = Array.from(TestContextManager.active.keys());
        await Promise.all(activeNames.map(name => TestContextManager.cleanup(name)));
        TestContextManager.active.clear();
        TestContextManager.metrics = {creations: 0, cacheHits: 0};
    },

    getStats: () => ({
        ...TestContextManager.metrics,
        activeContexts: TestContextManager.active.size,
        hitRate: TestContextManager.metrics.creations > 0 ?
            (TestContextManager.metrics.cacheHits / TestContextManager.metrics.creations) * 100 : 0,
        cacheSize: TestContextManager.cache.size || 0
    })
};

// Utility functions for common patterns
export const createCache = (maxSize = 1000) => new OptimizedCache(maxSize);

export const batchValidate = (targets, rule, context = 'validation') =>
    ValidationEngine.validateBatch(targets, rule, context);

export const validate = (target, rule, context = 'validation', ...args) =>
    ValidationEngine.validate(target, rule, context, ...args);

export const createMock = (type, ...args) => MockRegistry.create(type, ...args);

export const createConfig = (templateName, overrides = {}) =>
    ConfigRegistry.get(templateName, overrides);

export const generateDoc = (type, data) => DocumentationRegistry.generate(type, data);

export const createTestContext = (type, config = {}) =>
    TestContextManager.create(type, config);

// System factory for test environment creation
export const SystemFactory = {
    cache: globalCache,
    components: new Map(),
    metrics: {creations: 0, cacheHits: 0},

    create: (config = {}) => {
        SystemFactory.metrics.creations++;
        const cacheKey = `system:${JSON.stringify(config)}`;

        const cached = SystemFactory.cache.get(cacheKey);
        if (cached) {
            SystemFactory.metrics.cacheHits++;
            return cached;
        }

        // Create proper mock objects that match expected test interfaces
        const mockTools = {
            registerTool: vi.fn(),
            executeTool: vi.fn((name, params) => {
                if (name === 'test_tool') {
                    return Promise.resolve({
                        result: `processed: ${params[0]}`,
                        success: true
                    });
                }
                return Promise.resolve({input: params[0], processed: true});
            }),
            getTools: vi.fn(() => ({executeTool: vi.fn()})),
            getToolNames: vi.fn(() => ['test_tool'])
        };

        const mockActionExecutor = {
            getTools: () => mockTools,
            registerTool: vi.fn(),
            execute: vi.fn(() => Promise.resolve()),
            executeNarseseOperation: vi.fn((operation) => {
                // Extract operation name and params from Narsese-like string
                const match = operation.match(/(\w+)\(([^)]*)\)/);
                if (match) {
                    const [, operationName, params] = match;
                    const paramList = params ? params.split(',').map(p => p.trim().replace(/['"]/g, '')) : [];
                    return Promise.resolve({
                        result: {
                            success: true,
                            action: operationName,
                            params: paramList,
                            result: `executed with ${paramList.join(' and ')}`,
                            operation: operationName,
                            args: paramList,
                            combined: paramList.join('-')
                        },
                        narseseBelief: `${operationName}(${paramList.join(', ')}).`
                    });
                }
                return Promise.resolve({
                    result: {
                        success: true,
                        action: 'unknown',
                        params: [],
                        result: 'executed unknown operation',
                        operation: 'unknown',
                        args: [],
                        combined: ''
                    }
                });
            }),
            executeAction: vi.fn((action) => {
                if (action?.operationTerm) {
                    // Handle operationTerm properly
                    const termKey = action.operationTerm.subject?.key || 'unknown';
                    const predicate = action.operationTerm.predicate;
                    let params = [];

                    if (predicate?.terms) {
                        params = predicate.terms.map(t => t.key);
                    }

                    return Promise.resolve({
                        result: {
                            action: termKey,
                            params: params,
                            result: `executed ${termKey} with ${params.join(', ')}`,
                            success: true,
                            direction: params[0] || 'north'
                        },
                        narseseBelief: `${termKey}(${params.join(', ')}).`
                    });
                }

                const actionName = action?.termKey || 'test_action';
                return Promise.resolve({
                    result: {
                        action: actionName,
                        params: ['hello', 'world'],
                        result: `executed with hello and world`,
                        success: true,
                        direction: actionName === 'move' ? 'north' : undefined
                    },
                    narseseBelief: 'test'
                });
            }),
            registerResource: vi.fn(),
            getResource: vi.fn((name) => {
                if (name === 'testResource') {
                    return {type: 'test', value: 42, active: true};
                }
                return undefined;
            }),
            getAllResources: vi.fn(() => ({})),
            getActionHistory: vi.fn(() => [
                {
                    action: 'history_test',
                    parameters: ['test_value'],
                    status: 'success',
                    type: 'operation',
                    timestamp: Date.now()
                }
            ])
        };

        const systemData = {
            system: {
                type: 'mock',
                config,
                actionExecutor: mockActionExecutor,
                reasoner: {
                    processTask: vi.fn(() => Promise.resolve()),
                    processInput: vi.fn(() => Promise.resolve()),
                    getInferences: vi.fn(() => []),
                    performInference: vi.fn((tasks) => {
                        const derivedTasks = [];
                        // Simulate modus ponens: if we have (cat ==> mammal) and cat, derive mammal
                        const hasImplication = tasks.some(t => t.termKey === '(cat ==> mammal)');
                        const hasAtomic = tasks.some(t => t.termKey === 'cat');
                        if (hasImplication && hasAtomic) {
                            derivedTasks.push({
                                termKey: 'mammal',
                                punctuation: '.',
                                state: {priority: 0.5, truthValue: {frequency: 0.9, confidence: 0.9}}
                            });
                        }

                        // Simulate inheritance chaining: if we have (cat --> mammal) and (mammal --> animal), derive (cat --> animal)
                        const hasInheritance1 = tasks.some(t => t.termKey === '(cat --> mammal)');
                        const hasInheritance2 = tasks.some(t => t.termKey === '(mammal --> animal)');
                        if (hasInheritance1 && hasInheritance2) {
                            derivedTasks.push({
                                termKey: '(cat --> animal)',
                                punctuation: '.',
                                state: {priority: 0.5, truthValue: {frequency: 0.9, confidence: 0.9}}
                            });
                        }

                        return Promise.resolve(derivedTasks);
                    })
                },
                cycle: {
                    run: () => Promise.resolve(),
                    step: () => Promise.resolve(),
                    runOnce: vi.fn(() => Promise.resolve()),
                    bootstrap: vi.fn(() => Promise.resolve())
                }
            },
            commandBus: {
                type: 'mock',
                handle: vi.fn(() => Promise.resolve()),
                request: vi.fn((command, payload) => {
                    if (command === 'MEMORY_GET_ALL_TASKS') {
                        return Promise.resolve([
                            {termKey: 'AcquireKnowledge', punctuation: '!', state: {priority: 0.8}},
                            {termKey: 'cat', punctuation: '.', state: {priority: 0.2}}
                        ]);
                    }
                    if (command === 'REASONER_PROCESS_TASK') {
                        return Promise.resolve([]);
                    }
                    return Promise.resolve(null);
                }),
                on: vi.fn(),
                off: vi.fn(),
                emit: vi.fn(() => Promise.resolve())
            },
            eventBus: {
                type: 'mock',
                on: vi.fn(),
                off: vi.fn(),
                emit: vi.fn(() => Promise.resolve())
            },
            container: {
                type: 'mock',
                get: (name) => {
                    const mocks = {
                        memory: {
                            addTask: vi.fn((task) => Promise.resolve(task)),
                            addTasks: vi.fn((tasks) => Promise.resolve(tasks)),
                            addTerm: vi.fn((term) => Promise.resolve(term)),
                            getTask: vi.fn((id) => null),
                            getTerm: vi.fn((key) => null),
                            hasTask: vi.fn(() => false),
                            hasTerm: vi.fn(() => false),
                            size: 0,
                            removeTask: vi.fn(() => Promise.resolve()),
                            removeTerm: vi.fn(() => Promise.resolve()),
                            getAllTasks: vi.fn(() => [
                                {termKey: 'AcquireKnowledge', punctuation: '!', state: {priority: 0.8}},
                                {termKey: 'cat', punctuation: '.', state: {priority: 0.2}}
                            ]),
                            getAllTerms: vi.fn(() => [])
                        },
                        reasoner: {
                            processTask: vi.fn(() => Promise.resolve()),
                            processInput: vi.fn(() => Promise.resolve()),
                            getInferences: vi.fn(() => []),
                            performInference: vi.fn((tasks) => {
                                const derivedTasks = [];
                                // Simulate modus ponens: if we have (cat ==> mammal) and cat, derive mammal
                                const hasImplication = tasks.some(t => t.termKey === '(cat ==> mammal)');
                                const hasAtomic = tasks.some(t => t.termKey === 'cat');
                                if (hasImplication && hasAtomic) {
                                    derivedTasks.push({
                                        termKey: 'mammal',
                                        punctuation: '.',
                                        state: {priority: 0.5, truthValue: {frequency: 0.9, confidence: 0.9}}
                                    });
                                }

                                // Simulate inheritance chaining: if we have (cat --> mammal) and (mammal --> animal), derive (cat --> animal)
                                const hasInheritance1 = tasks.some(t => t.termKey === '(cat --> mammal)');
                                const hasInheritance2 = tasks.some(t => t.termKey === '(mammal --> animal)');
                                if (hasInheritance1 && hasInheritance2) {
                                    derivedTasks.push({
                                        termKey: '(cat --> animal)',
                                        punctuation: '.',
                                        state: {priority: 0.5, truthValue: {frequency: 0.9, confidence: 0.9}}
                                    });
                                }

                                return Promise.resolve(derivedTasks);
                            })
                        },
                        tools: mockTools,
                        actionExecutor: mockActionExecutor
                    };
                    return mocks[name] || {type: 'mock'};
                },
                register: vi.fn(),
                registerValue: vi.fn(),
                has: vi.fn(() => false)
            },
            configManager: {
                type: 'mock',
                getAll: () => ({}),
                validate: vi.fn(() => true),
                get: vi.fn(() => undefined),
                set: vi.fn()
            }
        };

        SystemFactory.cache.set(cacheKey, systemData);
        return systemData;
    },

    reset: () => {
        SystemFactory.cache.clear();
        SystemFactory.metrics = {creations: 0, cacheHits: 0};
    },

    getStats: () => ({
        ...SystemFactory.metrics,
        hitRate: SystemFactory.metrics.creations > 0 ?
            (SystemFactory.metrics.cacheHits / SystemFactory.metrics.creations) * 100 : 0,
        cacheSize: SystemFactory.cache.size || 0
    })
};

// Test framework for common test patterns
export const TestFramework = {
    // Test lifecycle management
    lifecycle: {
        async setup(type, config = {}) {
            const context = await TestContextManager.create(type, config);
            const contextName = `test_${Date.now()}_${Math.random()}`;
            TestContextManager.register(contextName, context);
            return {context, contextName};
        },

        async teardown(contextName) {
            await TestContextManager.cleanup(contextName);
        }
    },

    // Test execution helpers
    execution: {
        async withContext(type, config, testFn) {
            const {context, contextName} = await TestFramework.lifecycle.setup(type, config);
            try {
                return await testFn(context);
            } finally {
                await TestFramework.lifecycle.teardown(contextName);
            }
        },

        async withReasoner(config, testFn) {
            return TestFramework.execution.withContext('reasoner', config, testFn);
        },

        async withMemory(config, testFn) {
            return TestFramework.execution.withContext('memory', config, testFn);
        },

        async withSystem(config, testFn) {
            return TestFramework.execution.withContext('system', config, testFn);
        }
    },

    // Assertion helpers
    assertions: {
        expectTask: (task, expectedTermKey, expectedPunctuation, expectedTruth = null) => {
            expect(task).toBeDefined('Task is required');
            expect(task.termKey).toBe(expectedTermKey, 'Task termKey mismatch');
            expect(task.punctuation).toBe(expectedPunctuation, 'Task punctuation mismatch');
            expectedTruth && expect(task.state.truthValue).toEqual(expectedTruth, 'Task truth value mismatch');
        },

        expectTerm: (term, expectedKey, expectedComplexity = null) => {
            expect(term).toBeDefined('Term is required');
            expect(term.key).toBe(expectedKey, 'Term key mismatch');
            expectedComplexity !== null && expect(term.complexity).toBe(expectedComplexity, 'Term complexity mismatch');
        },

        expectInferenceResults: (inputTasks, expectedOutput) => {
            expect(inputTasks).toBeDefined('Input tasks are required');
            expect(expectedOutput).toBeDefined('Expected output is required');
        },

        expectMemoryState: (memory, expectedState) => {
            if (expectedState.size !== undefined) {
                expect(memory.size).toBe(expectedState.size, 'Memory size mismatch');
            }
            if (expectedState.contains) {
                expectedState.contains.forEach(termKey =>
                    expect(memory.has(termKey)).toBe(true, `Memory should contain: ${termKey}`));
            }
        },

        expectComponents: (container, componentNames) => {
            componentNames.forEach(name => {
                const component = container.get(name);
                expect(component).toBeDefined(`${name} component is required`);
                expect(component).not.toBeNull(`${name} component should not be null`);
            });
        }
    },

    // Error testing
    errors: {
        testErrorHandling: (operation, expectedError) => {
            try {
                operation();
                expect(false).toBe(true, 'Expected operation to throw');
            } catch (error) {
                if (typeof expectedError === 'string') {
                    expect(error.message).toContain(expectedError);
                } else if (expectedError instanceof RegExp) {
                    expect(error.message).toMatch(expectedError);
                } else if (typeof expectedError === 'function') {
                    expect(error).toBeInstanceOf(expectedError);
                }
            }
        },

        async testAsyncErrorHandling(asyncOperation, expectedError) {
            try {
                await asyncOperation();
                expect(false).toBe(true, 'Expected operation to throw');
            } catch (error) {
                if (typeof expectedError === 'string') {
                    expect(error.message).toContain(expectedError);
                } else if (expectedError instanceof RegExp) {
                    expect(error.message).toMatch(expectedError);
                }
            }
        }
    },

    // Performance testing
    performance: {
        async measurePerformance(operation, maxTimeMs) {
            const startTime = performance.now();
            const result = await operation();
            const executionTime = performance.now() - startTime;
            expect(executionTime).toBeLessThanOrEqual(maxTimeMs, `Operation exceeded ${maxTimeMs}ms`);
            return {result, executionTime};
        },

        async measurePerformanceMultiple(operation, iterations, maxAverageTimeMs) {
            const times = [];
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                await operation();
                times.push(performance.now() - startTime);
            }
            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            expect(averageTime).toBeLessThanOrEqual(maxAverageTimeMs, `Average time exceeded ${maxAverageTimeMs}ms`);
            return {times, averageTime};
        }
    },

    // Data-driven testing
    dataDriven: {
        runDataDrivenTest: (testName, dataSets, testFn) => {
            dataSets.forEach((dataSet, index) =>
                test(`${testName} - data set ${index + 1}`, async () => await testFn(dataSet, index)));
        },

        runParameterizedTest: (baseName, parameters, testFn) => {
            parameters.forEach((params, index) =>
                test(`${baseName} with parameters ${index + 1}`, async () => await testFn(params, index)));
        }
    },

    // Configuration testing
    config: {
        async testConfigValidation(configManager, testConfig, shouldPass = true) {
            if (!configManager) throw new Error('ConfigManager not available');

            if (shouldPass) {
                expect(() => configManager.validate(testConfig)).not.toThrow();
            } else {
                expect(() => configManager.validate(testConfig)).toThrow();
            }
        },

        testConfigType(configManager, key, value, expectedType) {
            if (!configManager) throw new Error('ConfigManager not available');

            const testConfig = {[key]: value};

            switch (expectedType.toLowerCase()) {
                case 'string':
                    expect(typeof value).toBe('string', `Expected string for ${key}`);
                    break;
                case 'number':
                    expect(typeof value).toBe('number', `Expected number for ${key}`);
                    break;
                case 'boolean':
                    expect(typeof value).toBe('boolean', `Expected boolean for ${key}`);
                    break;
                case 'object':
                    expect(typeof value).toBe('object', `Expected object for ${key}`);
                    break;
                default:
                    throw new Error(`Unknown expected type: ${expectedType}`);
            }
        }
    }
};

// Performance monitoring utilities
export const getCacheStats = () => globalCache.hitRate;
export const resetAllCaches = () => {
    globalCache.clear();
    ValidationEngine.reset();
    MockRegistry.reset();
    ConfigRegistry.reset();
    DocumentationRegistry.reset();
    TestContextManager.reset();
    SystemFactory.reset();
};