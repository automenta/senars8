/**
 * Advanced Tool System for SeNARS
 * Provides comprehensive tool execution capabilities including web automation,
 * file operations, command execution, and multi-modal processing
 */

import { EventEmitter } from 'events';
import { debug, error as logError, info, warn } from '../utils/logger.js';
import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { SystemCommands } from '../system/SystemCommands.js';

const errorHandler = createUnifiedErrorHandler('ToolSystem');

class ToolSystem extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.tools = new Map();
        this.executors = new Map();
        this.activeExecutions = new Map();
        this.executionHistory = [];
        this.maxHistorySize = config.maxHistorySize || 1000;
        this.enableSandboxing = config.enableSandboxing ?? true;

        this.initializeExecutors();
        this.registerDefaultTools();

        info('ToolSystem initialized with sandboxing:', this.enableSandboxing);
    }

    initializeExecutors() {
        // Web automation executor
        this.executors.set('web', new WebAutomationExecutor(this.config.web || {}));

        // File operations executor
        this.executors.set('file', new FileOperationsExecutor(this.config.file || {}));

        // Command execution executor
        this.executors.set('command', new CommandExecutor(this.config.command || {}));

        // Media processing executor
        this.executors.set('media', new MediaProcessorExecutor(this.config.media || {}));

        // External API executor
        this.executors.set('api', new ApiExecutor(this.config.api || {}));
    }

    registerDefaultTools() {
        // Web automation tools
        this.registerTool({
            name: 'web_navigate',
            category: 'web',
            description: 'Navigate to a web page and extract content',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to navigate to' },
                    waitFor: { type: 'string', description: 'Selector to wait for' },
                    timeout: { type: 'number', description: 'Timeout in milliseconds', default: 30000 },
                    takeScreenshot: { type: 'boolean', description: 'Take a screenshot', default: true },
                    extractText: { type: 'boolean', description: 'Extract page text', default: true }
                },
                required: ['url']
            },
            handler: this.executors.get('web').navigate.bind(this.executors.get('web'))
        });

        this.registerTool({
            name: 'web_click',
            category: 'web',
            description: 'Click an element on the web page',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of element to click' },
                    waitForNavigation: { type: 'boolean', description: 'Wait for navigation', default: false },
                    timeout: { type: 'number', description: 'Timeout in milliseconds', default: 10000 }
                },
                required: ['selector']
            },
            handler: this.executors.get('web').click.bind(this.executors.get('web'))
        });

        this.registerTool({
            name: 'web_fill_form',
            category: 'web',
            description: 'Fill and submit a web form',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL of the page with the form' },
                    fields: {
                        type: 'object',
                        description: 'Object with field names as keys and values to fill',
                        additionalProperties: { type: 'string' }
                    },
                    submitSelector: { type: 'string', description: 'CSS selector for submit button' },
                    waitForNavigation: { type: 'boolean', description: 'Wait for navigation after submit', default: true }
                },
                required: ['url', 'fields']
            },
            handler: this.executors.get('web').fillForm.bind(this.executors.get('web'))
        });

        // File operation tools
        this.registerTool({
            name: 'file_read',
            category: 'file',
            description: 'Read file content with intelligent parsing',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path to read' },
                    encoding: { type: 'string', description: 'File encoding', default: 'utf8' },
                    maxSize: { type: 'number', description: 'Maximum file size in bytes', default: 10 * 1024 * 1024 }
                },
                required: ['path']
            },
            handler: this.executors.get('file').read.bind(this.executors.get('file'))
        });

        this.registerTool({
            name: 'file_write',
            category: 'file',
            description: 'Write content to file with backup and validation',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path to write' },
                    content: { type: 'string', description: 'Content to write' },
                    encoding: { type: 'string', description: 'File encoding', default: 'utf8' },
                    backup: { type: 'boolean', description: 'Create backup of existing file', default: true },
                    validateSyntax: { type: 'boolean', description: 'Validate syntax for code files', default: true }
                },
                required: ['path', 'content']
            },
            handler: this.executors.get('file').write.bind(this.executors.get('file'))
        });

        this.registerTool({
            name: 'file_edit',
            category: 'file',
            description: 'Intelligently edit file content',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'File path to edit' },
                    operations: {
                        type: 'array',
                        description: 'Array of edit operations',
                        items: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['replace', 'insert', 'delete'],
                                    description: 'Type of edit operation'
                                },
                                target: { type: 'string', description: 'Text to find or position' },
                                content: { type: 'string', description: 'Content for insert/replace operations' },
                                regex: { type: 'boolean', description: 'Use regex for target matching', default: false }
                            },
                            required: ['type', 'target']
                        }
                    },
                    backup: { type: 'boolean', description: 'Create backup before editing', default: true }
                },
                required: ['path', 'operations']
            },
            handler: this.executors.get('file').edit.bind(this.executors.get('file'))
        });

        // Command execution tools
        this.registerTool({
            name: 'command_execute',
            category: 'command',
            description: 'Execute system commands in sandboxed environment',
            parameters: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'Command to execute' },
                    args: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Command arguments',
                        default: []
                    },
                    cwd: { type: 'string', description: 'Working directory' },
                    timeout: { type: 'number', description: 'Timeout in milliseconds', default: 30000 },
                    env: {
                        type: 'object',
                        description: 'Environment variables',
                        additionalProperties: { type: 'string' }
                    },
                    allowedCommands: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Allowed commands (security override)'
                    }
                },
                required: ['command']
            },
            handler: this.executors.get('command').execute.bind(this.executors.get('command'))
        });

        // Media processing tools
        this.registerTool({
            name: 'media_process_pdf',
            category: 'media',
            description: 'Process PDF documents and extract content',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to PDF file' },
                    extractText: { type: 'boolean', description: 'Extract text content', default: true },
                    extractImages: { type: 'boolean', description: 'Extract images', default: false },
                    pageRange: {
                        type: 'object',
                        properties: {
                            start: { type: 'number', description: 'Start page (1-indexed)' },
                            end: { type: 'number', description: 'End page (1-indexed)' }
                        }
                    }
                },
                required: ['path']
            },
            handler: this.executors.get('media').processPDF.bind(this.executors.get('media'))
        });

        this.registerTool({
            name: 'media_process_image',
            category: 'media',
            description: 'Process images with OCR and analysis',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to image file' },
                    performOCR: { type: 'boolean', description: 'Perform OCR text extraction', default: true },
                    analyzeContent: { type: 'boolean', description: 'Analyze image content', default: true },
                    detectObjects: { type: 'boolean', description: 'Detect objects in image', default: false }
                },
                required: ['path']
            },
            handler: this.executors.get('media').processImage.bind(this.executors.get('media'))
        });

        // API tools
        this.registerTool({
            name: 'api_request',
            category: 'api',
            description: 'Make HTTP requests to external APIs',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Request URL' },
                    method: {
                        type: 'string',
                        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                        description: 'HTTP method',
                        default: 'GET'
                    },
                    headers: {
                        type: 'object',
                        description: 'Request headers',
                        additionalProperties: { type: 'string' }
                    },
                    body: { type: 'string', description: 'Request body' },
                    timeout: { type: 'number', description: 'Timeout in milliseconds', default: 30000 },
                    maxRedirects: { type: 'number', description: 'Maximum redirects', default: 5 }
                },
                required: ['url']
            },
            handler: this.executors.get('api').makeRequest.bind(this.executors.get('api'))
        });
    }

    registerTool(toolConfig) {
        const { name, category, description, parameters, handler } = toolConfig;

        if (!name || !handler) {
            throw new Error('Tool must have name and handler');
        }

        const tool = {
            name,
            category: category || 'general',
            description: description || '',
            parameters: parameters || { type: 'object', properties: {} },
            handler,
            createdAt: Date.now(),
            usageCount: 0,
            lastUsed: null
        };

        this.tools.set(name, tool);
        debug(`Registered tool: ${name} (${category})`);

        this.emit('tool:registered', tool);
    }

    async executeTool(toolName, parameters = {}, context = {}) {
        const tool = this.tools.get(toolName);

        if (!tool) {
            throw new Error(`Tool '${toolName}' not found`);
        }

        const executionId = this.generateExecutionId();
        const startTime = Date.now();

        info(`Executing tool: ${toolName} (execution: ${executionId})`);

        try {
            // Validate parameters
            const validation = this.validateParameters(parameters, tool.parameters);
            if (!validation.isValid) {
                throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
            }

            // Create execution context
            const executionContext = {
                executionId,
                toolName,
                parameters,
                context,
                startTime,
                user: context.user || 'system',
                session: context.session || null
            };

            // Store active execution
            this.activeExecutions.set(executionId, executionContext);

            // Emit start event
            this.emit('execution:started', executionContext);

            // Execute tool with timeout
            const result = await this.executeWithTimeout(
                tool.handler,
                parameters,
                context,
                context.timeout || 30000
            );

            // Update execution context
            executionContext.endTime = Date.now();
            executionContext.duration = executionContext.endTime - startTime;
            executionContext.result = result;
            executionContext.status = 'completed';

            // Update tool statistics
            tool.usageCount++;
            tool.lastUsed = Date.now();

            // Store in history
            this.addToHistory(executionContext);

            // Emit completion event
            this.emit('execution:completed', executionContext);

            info(`Tool execution completed: ${toolName} (${executionId}) in ${executionContext.duration}ms`);

            return {
                success: true,
                executionId,
                result,
                duration: executionContext.duration
            };

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            const errorContext = {
                executionId,
                toolName,
                parameters,
                error: error.message,
                stack: error.stack,
                duration,
                status: 'failed'
            };

            this.addToHistory(errorContext);
            this.emit('execution:failed', errorContext);

            logError(`Tool execution failed: ${toolName} (${executionId})`, error);

            return {
                success: false,
                executionId,
                error: error.message,
                duration
            };
        } finally {
            this.activeExecutions.delete(executionId);
        }
    }

    async executeWithTimeout(handler, parameters, context, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Tool execution timed out after ${timeout}ms`));
            }, timeout);

            Promise.resolve(handler(parameters, context))
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }

    validateParameters(parameters, schema) {
        // Simple JSON Schema validation
        const errors = [];

        if (schema.required) {
            for (const required of schema.required) {
                if (!(required in parameters)) {
                    errors.push(`Missing required parameter: ${required}`);
                }
            }
        }

        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in parameters) {
                    const value = parameters[key];

                    if (propSchema.type && typeof value !== propSchema.type) {
                        errors.push(`Parameter '${key}' must be of type ${propSchema.type}`);
                    }

                    if (propSchema.enum && !propSchema.enum.includes(value)) {
                        errors.push(`Parameter '${key}' must be one of: ${propSchema.enum.join(', ')}`);
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    addToHistory(execution) {
        this.executionHistory.push({
            ...execution,
            timestamp: Date.now()
        });

        // Maintain history size limit
        if (this.executionHistory.length > this.maxHistorySize) {
            this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
        }
    }

    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getTool(name) {
        return this.tools.get(name);
    }

    getToolsByCategory(category) {
        const tools = [];
        for (const tool of this.tools.values()) {
            if (tool.category === category) {
                tools.push(tool);
            }
        }
        return tools;
    }

    getAllTools() {
        return Array.from(this.tools.values());
    }

    getExecutionHistory(options = {}) {
        let history = [...this.executionHistory];

        if (options.toolName) {
            history = history.filter(exec => exec.toolName === options.toolName);
        }

        if (options.category) {
            history = history.filter(exec => {
                const tool = this.tools.get(exec.toolName);
                return tool && tool.category === options.category;
            });
        }

        if (options.limit) {
            history = history.slice(-options.limit);
        }

        return history;
    }

    getStatistics() {
        const stats = {
            totalTools: this.tools.size,
            toolsByCategory: {},
            totalExecutions: this.executionHistory.length,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            mostUsedTools: []
        };

        // Categorize tools
        for (const tool of this.tools.values()) {
            if (!stats.toolsByCategory[tool.category]) {
                stats.toolsByCategory[tool.category] = 0;
            }
            stats.toolsByCategory[tool.category]++;
        }

        // Execution statistics
        let totalTime = 0;
        const toolUsage = new Map();

        for (const execution of this.executionHistory) {
            if (execution.status === 'completed') {
                stats.successfulExecutions++;
                totalTime += execution.duration;
            } else if (execution.status === 'failed') {
                stats.failedExecutions++;
            }

            // Track tool usage
            const count = toolUsage.get(execution.toolName) || 0;
            toolUsage.set(execution.toolName, count + 1);
        }

        stats.averageExecutionTime = stats.successfulExecutions > 0
            ? Math.round(totalTime / stats.successfulExecutions)
            : 0;

        // Most used tools
        stats.mostUsedTools = Array.from(toolUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([toolName, count]) => ({ toolName, count }));

        return stats;
    }

    async shutdown() {
        info('Shutting down ToolSystem...');

        // Cancel active executions
        for (const [executionId, execution] of this.activeExecutions) {
            this.emit('execution:cancelled', { executionId, toolName: execution.toolName });
        }

        this.activeExecutions.clear();

        // Shutdown executors
        for (const executor of this.executors.values()) {
            if (typeof executor.shutdown === 'function') {
                await executor.shutdown();
            }
        }

        info('ToolSystem shutdown complete');
    }
}

export default ToolSystem;