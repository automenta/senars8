import ToolSystem from './ToolSystem.js';
import EnhancedToolManager from './EnhancedToolManager.js';
import {info} from '../utils/logger.js';

/**
 * Factory for creating tool managers with appropriate enhancements
 */
class ToolManagerFactory {
    static createToolManager(config = {}, lmInstance = null) {
        const useEnhanced = config.enhanced !== false &&
                           (config.lmIntegration !== false && lmInstance) ||
                           config.autoDiscovery === true;

        if (useEnhanced) {
            info('Creating EnhancedToolManager with LM integration');
            return new EnhancedToolManager(config, lmInstance);
        } else {
            info('Creating standard ToolSystem');
            return new ToolSystem(config);
        }
    }

    static isEnhanced(toolManager) {
        return toolManager instanceof EnhancedToolManager;
    }

    static getToolManagerCapabilities() {
        return {
            // Core tool operations
            registerTool: 'function',
            executeTool: 'function',
            getTool: 'function',
            getAllTools: 'function',
            getToolsByCategory: 'function',

            // Enhanced features (may not be available on all implementations)
            selectOptimalTool: 'function?',
            optimizeParameters: 'function?',
            getEnhancedStatistics: 'function?',
            executeToolWithEnhancements: 'function?',

            // Standard features
            getStatistics: 'function',
            getExecutionHistory: 'function',
            shutdown: 'function'
        };
    }
}

export default ToolManagerFactory;