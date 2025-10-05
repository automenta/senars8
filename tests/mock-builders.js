/**
 * High-Performance Mock System
 * Optimized mock creation with shared caching and batch operations
 */

import {vi} from 'vitest';

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

// High-performance mock registry using shared cache
const MockRegistry = {
    cache: globalCache,
    templates: new Map(),
    metrics: {creations: 0, cacheHits: 0},

    register: (name, template) => MockRegistry.templates.set(name, template),

    // Batch mock creation for improved performance
    createBatch: (items) => {
        const results = [];
        const uncachedItems = [];

        // Check cache for all items first
        for (let i = 0; i < items.length; i++) {
            const {templateName, args = []} = items[i];
            const cacheKey = `${templateName}:${JSON.stringify(args)}`;

            if (MockRegistry.cache.has && MockRegistry.cache.has(cacheKey)) {
                MockRegistry.metrics.cacheHits++;
                results[i] = MockRegistry.cache.get(cacheKey);
            } else {
                uncachedItems.push({templateName, args, index: i, cacheKey});
            }
        }

        // Create only uncached mocks
        if (uncachedItems.length > 0) {
            for (const {templateName, args, index, cacheKey} of uncachedItems) {
                MockRegistry.metrics.creations++;
                const template = MockRegistry.templates.get(templateName);
                if (!template) throw new Error(`Unknown mock template: ${templateName}`);

                const mock = template(...args);
                if (MockRegistry.cache.set) MockRegistry.cache.set(cacheKey, mock);
                results[index] = mock;
            }
        }

        return results;
    },

    // Single mock creation with caching
    create: (templateName, ...args) => {
        MockRegistry.metrics.creations++;
        const cacheKey = `${templateName}:${JSON.stringify(args)}`;

        if (MockRegistry.cache.has && MockRegistry.cache.has(cacheKey)) {
            MockRegistry.metrics.cacheHits++;
            return MockRegistry.cache.get(cacheKey);
        }

        const template = MockRegistry.templates.get(templateName);
        if (!template) throw new Error(`Unknown mock template: ${templateName}`);

        const mock = template(...args);
        if (MockRegistry.cache.set) MockRegistry.cache.set(cacheKey, mock);
        return mock;
    },

    reset: () => {
        if (MockRegistry.cache.clear) MockRegistry.cache.clear();
        MockRegistry.metrics = {creations: 0, cacheHits: 0};
    },

    getStats: () => ({
        ...MockRegistry.metrics,
        hitRate: MockRegistry.metrics.creations > 0 ?
            (MockRegistry.metrics.cacheHits / MockRegistry.metrics.creations) * 100 : 0,
        cacheSize: MockRegistry.cache.size || 0
    })
};

// Optimized mock templates with shared patterns
const createBaseComponentMock = () => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn()
});

const createAsyncComponentMock = () => ({
    ...createBaseComponentMock(),
    handle: vi.fn(() => Promise.resolve()),
    execute: vi.fn(() => Promise.resolve())
});

// Register optimized core mock templates
MockRegistry.register('commandBus', () => ({
    ...createAsyncComponentMock(),
    request: vi.fn(() => Promise.resolve())
}));

MockRegistry.register('eventBus', () => ({
    ...createBaseComponentMock(),
    emit: vi.fn(() => Promise.resolve()),
    emitAsync: vi.fn(() => Promise.resolve())
}));

MockRegistry.register('memory', () => ({
    ...createAsyncComponentMock(),
    addTask: vi.fn(() => Promise.resolve()),
    getTask: vi.fn(() => null),
    hasTask: vi.fn(() => false),
    removeTask: vi.fn(() => Promise.resolve()),
    getAllTasks: vi.fn(() => []),
    size: 0
}));

MockRegistry.register('reasoner', () => ({
    ...createAsyncComponentMock(),
    processTask: vi.fn(() => Promise.resolve()),
    processInput: vi.fn(() => Promise.resolve()),
    getInferences: vi.fn(() => []),
    reset: vi.fn(() => Promise.resolve())
}));

MockRegistry.register('term', (key = 'test-term', complexity = 1) => ({
    key,
    complexity,
    embedding: [0.1, 0.2, 0.3],
    toString: vi.fn(() => key),
    equals: vi.fn(() => false)
}));

