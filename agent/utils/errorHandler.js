// Consolidated error handling for agent module
import {createUnifiedErrorHandler} from '../../core/utils/errorHandler.js';
import logger from '../../core/utils/logger.js';

const agentLogger = logger.create('AgentUtils');

// Common error handling patterns for agent operations
export const createAgentErrorHandler = (component) => {
  const errorHandler = createUnifiedErrorHandler(component);

  return {
    // Async operation with error handling and logging
    execute: (operation, context, fallback = null) =>
      errorHandler.runAsync(operation, context, {onError: (err) => {
        agentLogger.error(`${component} ${context} failed:`, err);
        return fallback;
      }}),

    // Sync operation with error handling
    runSync: (operation, context, options = {}) =>
      errorHandler.runSync(operation, context, options),

    // Validation with consistent error messages
    validate: (condition, message) => {
      if (!condition) throw new Error(`${component}: ${message}`);
    },

    // State validation helper
    requireInitialized: (agent) => {
      if (!agent?.isInitialized) throw new Error(`${component} must be initialized`);
    }
  };
};

// Pre-configured handlers for common agent components
export const agentHandler = createAgentErrorHandler('Agent');
export const managerHandler = createAgentErrorHandler('AgentManager');