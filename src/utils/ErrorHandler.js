import {
    createModuleErrorHandler,
    createValidationError,
    createParseError,
    createInferenceError,
    createPlanningError,
    createMemoryError
} from './errorHandler.js';

/**
 * Enhanced error handling utility that provides a more concise interface
 * for error handling across the system with reduced boilerplate
 */
class ErrorHandler {
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
     * Create specific error types
     */
    createValidationError(message, context = null) {
        return createValidationError(message, context);
    }

    createParseError(message, context = null) {
        return createParseError(message, context);
    }

    createInferenceError(message, context = null) {
        return createInferenceError(message, context);
    }

    createPlanningError(message, context = null) {
        return createPlanningError(message, context);
    }

    createMemoryError(message, context = null) {
        return createMemoryError(message, context);
    }
}

/**
 * Factory function for creating error handlers
 * @param {string} moduleName - Name of the module
 * @returns {ErrorHandler} Error handler instance
 */
const createErrorHandler = (moduleName) => new ErrorHandler(moduleName);

/**
 * Global error handler utility with common patterns
 */
const globalErrorHandler = {
    /**
     * Execute an operation with simplified error handling
     * @param {Function} operation - Function to execute (sync or async)
     * @param {Object} options - Configuration options
     * @param {string} options.context - Context for error reporting
     * @param {*} options.defaultValue - Default value to return on error
     * @param {boolean} options.isAsync - Whether the operation is async
     * @param {string} options.module - Module name for error context
     * @returns {*} Result of operation or default value
     */
    handle(operation, { context, defaultValue = null, isAsync = false, module = 'Global' } = {}) {
        const handler = new ErrorHandler(module);
        if (isAsync) {
            return handler.execute(operation, context, defaultValue);
        }
        return handler.executeSync(operation, context, defaultValue);
    }
};

export {
    ErrorHandler,
    createErrorHandler,
    globalErrorHandler
};