MockRegistry.register('task', (termKey = 'test-term', punctuation = '.') => ({
    termKey,
    punctuation,
    state: {
        truthValue: {frequency: 1.0, confidence: 0.9},
        priority: 0
    },
    execute: vi.fn(() => Promise.resolve()),
    clone: vi.fn(() => null)
}));

// Unified mock creation API with batch support
export const createMock = (type, ...args) => MockRegistry.create(type, ...args);

// Batch mock creation for improved performance
export const createMockBatch = (items) => MockRegistry.createBatch(items);

// Specialized mock creators for common types
export const createCommandBusMock = () => createMock('commandBus');
export const createEventBusMock = () => createMock('eventBus');
export const createMemoryMock = () => createMock('memory');
export const createReasonerMock = () => createMock('reasoner');
export const createTermMock = (...args) => createMock('term', ...args);
export const createTaskMock = (...args) => createMock('task', ...args);

// Optimized custom mock creation
export const createCustomMock = (config = {}) => {
    const {methods = {}, properties = {}, events = []} = config;
    const mock = {};

    // Batch method creation for better performance
    const methodEntries = Object.entries(methods);
    for (let i = 0; i < methodEntries.length; i++) {
        const [name, behavior] = methodEntries[i];
        mock[name] = typeof behavior === 'function' ? vi.fn(behavior) :
                    behavior instanceof Error ? vi.fn(() => { throw behavior; }) :
                    vi.fn(() => behavior);
    }

    // Batch property creation
    const propertyEntries = Object.entries(properties);
    for (let i = 0; i < propertyEntries.length; i++) {
        const [name, value] = propertyEntries[i];
        Object.defineProperty(mock, name, {
            get: vi.fn(() => value),
            set: vi.fn(),
            enumerable: true,
            configurable: true
        });
    }

    // Add event emitter if specified - optimized
    if (events.length > 0) {
        const handlers = new Map();
        mock.on = vi.fn((event, handler) => {
            if (!handlers.has(event)) handlers.set(event, []);
            handlers.get(event).push(handler);
        });
        mock.emit = vi.fn((event, ...args) => {
            if (handlers.has(event)) {
                handlers.get(event).forEach(handler => handler(...args));
            }
        });
        mock.off = vi.fn((event, handler) => {
            if (handlers.has(event)) {
                const eventHandlers = handlers.get(event);
                const index = eventHandlers.indexOf(handler);
                if (index > -1) eventHandlers.splice(index, 1);
            }
        });
    }

    return mock;
};

// Optimized mock validation with batch processing
export const validateMock = (mock, expectations) => {
    const {methods = [], properties = [], callCounts = {}, callArgs = {}} = expectations;

    // Batch validate methods and properties for better performance
    const allMethods = [...new Set([...methods, ...Object.keys(callCounts), ...Object.keys(callArgs)])];
    const validations = [];

    allMethods.forEach(method => {
        if (methods.includes(method) || callCounts[method] !== undefined || callArgs[method] !== undefined) {
            validations.push(() => {
                expect(mock).toHaveProperty(method);
                expect(typeof mock[method]).toBe('function');
            });
        }
    });

    properties.forEach(prop => validations.push(() => expect(mock).toHaveProperty(prop)));

    // Execute all validations
    validations.forEach(validate => validate());

    // Batch validate call counts
    Object.entries(callCounts).forEach(([method, count]) => {
        if (mock[method]?.mock) expect(mock[method]).toHaveBeenCalledTimes(count);
    });

    // Batch validate call arguments
    Object.entries(callArgs).forEach(([method, argsList]) => {
        if (mock[method]?.mock) {
            argsList.forEach((args, index) =>
                expect(mock[method]).toHaveBeenNthCalledWith(index + 1, ...args));
        }
    });
};

// Optimized mock utility functions
export const MockUtils = {
    spyOn: (obj, methodName) =>
        (typeof obj[methodName] === 'function' ? vi.spyOn(obj, methodName) : obj[methodName] = vi.fn()),

    // Batch mock clearing for better performance
    clearAll: (obj) => {
        const values = Object.values(obj);
        for (let i = 0; i < values.length; i++) {
            values[i]?.mockClear?.();
        }
    },

    resetAll: (obj) => {
        const values = Object.values(obj);
        for (let i = 0; i < values.length; i++) {
            values[i]?.mockReset?.();
        }
    },

    waitForAsync: () => vi.waitUntil(() => true),

    withImplementation: (implementation, name = 'mock') => {
        const mockFn = vi.fn(implementation);
        mockFn.mockName(name);
        return mockFn;
    },

    asyncMock: (value, delay = 0) =>
        vi.fn(() => new Promise(resolve => setTimeout(() => resolve(value), delay)))
};

