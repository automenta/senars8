/**
 * High-quality SystemContext for providing controlled access to system components
 * This refactored version improves maintainability, safety, and extensibility
 */

import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { warn, debug, error as logError } from '../utils/logger.js';

const errorHandler = createUnifiedErrorHandler('SystemContext');

export class SystemContext {
  /**
   * Creates a new SystemContext
   * @param {object} systemComponents - Object containing system components like memory, reasoner, etc.
   */
  constructor(systemComponents = {}) {
    // Protected system components with validation
    this._memory = systemComponents.memory || null;
    this._config = systemComponents.config || {};
    this._eventBus = systemComponents.eventBus || null;
    this._commandBus = systemComponents.commandBus || null;
    this._lm = systemComponents.lm || null;
    this._perception = systemComponents.perception || null;
    this._planner = systemComponents.planner || null;
    this._metaCognition = systemComponents.metaCognition || null;
    this._reasoner = systemComponents.reasoner || null;
    this._taskFactory = systemComponents.taskFactory || null;
    this._system = systemComponents.system || null; // Reference to the main system
    
    // Performance and tracking
    this._accessCount = new Map();
    this._lastAccess = new Map();
  }

  // ========================================================================
  // Memory Access Methods
  // ========================================================================

  /**
   * Retrieves tasks of a specific type from memory
   * @param {string} type - Task type ('belief', 'goal', 'question')
   * @param {object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of tasks to return
   * @param {number} [options.minPriority] - Minimum priority threshold
   * @returns {Task[]} - Matching tasks
   */
  getTasksByType(type, options = {}) {
    this._trackAccess('getTasksByType');
    
    if (!this._memory) {
      this._logMissingComponent('memory');
      return [];
    }
    
    const { limit, minPriority } = options;
    let tasks = [];

    switch (type) {
      case 'belief':
        tasks = this._memory.getBeliefs ? this._memory.getBeliefs() : [];
        break;
      case 'goal':
        tasks = this._memory.getGoals ? this._memory.getGoals() : [];
        break;
      case 'question':
        tasks = this._memory.getQuestions ? this._memory.getQuestions() : [];
        break;
      default:
        warn(`Unknown task type requested: ${type}`);
        return [];
    }

    // Apply filters if specified
    if (typeof minPriority === 'number') {
      tasks = tasks.filter(task => (task.state?.priority || 0) >= minPriority);
    }

    if (typeof limit === 'number' && limit > 0) {
      tasks = tasks.slice(0, limit);
    }

    return tasks;
  }

  /**
   * Adds a task to the system's memory
   * @param {Task} task - The task to add
   * @returns {Promise<boolean>} - Whether the task was successfully added
   */
  async addTask(task) {
    this._trackAccess('addTask');
    
    if (!this._memory || !this._memory.addTask) {
      this._logMissingComponent('memory');
      throw new Error('Memory component not available or does not support adding tasks');
    }
    
    try {
      const result = await this._memory.addTask(task);
      return result;
    } catch (error) {
      logError('Error adding task to memory:', error);
      throw error;
    }
  }

  /**
   * Gets all tasks from memory
   * @param {object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of tasks to return
   * @returns {Task[]} - All tasks in memory
   */
  getAllTasks(options = {}) {
    this._trackAccess('getAllTasks');
    
    if (!this._memory || !this._memory.getAllTasks) {
      this._logMissingComponent('memory');
      return [];
    }

    let tasks = this._memory.getAllTasks();
    
    if (typeof options.limit === 'number' && options.limit > 0) {
      tasks = tasks.slice(0, options.limit);
    }

    return tasks;
  }

  // ========================================================================
  // Reasoning Methods
  // ========================================================================

  /**
   * Executes a reasoning step with a given task
   * @param {Task} task - The task to process
   * @param {object} [options] - Reasoning options
   * @returns {Promise<TaskResult>} - The result of the reasoning operation
   */
  async executeReasoningStep(task, options = {}) {
    this._trackAccess('executeReasoningStep');
    
    if (!this._reasoner || !this._reasoner.performInference) {
      this._logMissingComponent('reasoner');
      throw new Error('Reasoner not available or does not support reasoning operations');
    }

    try {
      // Default options for reasoning
      const defaultOptions = {
        maxDerivedTasks: 10,
        enableModularReasoning: true,
        enableSymbolicReasoning: true,
        enableTemporalReasoning: true
      };

      const reasoningOptions = { ...defaultOptions, ...options };
      
      // Perform inference with focus set containing just this task
      const results = await this._reasoner.performInference([task], reasoningOptions);
      
      return {
        inferredTasks: results,
        executionStats: {
          strategyName: 'SystemContext.executeReasoningStep',
          executionTime: Date.now(),
          success: true
        },
        success: true
      };
    } catch (error) {
      logError('Error executing reasoning step:', error);
      return {
        inferredTasks: [],
        executionStats: {
          strategyName: 'SystemContext.executeReasoningStep',
          executionTime: Date.now(),
          success: false,
          error: error.message
        },
        success: false,
        errorMessage: error.message
      };
    }
  }

  /**
   * Performs reasoning on a set of tasks
   * @param {Task[]} focusSet - Set of tasks to reason about
   * @param {object} [options] - Reasoning options
   * @returns {Promise<Task[]>} - Results of the reasoning operation
   */
  async performReasoning(focusSet, options = {}) {
    this._trackAccess('performReasoning');
    
    if (!Array.isArray(focusSet)) {
      throw new Error('focusSet must be an array of tasks');
    }

    if (!this._reasoner || !this._reasoner.performInference) {
      this._logMissingComponent('reasoner');
      throw new Error('Reasoner not available or does not support reasoning operations');
    }

    try {
      const results = await this._reasoner.performInference(focusSet, options);
      return results;
    } catch (error) {
      logError('Error performing reasoning:', error);
      throw error;
    }
  }

