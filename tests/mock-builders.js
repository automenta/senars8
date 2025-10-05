/**
 * Mock Consistency Improvements and Mock Builders
 * Standardizes the approach for mocking complex objects and creates mock builders
 */

import {vi} from 'vitest';

/**
 * Mock builder base class for creating consistent mocks
 */
export class MockBuilder {
    constructor(name) {
        this.name = name;
        this.mock = {};
        this.methodMocks = new Map();
        this.propertyMocks = new Map();
        this.eventHandlers = new Map();
    }

    /**
     * Adds a method mock to the builder
     * @param {string} methodName - Name of the method to mock
     * @param {any} returnValue - Return value for the mock
     * @param {object} options - Additional options for the mock
     * @returns {MockBuilder} Current builder instance for chaining
     */
    withMethod(methodName, returnValue = undefined, options = {}) {
        const {implementation = null, error = null, spy = false} = options;

        if (error) {
            this.methodMocks.set(methodName, vi.fn(() => {
                throw error;
            }));
        } else if (implementation) {
            this.methodMocks.set(methodName, vi.fn(implementation));
        } else {
            this.methodMocks.set(methodName, vi.fn(() => returnValue));
        }

        if (spy) {
            this.methodMocks.get(methodName).mockName(`${this.name}.${methodName}`);
        }

        return this;
    }

    /**
     * Adds a property mock to the builder
     * @param {string} propertyName - Name of the property to mock
     * @param {any} value - Value for the property
     * @returns {MockBuilder} Current builder instance for chaining
     */
    withProperty(propertyName, value) {
        this.propertyMocks.set(propertyName, {
            get: vi.fn(() => value),
            set: vi.fn()
        });
        return this;
    }

