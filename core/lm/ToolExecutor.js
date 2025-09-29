import ResourceManager from './ResourceManager.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('ToolExecutor');

/**
 * ToolExecutor manages the execution of tools with resource constraints
 * and integrates with the SeNARS memory system.
 */
class ToolExecutor {
  constructor(config = {}) {
    this.tools = new Map();
    this.config = config;
    this.executionHistory = [];
    this.resourceManager = new ResourceManager(config.resources || []);
    this.taskResultConverter = config.taskResultConverter || this._defaultTaskResultConverter;
  }

  /**
   * Register a tool with the executor
   * @param {string} name - Tool name
   * @param {Function} handler - Tool function
   * @param {Object} metadata - Tool metadata including resource requirements
   */
  registerTool(name, handler, metadata = {}) {
    this.tools.set(name, {
      name,
      handler,
      metadata: {
        description: metadata.description || '',
        resourceRequirements: metadata.resourceRequirements || {},
        safetyConstraints: metadata.safetyConstraints || [],
        ...metadata
      }
    });
  }

  /**
   * Execute a tool with resource management and safety checks
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} params - Parameters for the tool
   * @param {Object} context - Execution context including memory reference
   * @returns {Object} - Tool execution result
   */
  async execute(toolName, params = {}, context = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Check resource availability
    const resourcesAvailable = await this.resourceManager.checkAvailability(
      tool.metadata.resourceRequirements
    );

    if (!resourcesAvailable) {
      throw new Error(`Insufficient resources to execute ${toolName}`);
    }

    // Check safety constraints
    const safeToExecute = this._checkSafetyConstraints(tool, params);
    if (!safeToExecute) {
      throw new Error(`Safety constraints violated for tool: ${toolName}`);
    }

    // Reserve resources
    await this.resourceManager.reserve(tool.metadata.resourceRequirements);

    const startTime = Date.now();
    let result;

    try {
      // Execute the tool
      result = await tool.handler(params, context);
      
      // Log successful execution
      this._logExecution({
        toolName,
        params,
        result,
        startTime,
        endTime: Date.now(),
        status: 'success'
      });

      // Add result to memory if context is provided
      if (context.memory && result) {
        await this._storeResultInMemory(context.memory, toolName, result, params);
      }

      return result;
    } catch (error) {
      // Log failed execution
      this._logExecution({
        toolName,
        params,
        error: error.message,
        startTime,
        endTime: Date.now(),
        status: 'error'
      });

      throw error;
    } finally {
      // Release resources
      await this.resourceManager.release(tool.metadata.resourceRequirements);
    }
  }

  /**
   * Execute a chain of tools
   * @param {Array} toolChain - Array of {name, params} objects
   * @param {Object} context - Execution context
   * @returns {Array} - Array of results from each tool execution
   */
  async executeChain(toolChain, context = {}) {
    const results = [];
    let currentContext = { ...context };

    for (const toolItem of toolChain) {
      const { name, params } = toolItem;
      const result = await this.execute(name, params, currentContext);
      results.push(result);

      // Update context with result for next tool
      currentContext = {
        ...currentContext,
        previousResult: result,
        executionHistory: results
      };
    }

    return results;
  }

  _checkSafetyConstraints(tool, params) {
    // Implement safety constraint checking
    // This could include checking for dangerous operations, etc.
    const constraints = tool.metadata.safetyConstraints || [];
    
    for (const constraint of constraints) {
      if (typeof constraint === 'function' && !constraint(params)) {
        return false;
      }
    }
    
    return true;
  }

  _logExecution(logEntry) {
    this.executionHistory.push({
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...logEntry
    });
  }

  async _storeResultInMemory(memory, toolName, result, params) {
    // Convert tool result to a SeNARS task for storage in memory
    const task = this.taskResultConverter(toolName, result, params);
    if (task && memory.addTasks) {
      memory.addTasks([task]);
    }
  }

  _defaultTaskResultConverter(toolName, result, params) {
    // Default implementation - in a real system this would create proper SeNARS tasks
    return null;
  }

  getExecutionHistory() {
    return [...this.executionHistory];
  }

  getToolInfo(toolName) {
    return this.tools.get(toolName) || null;
  }

  getToolNames() {
    return Array.from(this.tools.keys());
  }

  hasTool(toolName) {
    return this.tools.has(toolName);
  }

  removeTool(toolName) {
    return this.tools.delete(toolName);
  }

  getResourceManager() {
    return this.resourceManager;
  }
}

export default ToolExecutor;