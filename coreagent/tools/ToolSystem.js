/**
 * Advanced Tool System for SeNARS
 * Provides comprehensive tool execution capabilities including web automation,
 * file operations, command execution, and multi-modal processing
 */

import {debug, error as logError, info} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import WebAutomationExecutor from './executors/WebAutomationExecutor.js';
import FileOperationsExecutor from './executors/FileOperationsExecutor.js';
import CommandExecutor from './executors/CommandExecutor.js';
import MediaProcessorExecutor from './executors/MediaProcessorExecutor.js';
import ApiExecutor from './executors/ApiExecutor.js';
import Component from '../Component.js';

const errorHandler = createUnifiedErrorHandler('ToolSystem');

class ToolSystem extends Component {
    constructor(core, config = {}) {
        super('tools', core);
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

    setupHandlers() {
        // Register tool execution handlers
        this.core.messages.handle('tools:execute', (data) => this.executeTool(data.toolName, data.parameters, data.context));
        this.core.messages.handle('tools:get', (toolName) => this.getTool(toolName));
        this.core.messages.handle('tools:list', () => this.getAllTools());
        this.core.messages.handle('tools:getStats', () => this.getStatistics());
        this.core.messages.handle('tools:getHistory', (options) => this.getExecutionHistory(options));
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
        this.registerWebTools();
        this.registerFileTools();
        this.registerCommandTools();
        this.registerMediaTools();
        this.registerApiTools();
    }

    registerWebTools() {
        const webTools = [
            {
                name: 'web_navigate',
                description: 'Navigate to a web page and extract content',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {type: 'string', description: 'URL to navigate to'},
                        waitFor: {type: 'string', description: 'Selector to wait for'},
                        timeout: {type: 'number', description: 'Timeout in milliseconds', default: 30000},
                        takeScreenshot: {type: 'boolean', description: 'Take a screenshot', default: true},
                        extractText: {type: 'boolean', description: 'Extract page text', default: true}
                    },
                    required: ['url']
                },
                handler: 'navigate'
            },
            {
                name: 'web_click',
                description: 'Click an element on the web page',
                parameters: {
                    type: 'object',
                    properties: {
                        selector: {type: 'string', description: 'CSS selector of element to click'},
                        waitForNavigation: {type: 'boolean', description: 'Wait for navigation', default: false},
                        timeout: {type: 'number', description: 'Timeout in milliseconds', default: 10000}
                    },
                    required: ['selector']
                },
                handler: 'click'
            },
            {
                name: 'web_fill_form',
                description: 'Fill and submit a web form',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {type: 'string', description: 'URL of the page with the form'},
                        fields: {
                            type: 'object',
                            description: 'Object with field names as keys and values to fill',
                            additionalProperties: {type: 'string'}
                        },
                        submitSelector: {type: 'string', description: 'CSS selector for submit button'},
                        waitForNavigation: {
                            type: 'boolean',
                            description: 'Wait for navigation after submit',
                            default: true
                        }
                    },
                    required: ['url', 'fields']
                },
                handler: 'fillForm'
            }
        ];

        webTools.forEach(({name, description, parameters, handler}) =>
            this.registerTool({
                name,
                category: 'web',
                description,
                parameters,
                handler: this.executors.get('web')[handler].bind(this.executors.get('web'))
            }));
    }

    registerFileTools() {
        const fileTools = [
            {
                name: 'file_read',
                description: 'Read file content with intelligent parsing',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {type: 'string', description: 'File path to read'},
                        encoding: {type: 'string', description: 'File encoding', default: 'utf8'},
                        maxSize: {type: 'number', description: 'Maximum file size in bytes', default: 10 * 1024 * 1024}
                    },
                    required: ['path']
                },
                handler: 'read'
            },
            {
                name: 'file_write',
                description: 'Write content to file with backup and validation',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {type: 'string', description: 'File path to write'},
                        content: {type: 'string', description: 'Content to write'},
                        encoding: {type: 'string', description: 'File encoding', default: 'utf8'},
                        backup: {type: 'boolean', description: 'Create backup of existing file', default: true},
                        validateSyntax: {type: 'boolean', description: 'Validate syntax for code files', default: true}
                    },
                    required: ['path', 'content']
                },
                handler: 'write'
            },
            {
                name: 'file_edit',
                description: 'Intelligently edit file content',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {type: 'string', description: 'File path to edit'},
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
                                    target: {type: 'string', description: 'Text to find or position'},
                                    content: {type: 'string', description: 'Content for insert/replace operations'},
                                    regex: {
                                        type: 'boolean',
                                        description: 'Use regex for target matching',
                                        default: false
                                    }
                                },
                                required: ['type', 'target']
                            }
                        },
                        backup: {type: 'boolean', description: 'Create backup before editing', default: true}
                    },
                    required: ['path', 'operations']
                },
                handler: 'edit'
            }
        ];

        fileTools.forEach(({name, description, parameters, handler}) =>
            this.registerTool({
                name,
                category: 'file',
                description,
                parameters,
                handler: this.executors.get('file')[handler].bind(this.executors.get('file'))
            }));
    }

    registerCommandTools() {
        this.registerTool({
            name: 'command_execute',
            category: 'command',
            description: 'Execute system commands in sandboxed environment',
            parameters: {
                type: 'object',
                properties: {
                    command: {type: 'string', description: 'Command to execute'},
                    args: {type: 'array', items: {type: 'string'}, description: 'Command arguments', default: []},
                    cwd: {type: 'string', description: 'Working directory'},
                    timeout: {type: 'number', description: 'Timeout in milliseconds', default: 30000},
                    env: {type: 'object', description: 'Environment variables', additionalProperties: {type: 'string'}},
                    allowedCommands: {
                        type: 'array',
                        items: {type: 'string'},
                        description: 'Allowed commands (security override)'
                    }
                },
                required: ['command']
            },
            handler: this.executors.get('command').execute.bind(this.executors.get('command'))
        });
    }

    registerMediaTools() {
        const mediaTools = [
            {
                name: 'media_process_pdf',
                description: 'Process PDF documents and extract content',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {type: 'string', description: 'Path to PDF file'},
                        extractText: {type: 'boolean', description: 'Extract text content', default: true},
                        extractImages: {type: 'boolean', description: 'Extract images', default: false},
                        pageRange: {
                            type: 'object',
                            properties: {
                                start: {type: 'number', description: 'Start page (1-indexed)'},
                                end: {type: 'number', description: 'End page (1-indexed)'}
                            }
                        }
                    },
                    required: ['path']
                },
                handler: 'processPDF'
            },
            {
                name: 'media_process_image',
                description: 'Process images with OCR and analysis',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {type: 'string', description: 'Path to image file'},
                        performOCR: {type: 'boolean', description: 'Perform OCR text extraction', default: true},
                        analyzeContent: {type: 'boolean', description: 'Analyze image content', default: true},
                        detectObjects: {type: 'boolean', description: 'Detect objects in image', default: false}
                    },
                    required: ['path']
                },
                handler: 'processImage'
            }
        ];

        mediaTools.forEach(({name, description, parameters, handler}) =>
            this.registerTool({
                name,
                category: 'media',
                description,
                parameters,
                handler: this.executors.get('media')[handler].bind(this.executors.get('media'))
            }));
    }

    registerApiTools() {
        this.registerTool({
            name: 'api_request',
            category: 'api',
            description: 'Make HTTP requests to external APIs',
            parameters: {
                type: 'object',
                properties: {
                    url: {type: 'string', description: 'Request URL'},
                    method: {
                        type: 'string',
                        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                        description: 'HTTP method',
                        default: 'GET'
                    },
                    headers: {type: 'object', description: 'Request headers', additionalProperties: {type: 'string'}},
                    body: {type: 'string', description: 'Request body'},
                    timeout: {type: 'number', description: 'Timeout in milliseconds', default: 30000},
                    maxRedirects: {type: 'number', description: 'Maximum redirects', default: 5}
                },
                required: ['url']
            },
            handler: this.executors.get('api').makeRequest.bind(this.executors.get('api'))
        });
    }

    registerTool(toolConfig) {
        const {name, category, description, parameters, handler} = toolConfig;

        if (!name || !handler) {
            throw new Error('Tool must have name and handler');
        }

        const tool = {
            name,
            category: category || 'general',
            description: description || '',
            parameters: parameters || {type: 'object', properties: {}},
            handler,
            createdAt: Date.now(),
            usageCount: 0,
            lastUsed: null
        };

        this.tools.set(name, tool);
        debug(`Registered tool: ${name} (${category})`);

        this.core.emit('tool:registered', tool);
    }

    async executeTool(toolName, parameters = {}, context = {}) {
        const tool = this.tools.get(toolName);
        if (!tool) throw new Error(`Tool '${toolName}' not found`);

        const executionId = this.generateExecutionId(), startTime = Date.now();
        info(`Executing tool: ${toolName} (execution: ${executionId})`);

        const validation = this.validateParameters(parameters, tool.parameters);
        if (!validation.isValid) throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);

        const executionContext = this.createExecutionContext(executionId, toolName, parameters, context, startTime);
        this.activeExecutions.set(executionId, executionContext);
        this.core.emit('execution:started', executionContext);

        try {
            const result = await this.executeWithTimeout(tool.handler, parameters, context, context.timeout || 30000);
            return this.handleExecutionSuccess(executionContext, result, startTime);
        } catch (error) {
            return this.handleExecutionError(executionContext, error, startTime);
        } finally {
            this.activeExecutions.delete(executionId);
        }
    }

    createExecutionContext(executionId, toolName, parameters, context, startTime) {
        return {
            executionId,
            toolName,
            parameters,
            context,
            startTime,
            user: context.user || 'system',
            session: context.session || null
        };
    }

    handleExecutionSuccess(executionContext, result, startTime) {
        const {executionId, toolName} = executionContext;
        executionContext.endTime = Date.now();
        executionContext.duration = executionContext.endTime - startTime;
        executionContext.result = result;
        executionContext.status = 'completed';

        // Update tool statistics
        const tool = this.tools.get(toolName);
        tool.usageCount++;
        tool.lastUsed = Date.now();

        this.addToHistory(executionContext);
        this.core.emit('execution:completed', executionContext);

        info(`Tool execution completed: ${toolName} (${executionId}) in ${executionContext.duration}ms`);

        return {success: true, executionId, result, duration: executionContext.duration};
    }

    handleExecutionError(executionContext, error, startTime) {
        const {executionId, toolName, parameters} = executionContext;
        const endTime = Date.now(), duration = endTime - startTime;

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
        this.core.emit('execution:failed', errorContext);

        logError(`Tool execution failed: ${toolName} (${executionId})`, error);

        return {success: false, executionId, error: error.message, duration};
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
        const errors = [];

        // Validate required parameters
        schema.required?.forEach(required =>
            (!(required in parameters)) && errors.push(`Missing required parameter: ${required}`));

        // Validate parameter types and enums
        Object.entries(schema.properties || {}).forEach(([key, propSchema]) => {
            if (!(key in parameters)) return;

            const value = parameters[key];
            propSchema.type && typeof value !== propSchema.type &&
            errors.push(`Parameter '${key}' must be of type ${propSchema.type}`);

            propSchema.enum && !propSchema.enum.includes(value) &&
            errors.push(`Parameter '${key}' must be one of: ${propSchema.enum.join(', ')}`);
        });

        return {isValid: errors.length === 0, errors};
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
        return Array.from(this.tools.values()).filter(tool => tool.category === category);
    }

    getAllTools() {
        return Array.from(this.tools.values());
    }

    getExecutionHistory(options = {}) {
        let history = [...this.executionHistory];

        options.toolName && (history = history.filter(exec => exec.toolName === options.toolName));
        options.category && (history = history.filter(exec => {
            const tool = this.tools.get(exec.toolName);
            return tool?.category === options.category;
        }));
        options.limit && (history = history.slice(-options.limit));

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

        // Categorize tools and calculate execution statistics in single pass
        const toolUsage = new Map();
        let totalTime = 0;

        // Categorize tools
        this.tools.forEach(tool => {
            stats.toolsByCategory[tool.category] = (stats.toolsByCategory[tool.category] || 0) + 1;
        });

        // Process execution history
        this.executionHistory.forEach(execution => {
            execution.status === 'completed' ?
                (stats.successfulExecutions++, totalTime += execution.duration) :
                execution.status === 'failed' && stats.failedExecutions++;

            // Track tool usage
            toolUsage.set(execution.toolName, (toolUsage.get(execution.toolName) || 0) + 1);
        });

        stats.averageExecutionTime = stats.successfulExecutions > 0
            ? Math.round(totalTime / stats.successfulExecutions)
            : 0;

        // Most used tools
        stats.mostUsedTools = Array.from(toolUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([toolName, count]) => ({toolName, count}));

        return stats;
    }

    async shutdown() {
        info('Shutting down ToolSystem...');

        // Cancel active executions
        this.activeExecutions.forEach((execution, executionId) =>
            this.core.emit('execution:cancelled', {executionId, toolName: execution.toolName}));
        this.activeExecutions.clear();

        // Shutdown executors
        await Promise.all(Array.from(this.executors.values(), executor =>
            typeof executor.shutdown === 'function' ? executor.shutdown() : Promise.resolve()));

        info('ToolSystem shutdown complete');
    }
}

export default ToolSystem;