  // ========================================================================
  // Configuration Methods
  // ========================================================================

  /**
   * Gets the current system configuration value
   * @param {string} key - Configuration key (can use dot notation for nested values)
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} - Configuration value
   */
  getConfig(key, defaultValue = undefined) {
    this._trackAccess('getConfig');
    
    if (!key || typeof key !== 'string') {
      return defaultValue;
    }

    // Support dot notation for nested config access
    const keys = key.split('.');
    let value = this._config;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Updates configuration value (if allowed)
   * @param {string} key - Configuration key
   * @param {*} value - New value
   * @returns {boolean} - Whether update was successful
   */
  updateConfig(key, value) {
    this._trackAccess('updateConfig');
    
    if (!key || typeof key !== 'string') {
      return false;
    }

    // For security, only allow updates to specific config paths
    // This prevents strategies from modifying critical system settings
    const allowedPaths = ['strategy.', 'reasoning.', 'temporal.', 'lm.'];
    
    const isAllowed = allowedPaths.some(path => key.startsWith(path));
    if (!isAllowed) {
      warn(`Configuration update blocked for key: ${key} (not in allowed paths)`);
      return false;
    }

    // Navigate to the parent object
    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this._config;

    for (const k of keys) {
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    target[lastKey] = value;
    return true;
  }

  // ========================================================================
  // Communication Methods
  // ========================================================================

  /**
   * Emits an event through the event bus
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @param {object} [options] - Event options
   * @param {boolean} [options.ignoreErrors=false] - Whether to ignore emission errors
   */
  emitEvent(event, data, options = {}) {
    this._trackAccess('emitEvent');
    
    if (!this._eventBus || !this._eventBus.emit) {
      this._logMissingComponent('eventBus');
      if (!options.ignoreErrors) {
        throw new Error('Event bus not available or does not support emitting events');
      }
      return;
    }

    try {
      this._eventBus.emit(event, data);
    } catch (error) {
      logError(`Error emitting event "${event}":`, error);
      if (!options.ignoreErrors) {
        throw error;
      }
    }
  }

  /**
   * Executes a command through the command bus
   * @param {string} command - Command name/type
   * @param {object} payload - Command payload
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @returns {Promise<any>} - Command result
   */
  async executeCommand(command, payload, timeout = 5000) {
    this._trackAccess('executeCommand');

    if (!this._commandBus) {
      this._logMissingComponent('commandBus');
      throw new Error('Command bus not available');
    }

    if (typeof this._commandBus.execute !== 'function') {
      throw new Error('Command bus does not support command execution');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Command "${command}" timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = this._commandBus.execute(command, payload);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // ========================================================================
  // Task Creation Methods
  // ========================================================================

  /**
   * Creates a new task using the task factory
   * @param {string|object} term - The term for the task
   * @param {string} punctuation - The punctuation ('.', '?', '!')
   * @param {object} truthValue - The truth value for the task
   * @param {object} [stamp] - Optional stamp information
   * @returns {Task} - The created task
   */
  createTask(term, punctuation, truthValue = {}, stamp = {}) {
    this._trackAccess('createTask');
    
    if (!this._taskFactory) {
      this._logMissingComponent('taskFactory');
      throw new Error('TaskFactory not available');
    }

    try {
      return this._taskFactory.createTask(term, punctuation, truthValue, stamp);
    } catch (error) {
      logError('Error creating task:', error);
      throw error;
    }
  }

  // ========================================================================
  // Component Access Methods (with safety checks)
  // ========================================================================

  /**
   * Gets safe access to the language model component
   * @returns {object|null} - The LM component or null if not available
   */
  getLM() {
    this._trackAccess('getLM');
    return this._lm || null;
  }

  /**
   * Gets safe access to the planner component
   * @returns {object|null} - The planner component or null if not available
   */
  getPlanner() {
    this._trackAccess('getPlanner');
    return this._planner || null;
  }

  /**
   * Gets safe access to the perception component
   * @returns {object|null} - The perception component or null if not available
   */
  getPerception() {
    this._trackAccess('getPerception');
    return this._perception || null;
  }

  /**
   * Gets safe access to the meta-cognition component
   * @returns {object|null} - The meta-cognition component or null if not available
   */
  getMetaCognition() {
    this._trackAccess('getMetaCognition');
    return this._metaCognition || null;
  }

  /**
   * Gets safe access to the main system
   * @returns {object|null} - The main system or null if not available
   */
  getSystem() {
    this._trackAccess('getSystem');
    return this._system || null;
  }

  // ========================================================================
  // Internal Helper Methods
  // ========================================================================

  /**
   * Tracks access to methods for monitoring purposes
   * @private
   * @param {string} method - Method being accessed
   */
  _trackAccess(method) {
    const count = this._accessCount.get(method) || 0;
    this._accessCount.set(method, count + 1);
    this._lastAccess.set(method, Date.now());
  }

  /**
   * Logs a warning when a required component is missing
   * @private
   * @param {string} componentName - Name of the missing component
   */
  _logMissingComponent(componentName) {
    warn(`SystemContext: Required component "${componentName}" is not available`);
  }

  /**
   * Gets statistics about this context's usage
   * @returns {object} Usage statistics
   */
  getStats() {
    return {
      accessCounts: Object.fromEntries(this._accessCount.entries()),
      lastAccessTimes: Object.fromEntries(this._lastAccess.entries()),
      hasMemory: !!this._memory,
      hasEventBus: !!this._eventBus,
      hasCommandBus: !!this._commandBus,
      hasReasoner: !!this._reasoner
    };
  }
}