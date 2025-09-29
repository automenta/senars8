import { DynamicTool } from "@langchain/core/tools";
import { formatToOpenAIFunction } from "langchain/tools";
import { createUnifiedErrorHandler } from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('ToolRegistry');

/**
 * ToolRegistry manages LangChain-compatible tools with lifecycle management
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.toolFunctions = new Map(); // Cache for OpenAI function format
  }

  /**
   * Register a SeNARS task as a LangChain tool
   * @param {Object} task - The SeNARS task to be registered as a tool
   * @param {Function} handler - The function to execute when the tool is called
   * @returns {Object} - The registered tool
   */
  registerTaskAsTool(task, handler) {
    const tool = new DynamicTool({
      name: this._sanitizeToolName(task.termKey),
      description: task.termKey,
      func: async (input) => {
        try {
          const result = await handler(input);
          return JSON.stringify(result);
        } catch (error) {
          return JSON.stringify({ error: error.message });
        }
      }
    });

    this.tools.set(tool.name, tool);
    this._invalidateToolFunctionsCache();
    
    return tool;
  }

  /**
   * Register a standard LangChain tool
   * @param {Object} toolSpec - Tool specification in LangChain format
   * @returns {Object} - The registered tool
   */
  registerLangChainTool(toolSpec) {
    let tool;
    
    if (toolSpec instanceof DynamicTool) {
      tool = toolSpec;
    } else {
      // Convert standard tool specification to DynamicTool
      tool = new DynamicTool({
        name: toolSpec.name,
        description: toolSpec.description,
        func: toolSpec.func || toolSpec.handler
      });
    }
    
    this.tools.set(tool.name, tool);
    this._invalidateToolFunctionsCache();
    
    return tool;
  }

  /**
   * Get a tool by name
   * @param {string} name - The tool name
   * @returns {Object|null} - The tool or null if not found
   */
  getTool(name) {
    return this.tools.get(name) || null;
  }

  /**
   * Check if a tool exists
   * @param {string} name - The tool name
   * @returns {boolean} - Whether the tool exists
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   * @returns {Array} - Array of all registered tools
   */
  getTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Get registered tools in OpenAI function format for tool calling
   * @returns {Array} - Array of function definitions for LLM tool calling
   */
  getToolFunctions() {
    if (this.toolFunctions.size === 0) {
      // Build the cache if it's empty
      for (const [name, tool] of this.tools) {
        const func = formatToOpenAIFunction(tool);
        this.toolFunctions.set(name, func);
      }
    }
    
    return Array.from(this.toolFunctions.values());
  }

  /**
   * Convert SeNARS tasks to LangChain function format for tool calling
   * @param {Array} tasks - Array of SeNARS tasks
   * @returns {Array} - Array of LangChain function definitions
   */
  convertTasksToFunctions(tasks) {
    return tasks.map(task => {
      return {
        name: this._sanitizeToolName(task.termKey),
        description: task.termKey,
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Input for the task"
            }
          },
          required: ["query"]
        }
      };
    });
  }

  /**
   * Execute a chain of tools with inputs
   * @param {Array} toolNames - Array of tool names to execute in sequence
   * @param {Object} inputs - Initial inputs to the tool chain
   * @returns {Object} - Final result of the tool chain
   */
  async executeToolChain(toolNames, inputs) {
    let currentInput = inputs;
    
    for (const toolName of toolNames) {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      
      currentInput = await tool.invoke(currentInput);
    }
    
    return currentInput;
  }

  /**
   * Remove a tool by name
   * @param {string} name - The tool name to remove
   * @returns {boolean} - Whether the tool was removed
   */
  removeTool(name) {
    const removed = this.tools.delete(name);
    if (removed) {
      this.toolFunctions.delete(name);
    }
    return removed;
  }

  /**
   * Clear all tools
   */
  clear() {
    this.tools.clear();
    this.toolFunctions.clear();
  }

  /**
   * Get tool count
   * @returns {number} - Number of registered tools
   */
  getToolCount() {
    return this.tools.size;
  }

  _sanitizeToolName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  _invalidateToolFunctionsCache() {
    this.toolFunctions.clear();
  }
}

export default ToolRegistry;