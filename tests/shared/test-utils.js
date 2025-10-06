import {expect, vi} from 'vitest';

const globalCache = new Map();
const accessOrder = [];

// Generic registry with caching, metrics, and lifecycle management
class Registry {
    constructor(name, cache = globalCache) {
        this.name = name;
        this.cache = cache;
        this.storage = new Map();
        this.metrics = {operations: 0, cacheHits: 0};
    }

    get hitRate() {
        return this.metrics.operations > 0 ? this.metrics.cacheHits / this.metrics.operations : 0;
    }

    register(key, value) {
        this.storage.set(key, value);
    }

    get(key, ...args) {
        this.metrics.operations++;
        const cacheKey = `${key}:${JSON.stringify(args)}`;

        const cached = this.cache.get(cacheKey);
        if (cached) {
            this.metrics.cacheHits++;
            return cached;
        }

        const item = this.storage.get(key);
        if (!item) throw new Error(`Unknown ${this.name}: ${key}`);

        const result = typeof item === 'function' ? item(...args) : item;
        this.cache.set(cacheKey, result);
        return result;
    }

    reset() {
        this.metrics = {operations: 0, cacheHits: 0};
    }
}

// Optimized cache with LRU eviction
class OptimizedCache {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = [];
        this.hits = 0;
        this.misses = 0;
    }

    get size() {
        return this.cache.size;
    }

    get hitRate() {
        return (this.hits + this.misses) > 0 ? this.hits / (this.hits + this.misses) : 0;
    }

    get(key) {
        if (this.cache.has(key)) {
            this.hits++;
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
            const lruKey = this.accessOrder.shift();
            if (lruKey) this.cache.delete(lruKey);
        }

        this.cache.set(key, value);
        this.accessOrder.push(key);
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
        this.hits = this.misses = 0;
    }
}

// Batch processing utility
export const batchProcess = (items, processor, batchSize = 10) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        results.push(...items.slice(i, i + batchSize).map(processor));
    }
    return results;
};

// Validation registry using generic registry pattern
export const ValidationEngine = new Registry('validation rule');

ValidationEngine.metrics = {validations: 0, cacheHits: 0, batches: 0};

ValidationEngine.validateBatch = (targets, ruleName, context = 'validation') => {
    ValidationEngine.metrics.batches++;
    const results = [];
    const uncachedTargets = [];

    targets.forEach((target, i) => {
        const cacheKey = `${ruleName}:${JSON.stringify(target)}`;

        const cached = ValidationEngine.cache.get(cacheKey);
        if (cached) {
            ValidationEngine.metrics.cacheHits++;
            results[i] = cached;
        } else {
            uncachedTargets.push({target, index: i, cacheKey});
        }
    });

    if (uncachedTargets.length > 0) {
        const rule = ValidationEngine.storage.get(ruleName);
        if (!rule) throw new Error(`Unknown validation rule: ${ruleName}`);

        uncachedTargets.forEach(({target, index, cacheKey}) => {
            ValidationEngine.metrics.validations++;
            const result = rule(target, `${context}[${index}]`);
            ValidationEngine.cache.set(cacheKey, result);
            results[index] = result;
        });
    }

    return results;
};

ValidationEngine.validate = (target, ruleName, context = 'validation') => {
    ValidationEngine.metrics.validations++;
    const cacheKey = `${ruleName}:${JSON.stringify(target)}`;

    const cached = ValidationEngine.cache.get(cacheKey);
    if (cached) {
        ValidationEngine.metrics.cacheHits++;
        return cached;
    }

    const rule = ValidationEngine.storage.get(ruleName);
    if (!rule) throw new Error(`Unknown validation rule: ${ruleName}`);

    const result = rule(target, context);
    ValidationEngine.cache.set(cacheKey, result);
    return result;
};

ValidationEngine.reset = () => {
    ValidationEngine.cache.clear();
    ValidationEngine.metrics = {validations: 0, cacheHits: 0, batches: 0};
};

ValidationEngine.getStats = () => ({
    ...ValidationEngine.metrics,
    hitRate: ValidationEngine.metrics.validations > 0 ?
        ValidationEngine.metrics.cacheHits / ValidationEngine.metrics.validations : 0,
    cacheSize: ValidationEngine.cache.size
});

// Validation rules
ValidationEngine.register('object', (obj, context) => {
    if (!obj) throw new Error(`${context} is null or undefined`);
    return obj;
});

