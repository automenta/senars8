// Consolidated error handling for agent module
import {createUnifiedErrorHandler} from '../../core/utils/errorHandler.js';
import logger from '../../core/utils/logger.js';
import {SeNARSError, ERROR_TYPES, ERROR_SEVERITY, createErrorHandler} from '../../core/utils/errorHandling.js';

const agentLogger = logger.create('AgentUtils');

// Common error handling patterns for agent operations
export const createAgentErrorHandler = (component) => {
    const errorHandler = createUnifiedErrorHandler(component);
    const contextErrorHandler = createErrorHandler(component);

    return {
        // Async operation with enhanced error handling and logging
        execute: async (operation, context, fallback = null) => {
            try {
                return await operation();
            } catch (error) {
                const senarsError = error instanceof SeNARSError ? error : 
                    new SeNARSError(
                        error.message || `Operation failed: ${context}`, 
                        ERROR_TYPES.BUSINESS, 
                        ERROR_SEVERITY.MEDIUM, 
                        error
                    );
                
                agentLogger.error(`${component} ${context} failed:`, senarsError);
                contextErrorHandler(senarsError, { operation: context });
                
                return fallback;
            }
        },

        // Sync operation with enhanced error handling
        runSync: (operation, context, options = {}) => {
            const { defaultValue = null, throwOnError = false } = options;
            try {
                return operation();
            } catch (error) {
                const senarsError = error instanceof SeNARSError ? error : 
                    new SeNARSError(
                        error.message || `Sync operation failed: ${context}`, 
                        ERROR_TYPES.BUSINESS, 
                        ERROR_SEVERITY.MEDIUM, 
                        error
                    );
                
                agentLogger.error(`${component} ${context} failed:`, senarsError);
                contextErrorHandler(senarsError, { operation: context });
                
                if (throwOnError) throw senarsError;
                return defaultValue;
            }
        },

        // Enhanced validation with specific error types
        validate: (condition, message, field = null) => {
            if (!condition) {
                const validationError = new SeNARSError(
                    `${component}: ${message}`, 
                    ERROR_TYPES.VALIDATION, 
                    ERROR_SEVERITY.MEDIUM
                );
                validationError.field = field;
                
                agentLogger.warn(validationError.message);
                contextErrorHandler(validationError);
                
                throw validationError;
            }
        },

        // Enhanced state validation helper
        requireInitialized: (instance, customMessage = null) => {
            if (!instance?.isInitialized) {
                const message = customMessage || `${component} must be initialized`;
                const stateError = new SeNARSError(
                    message, 
                    ERROR_TYPES.BUSINESS, 
                    ERROR_SEVERITY.HIGH
                );
                
                agentLogger.error(stateError.message);
                contextErrorHandler(stateError);
                
                throw stateError;
            }
        }
    };
};

// Pre-configured handlers for common agent components
export const agentHandler = createAgentErrorHandler('Agent');
export const managerHandler = createAgentErrorHandler('AgentManager');