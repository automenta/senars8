import ToolSystem from './ToolSystem.js';
import {debug, error as logError, info} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('EnhancedToolManager');

/**
 * Performance tracking for tool executions and system metrics
 */
class PerformanceTracker {
    constructor() {
        this.performanceMetrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            toolUsageStats: new Map(),
            categoryPerformance: new Map(),
            performanceHistory: [],
            peakUsageTimes: new Map(),
            errorPatterns: new Map()
        };
        this.toolPerformance = new Map();
    }

    trackExecutionSuccess(executionId, toolName, startTime, result) {
        const duration = Date.now() - startTime;
        this.updateGlobalMetrics(true, duration);
        this.updateToolMetrics(toolName, true, duration);
        debug(`Tool ${toolName} executed successfully in ${duration}ms`);
    }

    trackExecutionFailure(executionId, toolName, startTime, error) {
        const duration = Date.now() - startTime;
        this.updateGlobalMetrics(false, duration);
        this.updateToolMetrics(toolName, false, duration);
        debug(`Tool ${toolName} failed after ${duration}ms:`, error.message);
    }

    updateGlobalMetrics(isSuccess, duration) {
        this.performanceMetrics.totalExecutions++;

        if (isSuccess) {
            this.performanceMetrics.successfulExecutions++;
            const {successfulExecutions} = this.performanceMetrics;
            this.performanceMetrics.averageExecutionTime =
                (this.performanceMetrics.averageExecutionTime * (successfulExecutions - 1) + duration) /
                successfulExecutions;
        } else {
            this.performanceMetrics.failedExecutions++;
        }
    }

    updateToolMetrics(toolName, isSuccess, duration) {
        if (!this.toolPerformance.has(toolName)) {
            this.initializeToolMetrics(toolName);
        }

        const toolStats = this.toolPerformance.get(toolName);
        toolStats.executions++;
        toolStats.totalTime += duration;
        toolStats.averageTime = toolStats.totalTime / toolStats.executions;

        if (isSuccess) {
            toolStats.successes++;
        } else {
            toolStats.failures++;
        }
    }

    initializeToolMetrics(toolName) {
        this.toolPerformance.set(toolName, {
            executions: 0,
            successes: 0,
            failures: 0,
            totalTime: 0,
            averageTime: 0
        });
    }

    getStatistics() {
        return {
            performanceMetrics: {...this.performanceMetrics},
            toolPerformance: Object.fromEntries(this.toolPerformance)
        };
    }

    reset() {
        this.performanceMetrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            toolUsageStats: new Map(),
            categoryPerformance: new Map(),
            performanceHistory: [],
            peakUsageTimes: new Map(),
            errorPatterns: new Map()
        };
        this.toolPerformance.clear();
    }
}

class EnhancedToolManager extends ToolSystem {
    constructor(config = {}, lmInstance = null) {
        super(config);
        this.lm = lmInstance;
        this.config = config;

        this.initializeComponents();
        this.startServices();

        info('EnhancedToolManager initialized with LM integration:', this.lmIntegrationEnabled);
    }

    initializeComponents() {
        this.toolPerformance = new Map();
        this.toolDiscovery = new Map();
        this.toolSelectionCache = new Map();
        this.parameterOptimizationCache = new Map();

        // Enhanced caching with adaptive timeouts
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes base
        this.cacheHitStats = new Map(); // Track cache performance
        this.adaptiveCacheEnabled = this.config.adaptiveCache !== false;

        this.autoDiscoveryEnabled = this.config.autoDiscovery !== false;
        this.lmIntegrationEnabled = this.config.lmIntegration !== false && !!this.lm;
        this.discoveryInterval = null;
        this.discoveryPaths = ['core/tools/executors', 'plugins', 'node_modules'];

        // Enhanced performance tracking
        this.performanceMetrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            toolUsageStats: new Map(),
            categoryPerformance: new Map(),
            performanceHistory: [], // Track trends
            peakUsageTimes: new Map(), // Track usage patterns
            errorPatterns: new Map() // Track failure patterns
        };

