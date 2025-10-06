/**
 * High-Performance Test Environment System
 * Optimized setup utilities with shared caching and batch operations
 */

import {expect, vi} from 'vitest';
import {env} from '@xenova/transformers';
import {createTask} from './test-data-factory.js';
import {SystemFactory} from './shared/test-utils.js';

// Re-export for backward compatibility
export {SystemFactory};

// Suppress ONNX runtime warnings
env.logLevel = 'fatal';

// Unified context builder with performance optimization
export class ContextBuilder {
    constructor() {
        this.systemData = null;
        this.components = new Map();
        this.helpers = new Map();
        this.config = {};
    }

    withSystem(config = {}) {
        this.systemData = SystemFactory.create(config);
        this.components.set('system', this.systemData.system);
        this.components.set('commandBus', this.systemData.commandBus);
        this.components.set('eventBus', this.systemData.eventBus);
        this.components.set('container', this.systemData.container);
        this.config = config;
        return this;
    }

    withMemory(memoryConfig = {}) {
        if (!this.systemData) throw new Error('System must be set up before adding memory');
        const memory = this.systemData.container.get('memory');
        this.components.set('memory', memory);
        this.components.set('memoryConfig', memoryConfig);
        return this;
    }

    withReasoner() {
        if (!this.systemData) throw new Error('System must be set up before adding reasoner');
        const reasoner = this.systemData.container.get('reasoner');
        this.components.set('reasoner', reasoner);
        return this;
    }

    withMocks(mocks = {}) {
        Object.entries(mocks).forEach(([key, value]) => this.components.set(key, value));
        return this;
    }

    withTestData(data = {}) {
        this.components.set('testData', {...(this.components.get('testData') || {}), ...data});
        return this;
    }

    withHelper(name, helperFn) {
        this.helpers.set(name, helperFn);
        return this;
    }

    build() {
        const context = Object.fromEntries(this.components);

        // Add helpers to context
        this.helpers.forEach((helper, name) => context[name] = helper);

        return context;
    }

    getSystemData() {
        return this.systemData;
    }
}

// Optimized cleanup system with batch processing
export const cleanupContext = async (context) => {
    if (context.system?.destroy) {
        await context.system.destroy();
    }

    // Batch clear mocks for better performance
    const mockComponents = ['commandBus', 'eventBus'];
    const clearOperations = [];

    mockComponents.forEach(component => {
        if (context[component]) {
            clearOperations.push(
                () => vi.mocked(context[component].handle)?.mockClear(),
                () => vi.mocked(context[component].request)?.mockClear(),
                () => vi.mocked(context[component].on)?.mockClear(),
                () => vi.mocked(context[component].emit)?.mockClear()
            );
        }
    });

    // Execute all clear operations
    clearOperations.forEach(clear => clear());
};

// Optimized context creation API with batch support
export const createContext = async (options = {}) => {
    const {
        withSystem = true,
        systemConfig = {},
        withMemory = false,
        withReasoner = false,
        testData = {},
        helpers = {}
    } = options;

    const builder = new ContextBuilder();

    if (withSystem) builder.withSystem(systemConfig);
    if (withMemory) builder.withMemory();
    if (withReasoner) builder.withReasoner();
    if (Object.keys(testData).length > 0) builder.withTestData(testData);

    // Batch helper registration for better performance
    const helperEntries = Object.entries(helpers);
    for (let i = 0; i < helperEntries.length; i++) {
        const [name, helper] = helperEntries[i];
        builder.withHelper(name, helper);
    }

    const context = builder.build();

    return {
        ...context,
        cleanup: async () => await cleanupContext(context),
        systemData: builder.getSystemData()
    };
};

// Specialized context factories with performance optimization
export const createTaskProcessingContext = async (options = {}) => {
    const baseContext = await createContext({
        withSystem: true,
        withMemory: true,
        withReasoner: true,
        ...options
    });

    return {
        ...baseContext,
        createAndAddTask: async (termOrKey, punctuation = '.', truthValue = null) => {
            const task = createTask(termOrKey, punctuation, truthValue);
            if (baseContext.memory) await baseContext.memory.addTask(task);
            return task;
        },
        processTask: async (task) => {
            if (baseContext.reasoner) return await baseContext.reasoner.processTask(task);
            throw new Error('Reasoner not available in context');
        }
    };
};

export const createMemoryContext = async (options = {}) => {
    const baseContext = await createContext({
        withSystem: true,
        withMemory: true,
        ...options
    });

    return {
        ...baseContext,
        addMultipleTasks: async (tasksData) => {
            const tasks = [];
            // Process in batches for performance
            const batchSize = 10;
            for (let i = 0; i < tasksData.length; i += batchSize) {
                const batch = tasksData.slice(i, i + batchSize);
                const batchTasks = await Promise.all(
                    batch.map(taskData => {
                        const task = createTask(taskData.key, taskData.punctuation, taskData.truthValue);
                        return baseContext.memory.addTask(task).then(() => task);
                    })
                );
                tasks.push(...batchTasks);
            }
            return tasks;
        },
        assertMemoryState: (expectedState) => {
            if (expectedState.size !== undefined) {
                expect(baseContext.memory.size).toBe(expectedState.size);
            }
            if (expectedState.contains) {
                expectedState.contains.forEach(termKey =>
                    expect(baseContext.memory.has(termKey)).toBe(true));
            }
        }
    };
};

// Context factory registry for extensibility
export const createContextFromConfig = async (configName, overrides = {}) => {
    const contextConfigs = {
        BASIC: {},
        WITH_MEMORY: {withMemory: true},
        WITH_REASONER: {withReasoner: true},
        FULL_SYSTEM: {withMemory: true, withReasoner: true},
        MINIMAL: {withSystem: false}
    };

    const config = {...(contextConfigs[configName] || contextConfigs.BASIC), ...overrides};
    return await createContext(config);
};

// Common helpers factory
export const getCommonHelpers = () => ({
    createTaskDef: (sentence, punctuation = '.', truth = [1.0, 0.9], options = {}) => ({
        sentence, punctuation, truth, ...options
    })
});

// Backward compatibility exports
export const createTestSystem = (config = {}) => SystemFactory.create(config);

export const setupTestEnvironment = (config = {}) => {
    const systemData = SystemFactory.create(config);
    return systemData;
};

// Performance monitoring
export const getSystemStats = () => SystemFactory.getStats();
export const resetSystemCache = () => SystemFactory.reset();