import {
    createInferenceError,
    createMemoryError,
    createModuleErrorHandler,
    createParseError,
    createPlanningError,
    createValidationError,
    handleErrorWithDefault
} from './errorHandler.js';

/**
 * Unified error handling utility that provides a consistent interface
 * for error handling across the system with reduced boilerplate
 */
class UnifiedErrorHandler {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.handler = createModuleErrorHandler(moduleName);
    }

    /**
     * Execute an async operation with error handling
     * @param {Function} operation - Async function to execute
     * @param {string} context - Context for error reporting
     * @param {*} defaultValue - Default value to return on error
     * @returns {Promise<*>} Result of operation or default value
     */
    async execute(operation, context, defaultValue = null) {
        return await this.handler.safeAsync(operation, context, defaultValue);
    }

    /**
     * Execute a sync operation with error handling
     * @param {Function} operation - Sync function to execute
     * @param {string} context - Context for error reporting
     * @param {*} defaultValue - Default value to return on error
     * @returns {*} Result of operation or default value
     */
    executeSync(operation, context, defaultValue = null) {
        return this.handler.safeSync(operation, context, defaultValue);
    }

    /**
     * Handle an error with a default value
     * @param {Error} error - Error to handle
     * @param {string} context - Context for error reporting
     * @param {*} defaultValue - Default value to return
     * @returns {*} Default value
     */
    handleWithDefault(error, context, defaultValue = null) {
        return handleErrorWithDefault(error, `${this.moduleName}.${context}`, defaultValue);
    }

    /**
     * Create a validation error
     * @param {string} message - Error message
     * @param {*} context - Error context
     * @returns {Error} ValidationError instance
     */
    createValidationError(message, context = null) {
        return createValidationError(message, context);
    }

    /**
     * Create a parse error
     * @param {string} message - Error message
     * @param {*} context - Error context
     * @returns {Error} ParseError instance
     */
    createParseError(message, context = null) {
        return createParseError(message, context);
    }

    /**
     * Create an inference error
     * @param {string} message - Error message
     * @param {*} context - Error context
     * @returns {Error} InferenceError instance
     */
    createInferenceError(message, context = null) {
        return createInferenceError(message, context);
    }

    /**
     * Create a planning error
     * @param {string} message - Error message
     * @param {*} context - Error context
     * @returns {Error} PlanningError instance
     */
    createPlanningError(message, context = null) {
        return createPlanningError(message, context);
    }

    /**
     * Create a memory error
     * @param {string} message - Error message
     * @param {*} context - Error context
     * @returns {Error} MemoryError instance
     */
    createMemoryError(message, context = null) {
        return createMemoryError(message, context);
    }
}

/**
 * Factory function for creating unified error handlers
 * @param {string} moduleName - Name of the module
 * @returns {UnifiedErrorHandler} Unified error handler instance
 */
const createUnifiedErrorHandler = (moduleName) => new UnifiedErrorHandler(moduleName);

export {
    UnifiedErrorHandler,
    createUnifiedErrorHandler
};