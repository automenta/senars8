/**
 * Generic Test Setup Utilities
 * Consolidated setup patterns to reduce duplication across test files
 */

import { vi, expect } from 'vitest';
import { createTestSystem } from './test-helpers.js';
import { createTask, createTerm } from './test-data-factory.js';

/**
 * Common test context builder to consolidate setup patterns
 */
export class TestContextBuilder {
  constructor() {
    this.context = {};
    this.systemData = null;
    this.config = {};
  }

  /**
   * Sets up a basic system context
   * @param {object} config - System configuration
   * @returns {TestContextBuilder} Current instance for chaining
   */
  withSystem(config = {}) {
    this.systemData = createTestSystem(config);
    this.context = {
      ...this.context,
      system: this.systemData.system,
      commandBus: this.systemData.commandBus,
      eventBus: this.systemData.eventBus,
      container: this.systemData.container,
      config
    };
    return this;
  }

  /**
   * Adds memory component to the context
   * @param {object} memoryConfig - Memory configuration
   * @returns {TestContextBuilder} Current instance for chaining
   */
  withMemory(memoryConfig = {}) {
    if (!this.systemData) {
      throw new Error('System must be set up before adding memory');
    }
    
    const memory = this.systemData.container.get('memory');
    this.context.memory = memory;
    this.context.memoryConfig = memoryConfig;
    
    return this;
  }

  /**
   * Adds reasoner component to the context
   * @returns {TestContextBuilder} Current instance for chaining
   */
  withReasoner() {
    if (!this.systemData) {
      throw new Error('System must be set up before adding reasoner');
    }
    
    const reasoner = this.systemData.container.get('reasoner');
    this.context.reasoner = reasoner;
    
    return this;
  }

  /**
   * Adds mock components to the context
   * @param {object} mocks - Mock objects to add to context
   * @returns {TestContextBuilder} Current instance for chaining
   */
  withMocks(mocks = {}) {
    this.context = {
      ...this.context,
      ...mocks
    };
    return this;
  }

  /**
   * Adds test data to the context
   * @param {object} data - Test data to add
   * @returns {TestContextBuilder} Current instance for chaining
   */
  withTestData(data = {}) {
    this.context.testData = {
      ...this.context.testData,
      ...data
    };
    return this;
  }

  /**
   * Builds and returns the final context
   * @returns {object} The complete test context
   */
  build() {
    return this.context;
  }

  /**
   * Sets the configuration for the builder
   * @param {object} config - Configuration to set
   * @returns {TestContextBuilder} Current instance for chaining
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Gets the system data for cleanup purposes
   * @returns {object} System data with cleanup capabilities
   */
  getSystemData() {
    return this.systemData;
  }
}

/**
 * Generic cleanup utility
 * @param {object} context - Test context containing system and other resources
 */
export const cleanupTestContext = async (context) => {
  if (context.system && context.system.destroy) {
    await context.system.destroy();
  }
  
  // Clear any mocks
  if (context.commandBus) {
    vi.mocked(context.commandBus.handle).mockClear();
    vi.mocked(context.commandBus.request).mockClear();
  }
  
  if (context.eventBus) {
    vi.mocked(context.eventBus.on).mockClear();
    vi.mocked(context.eventBus.emit).mockClear();
  }
};

/**
 * Creates a test context with common components based on needs
 * @param {object} options - Configuration options
 * @returns {object} Setup context with cleanup function
 */
export const createTestContext = async (options = {}) => {
  const {
    withSystem = true,
    systemConfig = {},
    withMemory = false,
    withReasoner = false,
    testData = {}
  } = options;

  const builder = new TestContextBuilder();

  if (withSystem) {
    builder.withSystem(systemConfig);
  }

  if (withMemory) {
    builder.withMemory();
  }

  if (withReasoner) {
    builder.withReasoner();
  }

  if (Object.keys(testData).length > 0) {
    builder.withTestData(testData);
  }

  const context = builder.build();

  return {
    ...context,
    cleanup: async () => await cleanupTestContext(context),
    systemData: builder.getSystemData()
  };
};

/**
 * Creates a task processing context with common components
 * @param {object} options - Configuration options
 * @returns {object} Task processing context with helper functions
 */
export const createTaskProcessingContext = async (options = {}) => {
  const baseContext = await createTestContext({
    withSystem: true,
    withMemory: true,
    withReasoner: true,
    ...options
  });

  return {
    ...baseContext,
    /**
     * Helper to create and add a task to memory
     * @param {string|Term} termOrKey - Term or key for the task
     * @param {string} punctuation - Punctuation for the task
     * @param {object} truthValue - Truth value for the task
     * @returns {object} The created task
     */
    createAndAddTask: async (termOrKey, punctuation = '.', truthValue = null) => {
      const task = createTask(termOrKey, punctuation, truthValue);
      if (baseContext.memory) {
        await baseContext.memory.addTask(task);
      }
      return task;
    },

    /**
     * Helper to process a task with the reasoner
     * @param {object} task - The task to process
     * @returns {any} Processing result
     */
    processTask: async (task) => {
      if (baseContext.reasoner) {
        return await baseContext.reasoner.processTask(task);
      }
      throw new Error('Reasoner not available in context');
    }
  };
};

/**
 * Memory-specific test context
 * @param {object} options - Configuration options
 * @returns {object} Memory context with helper functions
 */
export const createMemoryContext = async (options = {}) => {
  const baseContext = await createTestContext({
    withSystem: true,
    withMemory: true,
    ...options
  });

  return {
    ...baseContext,
    /**
     * Helper to add multiple tasks to memory
     * @param {Array} tasksData - Array of task definition objects
     * @returns {Array} Array of created tasks
     */
    addMultipleTasks: async (tasksData) => {
      const tasks = [];
      for (const taskData of tasksData) {
        const task = createTask(taskData.key, taskData.punctuation, taskData.truthValue);
        await baseContext.memory.addTask(task);
        tasks.push(task);
      }
      return tasks;
    },

    /**
     * Helper to assert memory state
     * @param {object} expectedState - Expected state to verify
     */
    assertMemoryState: (expectedState) => {
      if (expectedState.hasOwnProperty('size')) {
        expect(baseContext.memory.size).toBe(expectedState.size);
      }
      if (expectedState.hasOwnProperty('contains')) {
        for (const termKey of expectedState.contains) {
          expect(baseContext.memory.has(termKey)).toBe(true);
        }
      }
    }
  };
};

/**
 * Configuration for different types of test contexts
 */
export const TEST_CONTEXT_CONFIGS = {
  BASIC: {},
  WITH_MEMORY: { withMemory: true },
  WITH_REASONER: { withReasoner: true },
  FULL_SYSTEM: { withMemory: true, withReasoner: true },
  MINIMAL: { withSystem: false }
};

/**
 * Creates a context based on predefined configuration
 * @param {string} configName - Name of the predefined configuration
 * @param {object} overrides - Configuration overrides
 * @returns {object} Test context
 */
export const createContextFromConfig = async (configName, overrides = {}) => {
  const config = {
    ...TEST_CONTEXT_CONFIGS[configName] || TEST_CONTEXT_CONFIGS.BASIC,
    ...overrides
  };
  
  return await createTestContext(config);
};