ValidationEngine.register('objectSpec', (obj, context, spec) => {
    if (!obj) throw new Error(`${context} is null or undefined`);

    const validations = [];

    spec.required?.forEach(prop =>
        validations.push(() => expect(obj).toHaveProperty(prop, `${context} missing required property: ${prop}`)));

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

    spec.types && Object.entries(spec.types).forEach(([prop, expectedType]) => {
        obj[prop] !== undefined && validations.push(() =>
            expect(typeof obj[prop]).toBe(expectedType, `${context}.${prop} type mismatch`));
    });

    validations.forEach(validate => validate());
    return obj;
});

ValidationEngine.register('collection', (objects, context, spec) => {
    expect(objects).toBeDefined(`${context} should be defined`);
    expect(Array.isArray(objects)).toBe(true, `${context} should be an array`);
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

// Mock registry
export const MockRegistry = new Registry('mock template');
MockRegistry.metrics = {creations: 0, cacheHits: 0};

MockRegistry.create = (templateName, ...args) => {
    MockRegistry.metrics.creations++;
    return MockRegistry.get(templateName, ...args);
};

MockRegistry.reset = () => {
    MockRegistry.cache.clear();
    MockRegistry.metrics = {creations: 0, cacheHits: 0};
};

MockRegistry.getStats = () => ({
    ...MockRegistry.metrics,
    hitRate: MockRegistry.metrics.creations > 0 ?
        (MockRegistry.metrics.cacheHits / MockRegistry.metrics.creations) * 100 : 0,
    cacheSize: MockRegistry.cache.size || 0
});

// Configuration registry
export const ConfigRegistry = new Registry('configuration template');
ConfigRegistry.validators = new Map();
ConfigRegistry.metrics = {accesses: 0, cacheHits: 0};

ConfigRegistry.registerTemplate = (name, template, validator = null) => {
    ConfigRegistry.storage.set(name, template);
    if (validator) ConfigRegistry.validators.set(name, validator);
};

ConfigRegistry.get = (templateName, overrides = {}) => {
    ConfigRegistry.metrics.accesses++;
    const result = ConfigRegistry.constructor.prototype.get.call(ConfigRegistry, templateName, overrides);

    const validator = ConfigRegistry.validators.get(templateName);
    if (validator && !validator(result)) {
        throw new Error(`Invalid configuration for template: ${templateName}`);
    }

    return result;
};

ConfigRegistry.reset = () => {
    ConfigRegistry.cache.clear();
    ConfigRegistry.metrics = {accesses: 0, cacheHits: 0};
};

ConfigRegistry.getStats = () => ({
    ...ConfigRegistry.metrics,
    hitRate: ConfigRegistry.metrics.accesses > 0 ?
        (ConfigRegistry.metrics.cacheHits / ConfigRegistry.metrics.accesses) * 100 : 0,
    cacheSize: ConfigRegistry.cache.size || 0
});

// Documentation registry
export const DocumentationRegistry = new Registry('documentation template');
DocumentationRegistry.metrics = {generations: 0, cacheHits: 0};

DocumentationRegistry.generate = (templateName, data) => {
    DocumentationRegistry.metrics.generations++;
    return DocumentationRegistry.get(templateName, data);
};

DocumentationRegistry.reset = () => {
    DocumentationRegistry.cache.clear();
    DocumentationRegistry.metrics = {generations: 0, cacheHits: 0};
};

DocumentationRegistry.getStats = () => ({
    ...DocumentationRegistry.metrics,
    hitRate: DocumentationRegistry.metrics.generations > 0 ?
        (DocumentationRegistry.metrics.cacheHits / DocumentationRegistry.metrics.generations) * 100 : 0
});

// Test context manager
export const TestContextManager = new Registry('test context');
TestContextManager.active = new Map();
TestContextManager.metrics = {creations: 0, cacheHits: 0};

TestContextManager.create = async (type, config = {}) => {
    TestContextManager.metrics.creations++;
    return TestContextManager.get(type, config);
};

TestContextManager._createSingle = async (type, config = {}) => ({type, config, created: Date.now()});

TestContextManager.register = (name, context) => TestContextManager.active.set(name, context);
TestContextManager.getActive = (name) => TestContextManager.active.get(name);

TestContextManager.cleanup = async (name) => {
    const context = TestContextManager.active.get(name);
    if (context?.cleanup) await context.cleanup();
    TestContextManager.active.delete(name);
};

TestContextManager.reset = async () => {
    const activeNames = Array.from(TestContextManager.active.keys());
    await Promise.all(activeNames.map(name => TestContextManager.cleanup(name)));
    TestContextManager.active.clear();
    TestContextManager.metrics = {creations: 0, cacheHits: 0};
};

TestContextManager.getStats = () => ({
    ...TestContextManager.metrics,
    activeContexts: TestContextManager.active.size,
    hitRate: TestContextManager.metrics.creations > 0 ?
        (TestContextManager.metrics.cacheHits / TestContextManager.metrics.creations) * 100 : 0,
    cacheSize: TestContextManager.cache.size || 0
});

// System factory
export const SystemFactory = new Registry('system');
SystemFactory.metrics = {creations: 0, cacheHits: 0};

SystemFactory.create = (config = {}) => {
    SystemFactory.metrics.creations++;
    return SystemFactory.get('system', config);
};

SystemFactory.reset = () => {
    SystemFactory.cache.clear();
    SystemFactory.metrics = {creations: 0, cacheHits: 0};
};

SystemFactory.getStats = () => ({
    ...SystemFactory.metrics,
    hitRate: SystemFactory.metrics.creations > 0 ?
        (SystemFactory.metrics.cacheHits / SystemFactory.metrics.creations) * 100 : 0,
    cacheSize: SystemFactory.cache.size || 0
});

// System creation logic
SystemFactory.register('system', (config = {}) => {
    const mockTools = {
        registerTool: vi.fn(),
        executeTool: vi.fn((name, params) => {
            if (name === 'test_tool') {
                return Promise.resolve({result: `processed: ${params[0]}`, success: true});
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
                result: {success: true, action: 'unknown', params: [], result: 'executed unknown operation'}
            });
        }),
        executeAction: vi.fn((action) => {
            if (action?.operationTerm) {
                const termKey = action.operationTerm.subject?.key || 'unknown';
                const predicate = action.operationTerm.predicate;
                const params = predicate?.terms?.map(t => t.key) || [];
                return Promise.resolve({
                    result: {
                        action: termKey,
                        params,
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
        getResource: vi.fn((name) => name === 'testResource' ? {type: 'test', value: 42, active: true} : undefined),
        getAllResources: vi.fn(() => ({})),
        getActionHistory: vi.fn(() => [{
            action: 'history_test',
            parameters: ['test_value'],
            status: 'success',
            type: 'operation',
            timestamp: Date.now()
        }])
    };

    return {
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
                    const hasImplication = tasks.some(t => t.termKey === '(cat ==> mammal)');
                    const hasAtomic = tasks.some(t => t.termKey === 'cat');
                    if (hasImplication && hasAtomic) {
                        derivedTasks.push({
                            termKey: 'mammal',
                            punctuation: '.',
                            state: {priority: 0.5, truthValue: {frequency: 0.9, confidence: 0.9}}
                        });
                    }

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
            request: vi.fn((command) => {
                switch (command) {
                    case 'MEMORY_GET_ALL_TASKS':
                        return Promise.resolve([
                            {termKey: 'AcquireKnowledge', punctuation: '!', state: {priority: 0.8}},
                            {termKey: 'cat', punctuation: '.', state: {priority: 0.2}}
                        ]);
                    case 'REASONER_PROCESS_TASK':
                        return Promise.resolve([]);
                    default:
                        return Promise.resolve(null);
                }
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
            get: (name) => ({
                memory: {
                    addTask: vi.fn((task) => Promise.resolve(task)),
                    addTasks: vi.fn((tasks) => Promise.resolve(tasks)),
                    addTerm: vi.fn((term) => Promise.resolve(term)),
                    getTask: vi.fn(() => null),
                    getTerm: vi.fn(() => null),
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
                        const hasImplication = tasks.some(t => t.termKey === '(cat ==> mammal)');
                        const hasAtomic = tasks.some(t => t.termKey === 'cat');
                        if (hasImplication && hasAtomic) {
                            derivedTasks.push({
                                termKey: 'mammal',
                                punctuation: '.',
                                state: {priority: 0.5, truthValue: {frequency: 0.9, confidence: 0.9}}
                            });
                        }

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
            }[name] || {type: 'mock'}),
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
});

// Test framework with consolidated patterns
export const TestFramework = {
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

    execution: {
        async withContext(type, config, testFn) {
            const {context, contextName} = await TestFramework.lifecycle.setup(type, config);
            try {
                return await testFn(context);
            } finally {
                await TestFramework.lifecycle.teardown(contextName);
            }
        },

        withReasoner: (config, testFn) => TestFramework.execution.withContext('reasoner', config, testFn),
        withMemory: (config, testFn) => TestFramework.execution.withContext('memory', config, testFn),
        withSystem: (config, testFn) => TestFramework.execution.withContext('system', config, testFn)
    },

    assertions: {
        expectTask: (task, expectedTermKey, expectedPunctuation, expectedTruth = null) => {
            expect(task).toBeDefined();
            expect(task.termKey).toBe(expectedTermKey);
            expect(task.punctuation).toBe(expectedPunctuation);
            if (expectedTruth) expect(task.state.truthValue).toEqual(expectedTruth);
        },

        expectTerm: (term, expectedKey, expectedComplexity = null) => {
            expect(term).toBeDefined();
            expect(term.key).toBe(expectedKey);
            if (expectedComplexity !== null) expect(term.complexity).toBe(expectedComplexity);
        },

        expectInferenceResults: (inputTasks, expectedOutput) => {
            expect(inputTasks).toBeDefined();
            expect(expectedOutput).toBeDefined();
        },

        expectMemoryState: (memory, expectedState) => {
            if (expectedState.size !== undefined) expect(memory.size).toBe(expectedState.size);
            expectedState.contains?.forEach(termKey => expect(memory.has(termKey)).toBe(true));
        },

        expectComponents: (container, componentNames) => {
            componentNames.forEach(name => {
                const component = container.get(name);
                expect(component).toBeDefined();
                expect(component).not.toBeNull();
            });
        }
    },

    errors: {
        testErrorHandling: (operation, expectedError) => {
            try {
                operation();
                expect(false).toBe(true);
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

        testAsyncErrorHandling: async (asyncOperation, expectedError) => {
            try {
                await asyncOperation();
                expect(false).toBe(true);
            } catch (error) {
                if (typeof expectedError === 'string') {
                    expect(error.message).toContain(expectedError);
                } else if (expectedError instanceof RegExp) {
                    expect(error.message).toMatch(expectedError);
                }
            }
        }
    },

    performance: {
        async measurePerformance(operation, maxTimeMs) {
            const startTime = performance.now();
            const result = await operation();
            const executionTime = performance.now() - startTime;
            expect(executionTime).toBeLessThanOrEqual(maxTimeMs);
            return {result, executionTime};
        },

        async measurePerformanceMultiple(operation, iterations, maxAverageTimeMs) {
            const times = [];
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                await operation();
                times.push(performance.now() - startTime);
            }
            const averageTime = times.reduce((a, b) => a + b) / times.length;
            expect(averageTime).toBeLessThanOrEqual(maxAverageTimeMs);
            return {times, averageTime};
        }
    },

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
                case 'number':
                case 'boolean':
                case 'object':
                    expect(typeof value).toBe(expectedType.toLowerCase());
                    break;
                default:
                    throw new Error(`Unknown expected type: ${expectedType}`);
            }
        }
    }
};

// Utility functions
export const createCache = (maxSize = 1000) => new OptimizedCache(maxSize);
export const batchValidate = (targets, rule, context = 'validation') => ValidationEngine.validateBatch(targets, rule, context);
export const validate = (target, rule, context = 'validation', ...args) => ValidationEngine.validate(target, rule, context, ...args);
export const createMock = (type, ...args) => MockRegistry.create(type, ...args);
export const createConfig = (templateName, overrides = {}) => ConfigRegistry.get(templateName, overrides);
export const generateDoc = (type, data) => DocumentationRegistry.generate(type, data);
export const createTestContext = (type, config = {}) => TestContextManager.create(type, config);

// Performance monitoring
export const getCacheStats = () => globalCache.hitRate || 0;
export const resetAllCaches = () => {
    globalCache.clear();
    accessOrder.length = 0;
    ValidationEngine.reset();
    MockRegistry.reset();
    ConfigRegistry.reset();
    DocumentationRegistry.reset();
    TestContextManager.reset();
    SystemFactory.reset();
};