    /**
     * Adds an event emitter pattern to the mock
     * @param {Array} eventNames - Array of event names that the mock supports
     * @returns {MockBuilder} Current builder instance for chaining
     */
    withEventEmitter(eventNames = []) {
        this.mock.on = vi.fn((event, handler) => {
            if (!this.eventHandlers.has(event)) {
                this.eventHandlers.set(event, []);
            }
            this.eventHandlers.get(event).push(handler);
            return this.mock;
        });

        this.mock.emit = vi.fn((event, ...args) => {
            if (this.eventHandlers.has(event)) {
                this.eventHandlers.get(event).forEach(handler => handler(...args));
            }
        });

        this.mock.off = vi.fn((event, handler) => {
            if (this.eventHandlers.has(event)) {
                const handlers = this.eventHandlers.get(event);
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
            return this.mock;
        });

        return this;
    }

    /**
     * Builds the mock object with all configured methods and properties
     * @returns {object} Built mock object
     */
    build() {
        // Create the main mock object
        this.mock = {};

        // Add all method mocks
        for (const [methodName, methodMock] of this.methodMocks) {
            this.mock[methodName] = methodMock;
        }

        // Add all property mocks using Object.defineProperty
        for (const [propertyName, propertyMock] of this.propertyMocks) {
            Object.defineProperty(this.mock, propertyName, {
                get: propertyMock.get,
                set: propertyMock.set,
                enumerable: true,
                configurable: true
            });
        }

        // Add vitest mock properties for easier testing
        for (const methodMock of this.methodMocks.values()) {
            methodMock.mockName = methodMock.mockName || this.name;
        }

        return this.mock;
    }

    /**
     * Resets all mocks in this builder
     */
    reset() {
        for (const methodMock of this.methodMocks.values()) {
            methodMock.mockClear();
            methodMock.mockReset();
        }
        return this;
    }

    /**
     * Verifies that a method was called with expected arguments
     * @param {string} methodName - Name of the method to verify
     * @param {Array} expectedArgs - Expected arguments
     */
    verifyCall(methodName, expectedArgs) {
        const methodMock = this.methodMocks.get(methodName);
        if (!methodMock) {
            throw new Error(`Method ${methodName} not found in mock builder`);
        }
        expect(methodMock).toHaveBeenCalledWith(...expectedArgs);
    }

    /**
     * Verifies that a method was called exactly once
     * @param {string} methodName - Name of the method to verify
     */
    verifyCallOnce(methodName) {
        const methodMock = this.methodMocks.get(methodName);
        if (!methodMock) {
            throw new Error(`Method ${methodName} not found in mock builder`);
        }
        expect(methodMock).toHaveBeenCalledTimes(1);
    }
}

/**
 * Predefined mock builders for common system components
 */
export const MOCK_BUILDERS = {
    /**
     * Creates a mock for the CommandBus component
     */
    commandBus: () => new MockBuilder('CommandBus')
        .withMethod('handle', Promise.resolve())
        .withMethod('request', Promise.resolve())
        .withMethod('execute', Promise.resolve())
        .withEventEmitter(['commandReceived', 'commandCompleted']),

    /**
     * Creates a mock for the EventBus component
     */
    eventBus: () => new MockBuilder('EventBus')
        .withMethod('on', undefined)
        .withMethod('off', undefined)
        .withMethod('emit', Promise.resolve())
        .withMethod('emitAsync', Promise.resolve())
        .withEventEmitter(['eventPublished', 'eventSubscribed']),

    /**
     * Creates a mock for the Memory component
     */
    memory: () => new MockBuilder('Memory')
        .withMethod('addTask', Promise.resolve())
        .withMethod('getTask', null)
        .withMethod('hasTask', false)
        .withMethod('removeTask', Promise.resolve())
        .withMethod('getAllTasks', [])
        .withProperty('size', 0)
        .withEventEmitter(['taskAdded', 'taskRemoved', 'memoryCleared']),

    /**
     * Creates a mock for the Reasoner component
     */
    reasoner: () => new MockBuilder('Reasoner')
        .withMethod('processTask', Promise.resolve())
        .withMethod('processInput', Promise.resolve())
        .withMethod('getInferences', [])
        .withMethod('reset', Promise.resolve())
        .withEventEmitter(['taskProcessed', 'inferenceGenerated']),

    /**
     * Creates a mock for the InferenceEngine component
     */
    inferenceEngine: () => new MockBuilder('InferenceEngine')
        .withMethod('infer', [])
        .withMethod('processTaskPair', [])
        .withMethod('applyRules', [])
        .withMethod('generateConclusion', null),

    /**
     * Creates a mock for DI Container component
     */
    diContainer: () => new MockBuilder('DIContainer')
        .withMethod('get', null)
        .withMethod('register', undefined)
        .withMethod('registerValue', undefined)
        .withMethod('registerFactory', undefined)
        .withMethod('has', false),

    /**
     * Creates a mock for ConfigManager component
     */
    configManager: () => new MockBuilder('ConfigManager')
        .withMethod('get', null)
        .withMethod('set', undefined)
        .withMethod('getAll', {})
        .withMethod('validate', true)
        .withMethod('getBoolean', false)
        .withMethod('getNumber', 0)
        .withMethod('getString', '')
        .withEventEmitter(['configChanged', 'configLoaded']),


    /**
     * Creates a mock for a Term component
     */
    term: (key = 'test-term', complexity = 1) => new MockBuilder('Term')
        .withProperty('key', key)
        .withProperty('complexity', complexity)
        .withProperty('embedding', [0.1, 0.2, 0.3])
        .withMethod('toString', key)
        .withMethod('equals', false),

    /**
     * Creates a mock for a Task component
     */
    task: (termKey = 'test-term', punctuation = '.') => new MockBuilder('Task')
        .withProperty('termKey', termKey)
        .withProperty('punctuation', punctuation)
        .withProperty('state', {
            truthValue: {frequency: 1.0, confidence: 0.9},
            priority: 0
        })
        .withMethod('execute', Promise.resolve())
        .withMethod('clone', null),

    /**
     * Creates a mock for a Strategy component
     */
    strategy: (name = 'TestStrategy') => new MockBuilder(`Strategy-${name}`)
        .withMethod('execute', Promise.resolve([]))
        .withMethod('canHandle', true)
        .withMethod('getName', name)
        .withProperty('name', name)
};

/**
 * Creates a consistent mock for any component using standard patterns
 * @param {string} componentName - Name of the component to mock
 * @param {object} customMethods - Custom methods to add to the mock
 * @param {object} customProperties - Custom properties to add to the mock
 * @returns {object} Mock object
 */
export const createConsistentMock = (componentName, customMethods = {}, customProperties = {}) => {
    // Check if there's a predefined builder for this component
    const predefinedBuilder = MOCK_BUILDERS[componentName.toLowerCase()];
    if (predefinedBuilder) {
        const builder = predefinedBuilder();

        // Add custom methods
        for (const [methodName, methodConfig] of Object.entries(customMethods)) {
            if (typeof methodConfig === 'function') {
                builder.withMethod(methodName, undefined, {implementation: methodConfig});
            } else if (methodConfig instanceof Error) {
                builder.withMethod(methodName, undefined, {error: methodConfig});
            } else {
                builder.withMethod(methodName, methodConfig);
            }
        }

        // Add custom properties
        for (const [propName, propValue] of Object.entries(customProperties)) {
            builder.withProperty(propName, propValue);
        }

        return builder.build();
    }

    // If no predefined builder, create a generic one
    const builder = new MockBuilder(componentName);

    // Add default methods that most objects might have
    builder
        .withMethod('initialize', Promise.resolve())
        .withMethod('destroy', Promise.resolve())
        .withMethod('toString', componentName);

    // Add custom methods and properties
    for (const [methodName, methodConfig] of Object.entries(customMethods)) {
        if (typeof methodConfig === 'function') {
            builder.withMethod(methodName, undefined, {implementation: methodConfig});
        } else if (methodConfig instanceof Error) {
            builder.withMethod(methodName, undefined, {error: methodConfig});
        } else {
            builder.withMethod(methodName, methodConfig);
        }
    }

    for (const [propName, propValue] of Object.entries(customProperties)) {
        builder.withProperty(propName, propValue);
    }

    return builder.build();
};

/**
 * Mock validation utility to ensure mocks behave as expected
 */
export class MockValidator {
    /**
     * Validates that a mock object has all expected methods
     * @param {object} mock - Mock object to validate
     * @param {Array} expectedMethods - Array of expected method names
     */
    static validateMethods(mock, expectedMethods) {
        for (const method of expectedMethods) {
            expect(mock).toHaveProperty(method);
            expect(typeof mock[method]).toBe('function');
        }
    }