        // Enhanced tool selection
        this.toolAffinityScores = new Map(); // Learn from successful executions
        this.semanticMatchingEnabled = this.config.semanticMatching !== false;
        this.fuzzyMatchingThreshold = this.config.fuzzyThreshold || 0.8;
    }

    startServices() {
        if (this.autoDiscoveryEnabled) {
            this.startAutoDiscovery();
        }
    }

    initializeLMToolSelection() {
        this.toolSelectionCache = new Map();
        this.parameterOptimizationCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    initializePerformanceTracking() {
        this.performanceMetrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            toolUsageStats: new Map(),
            categoryPerformance: new Map()
        };
    }

    initializeAutoDiscovery() {
        this.discoveryInterval = null;
        this.discoveryPaths = [
            'core/tools/executors',
            'plugins',
            'node_modules'
        ];
    }

    startAutoDiscovery() {
        if (this.discoveryInterval) return;

        this.discoveryInterval = setInterval(() => {
            this.performAutoDiscovery();
        }, 30000); // Check every 30 seconds

        info('Auto-discovery started');
    }

    stopAutoDiscovery() {
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = null;
            info('Auto-discovery stopped');
        }
    }

    async performAutoDiscovery() {
        for (const path of this.discoveryPaths) {
            try {
                await this.discoverToolsInPath(path);
            } catch (error) {
                debug(`Failed to discover tools in path ${path}:`, error.message);
            }
        }
    }

    async discoverToolsInPath(path) {
        // This would typically scan directories for tool files
        // For now, we'll implement a basic version that looks for known patterns
        const discoveryKey = `path_${path}_${Date.now()}`;

        if (this.toolDiscovery.has(discoveryKey)) return;
        this.toolDiscovery.set(discoveryKey, {path, timestamp: Date.now()});

        // Clean old discovery records
        for (const [key, record] of this.toolDiscovery.entries()) {
            if (Date.now() - record.timestamp > 300000) { // 5 minutes
                this.toolDiscovery.delete(key);
            }
        }
    }

    async selectOptimalTool(taskDescription, availableTools = null) {
        if (!this.lmIntegrationEnabled || !this.lm) {
            return this.selectToolBySimpleMatching(taskDescription, availableTools);
        }

        const cachedResult = this.getCachedToolSelection(taskDescription, availableTools);
        if (cachedResult) return cachedResult;

        try {
            const result = await this.performLMToolSelection(taskDescription, availableTools);
            this.cacheToolSelection(taskDescription, availableTools, result);
            return result;
        } catch (error) {
            logError('LM tool selection failed, falling back to simple matching:', error.message);
            return this.selectToolBySimpleMatching(taskDescription, availableTools);
        }
    }

    getCachedToolSelection(taskDescription, availableTools) {
        const cacheKey = this.generateCacheKey(taskDescription, availableTools);
        const cached = this.toolSelectionCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
            debug('Using cached tool selection');
            return cached.result;
        }

        return null;
    }

    async performLMToolSelection(taskDescription, availableTools) {
        const tools = availableTools || this.getAllTools();
        const prompt = this.buildToolSelectionPrompt(taskDescription, tools);

        const selection = await this.lm._generate(prompt, {
            temperature: 0.3,
            max_tokens: 150
        });

        return this.parseToolSelection(selection, tools);
    }

    cacheToolSelection(taskDescription, availableTools, result) {
        const cacheKey = this.generateCacheKey(taskDescription, availableTools);
        this.toolSelectionCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
    }

    selectToolBySimpleMatching(taskDescription, availableTools = null) {
        const tools = availableTools || this.getAllTools();
        const description = taskDescription.toLowerCase();

        // Simple keyword matching for fallback
        let bestMatch = null;
        let bestScore = 0;

        for (const tool of tools) {
            const score = this.calculateToolRelevanceScore(tool, description);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = tool;
            }
        }

        // Return best match in the same format as LM selection
        if (bestMatch) {
            return {
                tool: bestMatch,
                confidence: 0.5, // Default confidence for fallback
                reasoning: 'Fallback pattern matching selection'
            };
        }

        // Return first tool as final fallback
        if (tools.length > 0) {
            return {
                tool: tools[0],
                confidence: 0.3,
                reasoning: 'Final fallback - first available tool'
            };
        }

        return null;
    }

    calculateToolRelevanceScore(tool, description) {
        let score = 0;
        const toolText = `${tool.name} ${tool.description} ${tool.category}`.toLowerCase();
        const descLower = description.toLowerCase();

        // Simple keyword matching - give higher scores for exact matches
        const keywords = description.split(/\s+/);
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (toolText.includes(keywordLower)) {
                // Exact word matches get higher scores
                if (toolText.indexOf(keywordLower) !== -1) {
                    score += 2;
                } else {
                    score += 1;
                }
            }
        }

        // Category-based scoring - higher weight
        if (descLower.includes(tool.category)) score += 3;

        // Name-based scoring - highest weight for exact name matches
        if (descLower.includes(tool.name.toLowerCase())) score += 5;

        // Boost score for file-related tools when task mentions "file"
        if (descLower.includes('file') && tool.category === 'file') score += 3;

        return score;
    }

    buildToolSelectionPrompt(taskDescription, tools) {
        const toolsList = tools.map(tool =>
            `Name: ${tool.name}\nDescription: ${tool.description}\nCategory: ${tool.category}\nParameters: ${JSON.stringify(tool.parameters)}`
        ).join('\n\n');

        return `Given the task: "${taskDescription}"

Available tools:
${toolsList}

Select the most appropriate tool for this task. Consider:
1. The tool's description and capabilities
2. The required parameters match the task needs
3. The tool category relevance

Respond with a JSON object containing:
{
  "toolName": "selected_tool_name",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;
    }

    parseToolSelection(selection, tools) {
        try {
            const parsed = JSON.parse(selection);
            const tool = tools.find(t => t.name === parsed.toolName);

            if (tool) {
                return {
                    tool,
                    confidence: parsed.confidence || 0.5,
                    reasoning: parsed.reasoning || 'Selected by LM'
                };
            }
        } catch (error) {
            debug('Failed to parse tool selection JSON:', error.message);
        }

        // Fallback parsing - look for tool name in text
        for (const tool of tools) {
            if (selection.toLowerCase().includes(tool.name.toLowerCase())) {
                return {
                    tool,
                    confidence: 0.3,
                    reasoning: 'Fallback pattern matching'
                };
            }
        }

        return null;
    }

    async optimizeParameters(tool, initialParameters, context = {}) {
        if (!this.lmIntegrationEnabled || !this.lm) {
            return initialParameters;
        }

        const cachedResult = this.getCachedParameterOptimization(tool, initialParameters, context);
        if (cachedResult) return cachedResult;

        try {
            const result = await this.performLMParameterOptimization(tool, initialParameters, context);
            this.cacheParameterOptimization(tool, initialParameters, context, result);
            return result;
        } catch (error) {
            logError('Parameter optimization failed, using original parameters:', error.message);
            return initialParameters;
        }
    }

    getCachedParameterOptimization(tool, initialParameters, context) {
        const cacheKey = this.generateParameterCacheKey(tool, initialParameters, context);
        const cached = this.parameterOptimizationCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
            debug('Using cached parameter optimization');
            return cached.result;
        }

        return null;
    }

    async performLMParameterOptimization(tool, initialParameters, context) {
        const prompt = this.buildParameterOptimizationPrompt(tool, initialParameters, context);
        const optimization = await this.lm._generate(prompt, {
            temperature: 0.2,
            max_tokens: 200
        });

        return this.parseParameterOptimization(optimization, initialParameters);
    }

    cacheParameterOptimization(tool, initialParameters, context, result) {
        const cacheKey = this.generateParameterCacheKey(tool, initialParameters, context);
        this.parameterOptimizationCache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
    }

    generateParameterCacheKey(tool, initialParameters, context) {
        return `${tool.name}_${JSON.stringify(initialParameters)}_${JSON.stringify(context)}`;
    }

    buildParameterOptimizationPrompt(tool, parameters, context) {
        return `Tool: ${tool.name}
Description: ${tool.description}
Current Parameters: ${JSON.stringify(parameters, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Optimize these parameters for better performance and reliability. Consider:
1. Required vs optional parameters
2. Performance implications of different values
3. Best practices for this type of operation

Respond with optimized parameters as JSON. Only include parameters that should be changed or are critical.`;
    }

    parseParameterOptimization(optimization, originalParameters) {
        try {
            const match = optimization.match(/```json\n(.*)\n```/s);
            if (match) {
                const optimized = JSON.parse(match[1]);
                return {...originalParameters, ...optimized};
            }
        } catch (error) {
            debug('Failed to parse parameter optimization:', error.message);
        }

        return originalParameters;
    }

    async executeTool(toolName, parameters = {}, context = {}) {
        const executionId = this.generateExecutionId();
        const startTime = Date.now();

        try {
            const executionContext = await this.prepareExecutionContext(toolName, parameters, context);
            const result = await this.executeWithEnhancements(executionContext, startTime);
            this.trackExecutionSuccess(executionId, executionContext.selectedTool, startTime, result);

            if (context.requestExplanation) {
                result.explanation = await this.generateToolExplanation(
                    executionContext.selectedTool,
                    executionContext.optimizedParameters,
                    result,
                    context
                );
            }

            return result;
        } catch (error) {
            this.trackExecutionFailure(executionId, toolName, startTime, error);
            throw error;
        }
    }

    async prepareExecutionContext(toolName, parameters, context) {
        let selectedTool = toolName;

        // Auto-select tool if requested
        if (this.shouldAutoSelectTool(toolName, parameters, context)) {
            selectedTool = await this.performAutoSelection(parameters, context);
        }

        // Optimize parameters if LM available
        const optimizedParameters = await this.optimizeExecutionParameters(selectedTool, parameters, context);

        return {
            selectedTool,
            optimizedParameters,
            context
        };
    }

    shouldAutoSelectTool(toolName, parameters, context) {
        return typeof toolName === 'string' &&
            (toolName.includes('auto_select') ||
                parameters.taskDescription ||
                context.taskDescription);
    }

    async performAutoSelection(parameters, context) {
        const taskDescription = parameters.taskDescription || context.taskDescription;
        const selection = await this.selectOptimalTool(taskDescription);

        if (selection?.tool) {
            debug(`Auto-selected tool: ${selection.tool.name} (confidence: ${selection.confidence})`);
            return selection.tool.name;
        }

        throw new Error('No suitable tool found for auto-selection');
    }

    async optimizeExecutionParameters(selectedTool, parameters, context) {
        if (!this.lmIntegrationEnabled || !this.lm) return parameters;

        const tool = this.getTool(selectedTool);
        return tool ? await this.optimizeParameters(tool, parameters, context) : parameters;
    }

    async executeWithEnhancements(executionContext, startTime) {
        return super.executeTool(
            executionContext.selectedTool,
            executionContext.optimizedParameters,
            executionContext.context
        );
    }

    async executeToolWithEnhancements(toolName, parameters = {}, context = {}) {
        // This method is now an alias for executeTool for backward compatibility
        return this.executeTool(toolName, parameters, context);
    }

    trackExecutionSuccess(executionId, toolName, startTime, result) {
        const duration = Date.now() - startTime;
        this.updateGlobalMetrics(true, duration);
        this.updateToolMetrics(toolName, true, duration);
        debug(`Tool ${toolName} executed successfully in ${duration}ms`);
    }

    trackExecutionFailure(executionId, toolName, startTime, error) {
        const duration = Date.now() - startTime;
        this.updateGlobalMetrics(false, duration);
        this.updateToolMetrics(toolName, false, duration);
        debug(`Tool ${toolName} failed after ${duration}ms:`, error.message);
    }

    updateGlobalMetrics(isSuccess, duration) {
        this.performanceMetrics.totalExecutions++;

        if (isSuccess) {
            this.performanceMetrics.successfulExecutions++;
            const {successfulExecutions} = this.performanceMetrics;
            this.performanceMetrics.averageExecutionTime =
                (this.performanceMetrics.averageExecutionTime * (successfulExecutions - 1) + duration) /
                successfulExecutions;
        } else {
            this.performanceMetrics.failedExecutions++;
        }
    }

    updateToolMetrics(toolName, isSuccess, duration) {
        if (!this.toolPerformance.has(toolName)) {
            this.initializeToolMetrics(toolName);
        }

        const toolStats = this.toolPerformance.get(toolName);
        toolStats.executions++;
        toolStats.totalTime += duration;
        toolStats.averageTime = toolStats.totalTime / toolStats.executions;

        if (isSuccess) {
            toolStats.successes++;
        } else {
            toolStats.failures++;
        }
    }

    initializeToolMetrics(toolName) {
        this.toolPerformance.set(toolName, {
            executions: 0,
            successes: 0,
            failures: 0,
            totalTime: 0,
            averageTime: 0
        });
    }

    async generateToolExplanation(toolName, parameters, result, context) {
        if (!this.lm || !this.lmIntegrationEnabled) return null;

        try {
            const tool = this.getTool(toolName);
            const prompt = `Tool: ${toolName}
Description: ${tool?.description || 'Unknown tool'}
Parameters used: ${JSON.stringify(parameters, null, 2)}
Execution result: ${JSON.stringify(result, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Provide a clear explanation of what this tool did and why it was appropriate for the task.`;

            return await this.lm._generate(prompt, {
                temperature: 0.3,
                max_tokens: 150
            });
        } catch (error) {
            logError('Failed to generate tool explanation:', error.message);
            return 'Explanation generation failed';
        }
    }

    getEnhancedStatistics() {
        const baseStats = super.getStatistics();

        return {
            ...baseStats,
            lmIntegrationEnabled: this.lmIntegrationEnabled,
            autoDiscoveryEnabled: this.autoDiscoveryEnabled,
            performanceMetrics: {...this.performanceMetrics},
            toolPerformance: Object.fromEntries(this.toolPerformance),
            cacheStats: {
                toolSelectionCache: this.toolSelectionCache.size,
                parameterOptimizationCache: this.parameterOptimizationCache.size
            },
            discoveryStats: {
                pathsMonitored: this.discoveryPaths.length,
                lastDiscovery: Math.max(...Array.from(this.toolDiscovery.values()).map(d => d.timestamp)) || 0
            }
        };
    }

    generateCacheKey(taskDescription, availableTools) {
        const toolsHash = availableTools ?
            availableTools.map(t => t.name).sort().join('_') :
            'all_tools';
        return `task_${taskDescription.replace(/\s+/g, '_')}_tools_${toolsHash}`;
    }

    async shutdown() {
        this.stopAutoDiscovery();
        await super.shutdown();

        // Clear caches
        this.toolSelectionCache.clear();
        this.parameterOptimizationCache.clear();
        this.toolPerformance.clear();
        this.toolDiscovery.clear();

        info('EnhancedToolManager shutdown complete');
    }


}

export default EnhancedToolManager;