// Predefined mock sets for common scenarios
export const createMockSet = (components = {}) => {
    const {commandBus, eventBus, memory, reasoner, container} = components;
    const mocks = {};

    if (commandBus) mocks.commandBus = createCommandBusMock();
    if (eventBus) mocks.eventBus = createEventBusMock();
    if (memory) mocks.memory = createMemoryMock();
    if (reasoner) mocks.reasoner = createReasonerMock();

    if (container) {
        mocks.container = createCustomMock({
            methods: {
                get: vi.fn(key => mocks[key] || null),
                register: vi.fn(),
                registerValue: vi.fn(),
                registerFactory: vi.fn(),
                has: vi.fn(() => false)
            }
        });
    }

    return mocks;
};

// Backward compatibility exports
export const createMockCommandBus = () => createMock('commandBus');
export const createMockEventBus = () => createMock('eventBus');
export const createMockMemory = () => createMock('memory');
export const createMockReasoner = () => createMock('reasoner');

// Legacy mock builder for backward compatibility
export const createConsistentMock = (componentName, customMethods = {}, customProperties = {}) => {
    const mock = {};

    // Add default methods based on component type
    const defaultMethods = {
        commandBus: {
            handle: vi.fn(() => Promise.resolve()),
            request: vi.fn(() => Promise.resolve()),
            execute: vi.fn(() => Promise.resolve())
        },
        eventBus: {
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(() => Promise.resolve()),
            emitAsync: vi.fn(() => Promise.resolve())
        },
        memory: {
            addTask: vi.fn(() => Promise.resolve()),
            getTask: vi.fn(() => null),
            hasTask: vi.fn(() => false),
            removeTask: vi.fn(() => Promise.resolve()),
            getAllTasks: vi.fn(() => [])
        },
        reasoner: {
            processTask: vi.fn(() => Promise.resolve()),
            processInput: vi.fn(() => Promise.resolve()),
            getInferences: vi.fn(() => []),
            reset: vi.fn(() => Promise.resolve())
        }
    };

    // Add default methods for the component type
    const defaults = defaultMethods[componentName.toLowerCase()] || {};
    Object.entries(defaults).forEach(([methodName, methodImpl]) => {
        mock[methodName] = methodImpl;
    });

    // Add custom methods
    Object.entries(customMethods).forEach(([methodName, methodConfig]) => {
        mock[methodName] = typeof methodConfig === 'function' ? vi.fn(methodConfig) :
                         methodConfig instanceof Error ? vi.fn(() => { throw methodConfig; }) :
                         vi.fn(() => methodConfig);
    });

    // Add custom properties
    Object.entries(customProperties).forEach(([propName, propValue]) => {
        Object.defineProperty(mock, propName, {
            get: vi.fn(() => propValue),
            set: vi.fn(),
            enumerable: true,
            configurable: true
        });
    });

    return mock;
};

// Mock validation utilities for backward compatibility
export const MockValidator = {
    validateMethods: (mock, expectedMethods) => {
        for (const method of expectedMethods) {
            expect(mock).toHaveProperty(method);
            expect(typeof mock[method]).toBe('function');
        }
    },

    validateProperties: (mock, expectedProperties) => {
        for (const prop of expectedProperties) {
            expect(mock).toHaveProperty(prop);
        }
    },

    validateCallCounts: (mock, expectedCallCounts) => {
        for (const [methodName, expectedCount] of Object.entries(expectedCallCounts)) {
            if (typeof mock[methodName] === 'function' && mock[methodName].mock) {
                expect(mock[methodName]).toHaveBeenCalledTimes(expectedCount);
            }
        }
    },

    validateCallArguments: (mock, expectedCalls) => {
        for (const [methodName, expectedArgsList] of Object.entries(expectedCalls)) {
            if (typeof mock[methodName] === 'function' && mock[methodName].mock) {
                expectedArgsList.forEach((expectedArgs, index) => {
                    expect(mock[methodName]).toHaveBeenNthCalledWith(index + 1, ...expectedArgs);
                });
            }
        }
    }
};

// Performance monitoring
export const getMockStats = () => MockRegistry.getStats();
export const resetMockCache = () => MockRegistry.reset();