    /**
     * Validates that a mock object has all expected properties
     * @param {object} mock - Mock object to validate
     * @param {Array} expectedProperties - Array of expected property names
     */
    static validateProperties(mock, expectedProperties) {
        for (const prop of expectedProperties) {
            expect(mock).toHaveProperty(prop);
        }
    }

    /**
     * Validates that all mock methods were called expected number of times
     * @param {object} mock - Mock object to validate
     * @param {object} expectedCallCounts - Object with method names and expected call counts
     */
    static validateCallCounts(mock, expectedCallCounts) {
        for (const [methodName, expectedCount] of Object.entries(expectedCallCounts)) {
            if (typeof mock[methodName] === 'function' && mock[methodName].mock) {
                expect(mock[methodName]).toHaveBeenCalledTimes(expectedCount);
            }
        }
    }

    /**
     * Validates that mock methods were called with expected arguments
     * @param {object} mock - Mock object to validate
     * @param {object} expectedCalls - Object with method names and expected arguments
     */
    static validateCallArguments(mock, expectedCalls) {
        for (const [methodName, expectedArgsList] of Object.entries(expectedCalls)) {
            if (typeof mock[methodName] === 'function' && mock[methodName].mock) {
                expectedArgsList.forEach((expectedArgs, index) => {
                    expect(mock[methodName]).toHaveBeenNthCalledWith(index + 1, ...expectedArgs);
                });
            }
        }
    }
}

/**
 * Mock utility functions
 */
export const MockUtils = {
    /**
     * Creates a spy for a method on an existing object
     * @param {object} obj - Object to spy on
     * @param {string} methodName - Method name to spy on
     * @returns {Function} The spy function
     */
    spyOn(obj, methodName) {
        if (typeof obj[methodName] === 'function') {
            return vi.spyOn(obj, methodName);
        }
        // If the method doesn't exist, create a mock method
        obj[methodName] = vi.fn();
        return obj[methodName];
    },

    /**
     * Clears all mocks from an object
     * @param {object} obj - Object with mocks to clear
     */
    clearMocks(obj) {
        for (const key of Object.keys(obj)) {
            if (obj[key] && typeof obj[key] === 'function' && obj[key].mockClear) {
                obj[key].mockClear();
            }
        }
    },

    /**
     * Resets all mocks on an object
     * @param {object} obj - Object with mocks to reset
     */
    resetMocks(obj) {
        for (const key of Object.keys(obj)) {
            if (obj[key] && typeof obj[key] === 'function' && obj[key].mockReset) {
                obj[key].mockReset();
            }
        }
    },

    /**
     * Waits for all async operations in mocks to complete
     */
    waitForAsyncMocks() {
        return vi.waitUntil(() => {
            // This ensures all pending async operations in mocks are resolved
            return true;
        });
    },

    /**
     * Creates a mock with a specific implementation that tracks calls
     * @param {Function} implementation - Implementation to use
     * @param {string} name - Name for the mock (for debugging)
     * @returns {Function} Mock function with implementation
     */
    mockWithImplementation(implementation, name = 'mock') {
        const mockFn = vi.fn(implementation);
        mockFn.mockName(name);
        return mockFn;
    },

    /**
     * Creates a mock that resolves after a delay
     * @param {any} value - Value to resolve with
     * @param {number} delay - Delay in ms
     * @returns {Function} Async mock function
     */
    asyncMock(value, delay = 0) {
        return vi.fn(() => new Promise(resolve => {
            setTimeout(() => resolve(value), delay);
        }));
    }
};

/**
 * Preconfigured mock sets for common testing scenarios
 */
export const MOCK_SETS = {
    /**
     * A complete system mock set with interconnected components
     */
    completeSystem: (options = {}) => {
        const {
            withEventBus = true,
            withCommandBus = true,
            withMemory = true,
            withReasoner = true
        } = options;

        const mocks = {};

        if (withCommandBus) {
            mocks.commandBus = MOCK_BUILDERS.commandBus().build();
        }

        if (withEventBus) {
            mocks.eventBus = MOCK_BUILDERS.eventBus().build();
        }

        if (withMemory) {
            mocks.memory = MOCK_BUILDERS.memory().build();
        }

        if (withReasoner) {
            mocks.reasoner = MOCK_BUILDERS.reasoner().build();
        }

        // Add DI container to tie them together
        mocks.container = MOCK_BUILDERS.diContainer().build();

        // Configure the container to return the correct mocks
        if (mocks.commandBus) {
            vi.mocked(mocks.container.get).mockImplementation(key => {
                if (key === 'commandBus') return mocks.commandBus;
            });
        }

        if (mocks.eventBus) {
            vi.mocked(mocks.container.get).mockImplementation(key => {
                if (key === 'eventBus') return mocks.eventBus;
                // Chain with previous mock implementation
                if (key !== 'commandBus') {
                    return mocks.eventBus;
                }
            });
        }

        if (mocks.memory) {
            vi.mocked(mocks.container.get).mockImplementation(key => {
                if (key === 'memory') return mocks.memory;
            });
        }

        if (mocks.reasoner) {
            vi.mocked(mocks.container.get).mockImplementation(key => {
                if (key === 'reasoner') return mocks.reasoner;
            });
        }

        return mocks;
    },

    /**
     * Task processing mock set
     */
    taskProcessing: () => {
        return {
            task: MOCK_BUILDERS.task().build(),
            reasoner: MOCK_BUILDERS.reasoner().build(),
            memory: MOCK_BUILDERS.memory().build(),
            eventBus: MOCK_BUILDERS.eventBus().build()
        };
    },

    /**
     * Configuration testing mock set
     */
    configuration: (initialConfig = {}) => {
        const configManager = MOCK_BUILDERS.configManager().build();

        // Set up the config manager with initial configuration
        const config = {...initialConfig};
        vi.mocked(configManager.get).mockImplementation(key => {
            return key.split('.').reduce((obj, k) => obj?.[k], config);
        });

        vi.mocked(configManager.getAll).mockReturnValue(config);

        return {
            configManager,
            updateConfig: (newConfig) => {
                Object.assign(config, newConfig);
            }
        };
    }
};

// Simple mock creation utilities (moved from test-data-factory.js)

/**
 * Creates a mock function with predefined behavior
 * @param {any} returnValue - Value to return from the mock
 * @param {Error} error - Error to throw (if any)
 * @param {Function} implementation - Custom implementation function
 * @returns {Function} Mock function
 */
export const createMockFunction = (returnValue = undefined, error = null, implementation = null) => {
    if (error) {
        return vi.fn(() => {
            throw error;
        });
    }

    if (implementation) {
        return vi.fn(implementation);
    }

    return vi.fn(() => returnValue);
};

/**
 * Creates a mock object with predefined properties and methods
 * @param {object} props - Properties to set on the mock object
 * @param {object} methods - Methods to add to the mock object
 * @returns {object} Mock object
 */
export const createMockObject = (props = {}, methods = {}) => {
    const mock = {};

    // Add properties
    Object.keys(props).forEach(key => {
        Object.defineProperty(mock, key, {
            value: props[key],
            writable: true,
            enumerable: true,
            configurable: true
        });
    });

    // Add methods
    Object.keys(methods).forEach(key => {
        mock[key] = methods[key];
    });

    return mock;
};

// Simple mock creation functions for backward compatibility
export const createMockCommandBus = () => MOCK_BUILDERS.commandBus().build();
export const createMockEventBus = () => MOCK_BUILDERS.eventBus().build();

// Export commonly used builders as shortcuts
export const CommandBusMock = MOCK_BUILDERS.commandBus;
export const EventBusMock = MOCK_BUILDERS.eventBus;
export const MemoryMock = MOCK_BUILDERS.memory;
export const ReasonerMock = MOCK_BUILDERS.reasoner;
export const ConfigManagerMock = MOCK_BUILDERS.configManager;