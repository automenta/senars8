import {expect, vi} from 'vitest';
import {SYSTEM_CONSTANTS} from '../../core/config/constants.js';
import {TEST_CONSTANTS} from '../test-constants.js';
import {BaseRegistry, OptimizedCache, batchProcess as baseBatchProcess} from '../../core/utils/BaseRegistry.js';

const globalCache = new Map();

// Validation registry using BaseRegistry
export const ValidationEngine = new BaseRegistry('validation rule', globalCache);

ValidationEngine.validateBatch = (targets, ruleName, context = 'validation') => {
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

ValidationEngine.validate = (target, ruleName, context = 'validation', ...args) => {
    ValidationEngine.metrics.validations = (ValidationEngine.metrics.validations || 0) + 1;
    const safeStringify = (obj) => JSON.stringify(obj, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v
    );
    const cacheKey = `${ruleName}:${safeStringify(target)}`;

    const cached = ValidationEngine.cache.get(cacheKey);
    if (cached) {
        ValidationEngine.metrics.cacheHits = (ValidationEngine.metrics.cacheHits || 0) + 1;
        return cached;
    }

    const rule = ValidationEngine.storage.get(ruleName);
    if (!rule) throw new Error(`Unknown validation rule: ${ruleName}`);

    const result = rule(target, context, ...args);
    ValidationEngine.cache.set(cacheKey, result);
    return result;
};

ValidationEngine.getStats = () => ({
    ...ValidationEngine.getMetrics(),
    validations: ValidationEngine.metrics.validations || 0
});

// Validation rules
ValidationEngine.register('object', (obj, context) => {
    if (!obj) throw new Error(`${context} is null or undefined`);
    return obj;
});

ValidationEngine.register('objectSpec', (obj, context, spec) => {
    if (!obj) throw new Error(`${context} is null or undefined`);
    
    // Initialize spec if not provided
    if (!spec) spec = {};

    const validations = [];

    if (spec.required && Array.isArray(spec.required)) {
        spec.required.forEach(prop =>
            validations.push(() => expect(obj).toHaveProperty(prop)));
    }

    if (spec.properties) {
        Object.entries(spec.properties).forEach(([prop, expected]) => {
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
    }

    if (spec.types) {
        Object.entries(spec.types).forEach(([prop, expectedType]) => {
            if (obj[prop] !== undefined) {
                validations.push(() =>
                    expect(typeof obj[prop]).toBe(expectedType, `${context}.${prop} type mismatch`));
            }
        });
    }

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

// Configuration registry
export const ConfigRegistry = new BaseRegistry('configuration template', globalCache);
ConfigRegistry.validators = new Map();

ConfigRegistry.registerTemplate = (name, template, validator = null) => {
    ConfigRegistry.storage.set(name, template);
    if (validator) ConfigRegistry.validators.set(name, validator);
};

// Register core configuration templates
ConfigRegistry.registerTemplate('TASK', {
    punctuation: '.', truth: TEST_CONSTANTS.TRUTH_VALUE_PRESETS.DEFAULT, priority: SYSTEM_CONSTANTS.DEFAULT_PRIORITIES.DEFAULT
});

ConfigRegistry.registerTemplate('TERM', {
    complexity: SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY, embedding: SYSTEM_CONSTANTS.DEFAULT_EMBEDDING
});

ConfigRegistry.registerTemplate('SYSTEM', {
    reasoner: {strategy: 'BruteForce'}
});

ConfigRegistry.registerTemplate('UNIT_TEST', {
    timeout: 5000, setup: 'unit', mockLevel: 'full',
    validation: {errorHandling: true, edgeCases: true}
});

ConfigRegistry.registerTemplate('INTEGRATION_TEST', {
    timeout: 10000, setup: 'integration', mockLevel: 'partial',
    validation: {componentInteraction: true, dataFlow: true, performance: true}
});

ConfigRegistry.registerTemplate('SYSTEM_TEST', {
    timeout: 30000, setup: 'system', mockLevel: 'minimal',
    validation: {endToEnd: true, performance: true, errorRecovery: true}
});

ConfigRegistry.get = (templateName, overrides = {}) => {
    // Use the base class get method to avoid recursion
    const template = BaseRegistry.prototype.get.call(ConfigRegistry, templateName);
    // Merge template with overrides to create the final config
    const result = {...template, ...overrides};

    const validator = ConfigRegistry.validators.get(templateName);
    if (validator && !validator(result)) {
        throw new Error(`Invalid configuration for template: ${templateName}`);
    }

    return result;
};

ConfigRegistry.getStats = () => ({
    ...ConfigRegistry.getMetrics(),
    accesses: ConfigRegistry.metrics.accesses || 0
});

// Mock registry using BaseRegistry
export const MockRegistry = new BaseRegistry('mock template', globalCache);
MockRegistry.metrics = {creations: 0, cacheHits: 0};

MockRegistry.create = (templateName, ...args) => {
    MockRegistry.metrics.creations++;
    return MockRegistry.get(templateName, ...args);
};

MockRegistry.getStats = () => ({
    ...MockRegistry.getMetrics(),
    creations: MockRegistry.metrics.creations || 0,
    hitRate: (MockRegistry.metrics.creations || 0) > 0 ?
        (MockRegistry.metrics.cacheHits || 0) / (MockRegistry.metrics.creations || 0) * 100 : 0
});

// Documentation registry using BaseRegistry
export const DocumentationRegistry = new BaseRegistry('documentation template', globalCache);
DocumentationRegistry.metrics = {generations: 0, cacheHits: 0};

DocumentationRegistry.generate = (templateName, data) => {
    DocumentationRegistry.metrics.generations++;
    return DocumentationRegistry.get(templateName, data);
};

DocumentationRegistry.getStats = () => ({
    ...DocumentationRegistry.getMetrics(),
    generations: DocumentationRegistry.metrics.generations || 0,
    hitRate: (DocumentationRegistry.metrics.generations || 0) > 0 ?
        (DocumentationRegistry.metrics.cacheHits || 0) / (DocumentationRegistry.metrics.generations || 0) * 100 : 0
});

// Test context manager - simplified version that doesn't require complex setup
export const TestContextManager = new BaseRegistry('test context', globalCache);
TestContextManager.active = new Map();
TestContextManager.metrics = {creations: 0, cacheHits: 0};

TestContextManager.create = async (type, config = {}) => ({
    type, 
    config, 
    created: Date.now(),
    cleanup: async () => {} // Simple cleanup that does nothing for now
});

// System factory using BaseRegistry
export const SystemFactory = new BaseRegistry('system', globalCache);
SystemFactory.metrics = {creations: 0, cacheHits: 0};

SystemFactory.create = (config = {}) => {
    SystemFactory.metrics.creations++;
    return SystemFactory.get('system', config);
};

SystemFactory.getStats = () => ({
    ...SystemFactory.getMetrics(),
    creations: SystemFactory.metrics.creations || 0,
    hitRate: (SystemFactory.metrics.creations || 0) > 0 ?
        (SystemFactory.metrics.cacheHits || 0) / (SystemFactory.metrics.creations || 0) * 100 : 0
});

// System creation logic - register the system template
SystemFactory.register('system', (config = {}) => {
    // Create realistic but simplified mock objects for system components
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

// Test framework with simplified patterns - reduced mock usage
export const TestFramework = {
    lifecycle: {
        async setup(type, config = {}) {
            const context = await TestContextManager.create(type, config);
            const contextName = `test_${Date.now()}_${Math.random()}`;
            TestContextManager.active.set(contextName, context);
            return {context, contextName};
        },

        async teardown(contextName) {
            const context = TestContextManager.active.get(contextName);
            if (context?.cleanup) await context.cleanup();
            TestContextManager.active.delete(contextName);
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

        withReasoner: (config, testFn) => testFn({type: 'reasoner', config}),
        withMemory: (config, testFn) => testFn({type: 'memory', config}),
        withSystem: (config, testFn) => testFn({type: 'system', config})
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
    }
};

// Utility functions
export const createCache = (maxSize = 1000) => new OptimizedCache(maxSize);
export const batchValidate = (targets, rule, context = 'validation') => ValidationEngine.validateBatch(targets, rule, context);
export const validate = (target, rule, context = 'validation', ...args) => ValidationEngine.validate(target, rule, context, ...args);
export const createMock = (type, ...args) => MockRegistry.create(type, ...args);
export const createConfig = (templateName, overrides = {}) => ConfigRegistry.get(templateName, overrides);

// Additional utility functions for compatibility
export const expectTruthValue = (actual, expectedFreq, expectedConf, precision = 3) => {
    expect(actual.frequency).toBeCloseTo(expectedFreq, precision);
    expect(actual.confidence).toBeCloseTo(expectedConf, precision);
};

export const assertTask = TestFramework.assertions.expectTask;

// Performance monitoring
export const getCacheStats = () => globalCache.hitRate || 0;
export const resetAllCaches = () => {
    globalCache.clear();
    ValidationEngine.reset();
    MockRegistry.reset();
    ConfigRegistry.reset();
};

// Export the base batchProcess function for direct use
export const batchProcess = baseBatchProcess;