import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('Tools');

/**
 * Centralized tool management for the SeNARS system.
 * Handles registration, execution, and management of various tools including
 * native, remote (MCP), and external library tools.
 */
class Tools {
    constructor() {
        this.tools = new Map();
        this.mcpTools = new Map(); // Model Context Protocol tools
        this.externalTools = new Map(); // Tools from external libraries
        this.toolHistory = [];
    }

    /**
     * Register a native tool
     * @param {string} name - The name of the tool
     * @param {Function} handler - The function to execute the tool
     * @param {Object} metadata - Additional metadata about the tool
     */
    registerTool(name, handler, metadata = {}) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Tool name must be a non-empty string');
        }
        if (typeof handler !== 'function') {
            throw new Error(`Tool handler for ${name} must be a function`);
        }

        // Check for duplicate tool names
        if (this.tools.has(name) || this.mcpTools.has(name) || this.externalTools.has(name)) {
            throw new Error(`Tool with name '${name}' already exists`);
        }

        this.tools.set(name, {
            name,
            handler,
            metadata,
            type: 'native'
        });
        errorHandler.executeSync(() => {
            // Simple logging instead of using debug method
            console.debug && console.debug(`Tools: Registered tool: ${name}`);
        }, `registerTool: ${name}`);
    }

    /**
     * Register an MCP (Model Context Protocol) tool
     * @param {string} name - The name of the MCP tool
     * @param {Object} mcpConfig - Configuration for MCP tool
     */
    registerMcpTool(name, mcpConfig) {
        this.mcpTools.set(name, {
            name,
            config: mcpConfig,
            type: 'mcp'
        });
        errorHandler.executeSync(() => {
            console.debug && console.debug(`Tools: Registered MCP tool: ${name}`);
        }, `registerMcpTool: ${name}`);
    }

    /**
     * Register an external library tool
     * @param {string} name - The name of the external tool
     * @param {Object} toolInstance - The external tool instance
     */
    registerExternalTool(name, toolInstance) {
        this.externalTools.set(name, {
            name,
            instance: toolInstance,
            type: 'external'
        });
        errorHandler.executeSync(() => {
            console.debug && console.debug(`Tools: Registered external tool: ${name}`);
        }, `registerExternalTool: ${name}`);
    }

    /**
     * Execute a tool by name with provided arguments
     * @param {string} toolName - The name of the tool to execute
     * @param {Array} args - Arguments to pass to the tool
     * @param {Object} context - Additional execution context
     * @returns {Promise<any>} - The result of tool execution
     */
    async executeTool(toolName, args = [], context = {}) {
        if (typeof toolName !== 'string' || !toolName.trim()) {
            throw new Error('Tool name must be a non-empty string');
        }

        if (!Array.isArray(args)) {
            throw new Error('Arguments must be an array');
        }

        const tool = this._findTool(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }

        const executionId = this._generateExecutionId();
        const startTime = Date.now();

        try {
            let result;

            if (tool.type === 'native') {
                result = await tool.handler(...args, context);
            } else if (tool.type === 'mcp') {
                // Simulate MCP tool execution (in a real system, this would interface with MCP)
                result = await this._executeMcpTool(tool, args, context);
            } else if (tool.type === 'external') {
                // Execute external tool
                result = await this._executeExternalTool(tool, args, context);
            } else {
                throw new Error(`Unknown tool type: ${tool.type}`);
            }

            const endTime = Date.now();

            this.toolHistory.push({
                id: executionId,
                toolName,
                args,
                result,
                startTime,
                endTime,
                duration: endTime - startTime,
                status: 'success'
            });

            errorHandler.executeSync(() => {
                console.debug && console.debug(`Tools: Tool ${toolName} executed successfully in ${endTime - startTime}ms`);
            }, `executeToolSuccess: ${toolName}`);

            return result;
        } catch (error) {
            const endTime = Date.now();
            this.toolHistory.push({
                id: executionId,
                toolName,
                args,
                error: error.message,
                startTime,
                endTime,
                duration: endTime - startTime,
                status: 'error'
            });

            errorHandler.executeSync(() => {
                console.error && console.error(`Tools: Tool ${toolName} execution failed: ${error.message}`);
            }, `executeToolError: ${toolName}`);
            throw error;
        }
    }

    /**
     * Execute an MCP tool
     * @private
     */
    async _executeMcpTool(tool, args, context) {
        // In a real implementation, this would interface with the Model Context Protocol
        // For now, we'll simulate a basic implementation
        const {config} = tool;
        if (config.simulator) {
            return await config.simulator(...args, context);
        }
        throw new Error(`MCP tool ${tool.name} has no simulator configured`);
    }

    /**
     * Execute an external tool
     * @private
     */
    async _executeExternalTool(tool, args, context) {
        const {instance} = tool;
        if (instance.execute) {
            return await instance.execute(...args, context);
        } else if (typeof instance === 'function') {
            return await instance(...args, context);
        }
        throw new Error(`External tool ${tool.name} has no executable method`);
    }

    /**
     * Find a tool by name, checking all tool types
     * @private
     */
    _findTool(name) {
        if (this.tools.has(name)) return this.tools.get(name);
        if (this.mcpTools.has(name)) return this.mcpTools.get(name);
        if (this.externalTools.has(name)) return this.externalTools.get(name);
        return null;
    }

    /**
     * Get information about all registered tools
     * @returns {Object} Object containing tool lists by type
     */
    getToolInfo() {
        return {
            native: Array.from(this.tools.values()).map(tool => ({
                name: tool.name,
                metadata: tool.metadata
            })),
            mcp: Array.from(this.mcpTools.values()).map(tool => ({
                name: tool.name,
                config: tool.config
            })),
            external: Array.from(this.externalTools.values()).map(tool => ({
                name: tool.name
            }))
        };
    }

    /**
     * Get execution history
     * @returns {Array} Tool execution history
     */
    getExecutionHistory() {
        return this.toolHistory;
    }

    /**
     * Clear execution history
     */
    clearExecutionHistory() {
        this.toolHistory = [];
    }

    /**
     * Generate a unique execution ID
     * @private
     */
    _generateExecutionId() {
        return `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get all tool names
     * @returns {string[]} Array of tool names
     */
    getToolNames() {
        return [
            ...Array.from(this.tools.keys()),
            ...Array.from(this.mcpTools.keys()),
            ...Array.from(this.externalTools.keys())
        ];
    }
}

export default Tools;