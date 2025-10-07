import ToolManagerFactory from './ToolManagerFactory.js';
import {warn} from '../utils/logger.js';

/**
 * Compatibility adapter for existing ToolSystem usage
 * Provides backward compatibility while enabling enhanced features
 */
class CompatibilityAdapter {
    constructor(config = {}, lmInstance = null) {
        this.toolManager = ToolManagerFactory.createToolManager(config, lmInstance);
        this.isEnhanced = ToolManagerFactory.isEnhanced(this.toolManager);
    }

    // Core ToolSystem interface - direct delegation
    registerTool(toolConfig) {
        return this.toolManager.registerTool(toolConfig);
    }

    async executeTool(toolName, parameters = {}, context = {}) {
        // Use enhanced execution if available and appropriate
        if (this.isEnhanced && this.shouldUseEnhancedExecution(toolName, parameters, context)) {
            return this.toolManager.executeToolWithEnhancements(toolName, parameters, context);
        }

        return this.toolManager.executeTool(toolName, parameters, context);
    }

    getTool(name) {
        return this.toolManager.getTool(name);
    }

    getAllTools() {
        return this.toolManager.getAllTools();
    }

    getToolsByCategory(category) {
        return this.toolManager.getToolsByCategory(category);
    }

    getStatistics() {
        return this.toolManager.getStatistics();
    }

    getExecutionHistory(options = {}) {
        return this.toolManager.getExecutionHistory(options);
    }

    async shutdown() {
        return this.toolManager.shutdown();
    }

    // Enhanced features - conditionally available
    async selectOptimalTool(taskDescription, availableTools = null) {
        if (!this.isEnhanced) {
            warn('selectOptimalTool called on standard ToolSystem - feature not available');
            return null;
        }
        return this.toolManager.selectOptimalTool(taskDescription, availableTools);
    }

    async optimizeParameters(tool, initialParameters, context = {}) {
        if (!this.isEnhanced) {
            warn('optimizeParameters called on standard ToolSystem - feature not available');
            return initialParameters;
        }
        return this.toolManager.optimizeParameters(tool, initialParameters, context);
    }

    getEnhancedStatistics() {
        if (!this.isEnhanced) {
            warn('getEnhancedStatistics called on standard ToolSystem - using basic statistics');
            return this.getStatistics();
        }
        return this.toolManager.getEnhancedStatistics();
    }

    // Helper method to determine when to use enhanced execution
    shouldUseEnhancedExecution(toolName, parameters, context) {
        // Use enhanced execution for:
        // 1. Auto-selection requests
        // 2. Requests with explanation flag
        // 3. Complex parameter sets
        // 4. High-priority operations

        if (toolName === 'auto_select' || toolName.includes('auto_select')) return true;
        if (context.requestExplanation) return true;
        if (parameters && typeof parameters === 'object' &&
            Object.keys(parameters).length > 3) return true;
        if (context.priority === 'high') return true;

        return false;
    }

    // Feature detection
    hasFeature(featureName) {
        const capabilities = ToolManagerFactory.getToolManagerCapabilities();
        return capabilities[featureName] === 'function' ||
               (capabilities[featureName] === 'function?' && this.isEnhanced);
    }

    // Graceful degradation for missing features
    async executeWithFallback(methodName, args = [], fallbackResult = null) {
        if (typeof this.toolManager[methodName] === 'function') {
            return this.toolManager[methodName](...args);
        }

        warn(`Method ${methodName} not available on current tool manager`);
        return fallbackResult;
    }
}

export default CompatibilityAdapter;