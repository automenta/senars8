/**
 * @fileoverview Improved modular error handling system
 */

import {error as logError} from './logger.js';

// Define error types using a factory function
const createErrorType = (name) => {
    return class extends Error {
        constructor(message, context = null) {
            super(message);
            this.name = name;
            this.context = context;
            // Maintain proper stack trace
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
        }
    };
};

// Define error types
const ValidationError = createErrorType('ValidationError');
const ParseError = createErrorType('ParseError');
const InferenceError = createErrorType('InferenceError');
const PlanningError = createErrorType('PlanningError');
const MemoryError = createErrorType('MemoryError');
const CLIError = createErrorType('CLIError');
const AnalysisError = createErrorType('AnalysisError');
const NotImplementedError = createErrorType('NotImplementedError');

// Export error classes
export const Errors = {
    ValidationError,
    ParseError,
    InferenceError,
    PlanningError,
    MemoryError,
    CLIError,
    AnalysisError,
    NotImplementedError
};

// Helper functions to check error types
export const isError = {
    isValidationError: (error) => error instanceof ValidationError,
    isParseError: (error) => error instanceof ParseError,
    isInferenceError: (error) => error instanceof InferenceError,
    isPlanningError: (error) => error instanceof PlanningError,
    isMemoryError: (error) => error instanceof MemoryError,
    isCLIError: (error) => error instanceof CLIError,
    isAnalysisError: (error) => error instanceof AnalysisError,
    isNotImplementedError: (error) => error instanceof NotImplementedError,
};

// Helper functions to create errors
export const createError = {
    ValidationError: (message, context = null) => new ValidationError(message, context),
    ParseError: (message, context = null) => new ParseError(message, context),
    InferenceError: (message, context = null) => new InferenceError(message, context),
    PlanningError: (message, context = null) => new PlanningError(message, context),
    MemoryError: (message, context = null) => new MemoryError(message, context),
    CLIError: (message, context = null) => new CLIError(message, context),
    AnalysisError: (message, context = null) => new AnalysisError(message, context),
    NotImplementedError: (message, context = null) => new NotImplementedError(message, context),
};

// Utility to check if error is of known type
const isKnownErrorType = error => {
    if (!error) return false;
    return Object.values(Errors).some(type => error instanceof type);
};

// Prepare error for logging
const prepareErrorForLogging = error => {
    if (error == null) {
        const nullError = new Error('Null or undefined error');
        nullError.originalStack = new Error().stack;
        return nullError;
    }
    if (error.stack && !error.originalStack) {
        error.originalStack = error.stack;
    }
    return error;
};

// Log error utility
const logErrorWithContext = (error, context) => {
    const preparedError = prepareErrorForLogging(error);
    const fullContext = context ? `[${context}] ` : '';
    logError(`${fullContext}${preparedError.message}`, preparedError);
};

// Log error and return default value
const logAndReturn = (error, context, defaultValue = null) => {
    logErrorWithContext(error, context);
    return defaultValue;
};

// Log error and throw
const logAndThrow = (error, context) => {
    const preparedError = prepareErrorForLogging(error);
    if (context && !preparedError.message.startsWith(`[${context}]`)) {
        preparedError.message = `[${context}] ${preparedError.message}`;
    }

    if (!isKnownErrorType(preparedError) && !preparedError.originalError) {
        const newError = new Error(preparedError.message);
        newError.originalStack = preparedError.stack || preparedError.originalStack;
        newError.originalError = preparedError;
        logError(newError.message, newError);
        throw newError;
    }

    logError(preparedError.message, preparedError);
    throw preparedError;
};

// Log error and exit process
const logAndExit = (error, exitCode = 1) => {
    const preparedError = prepareErrorForLogging(error);
    logError(preparedError.message, preparedError);
    process.exit(exitCode);
};

// Safe async operation wrapper
const safeAsync = async (operation, context, defaultValue = null) => {
    try {
        return await operation();
    } catch (error) {
        logErrorWithContext(error, context);
        return defaultValue;
    }
};

// Safe sync operation wrapper
const safeSync = (operation, context, defaultValue = null) => {
    try {
        return operation();
    } catch (error) {
        logErrorWithContext(error, context);
        return defaultValue;
    }
};

// Error handler factory for modules
const createModuleErrorHandler = (moduleName) => ({
    handle: (error, context, shouldThrow = true) => {
        const fullContext = `${moduleName}.${context}`;
        return shouldThrow ? logAndThrow(error, fullContext) : logAndReturn(error, fullContext, null);
    },

    handleWithDefault: (error, context, defaultValue = null) => {
        const fullContext = `${moduleName}.${context}`;
        logErrorWithContext(error, fullContext);
        return defaultValue;
    },

    safeAsync: async (operation, context, defaultValue = null) => {
        return await safeAsync(operation, `${moduleName}.${context}`, defaultValue);
    },

    safeSync: (operation, context, defaultValue = null) => {
        return safeSync(operation, `${moduleName}.${context}`, defaultValue);
    },
});

// Unified error handler class for consistent API
class UnifiedErrorHandler {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.handler = createModuleErrorHandler(moduleName);
    }

    async execute(operation, context, defaultValue = null) {
        return await this.handler.safeAsync(operation, context, defaultValue);
    }

    executeSync(operation, context, defaultValue = null) {
        return this.handler.safeSync(operation, context, defaultValue);
    }

    handleWithDefault(error, context, defaultValue = null) {
        return this.handler.handleWithDefault(error, context, defaultValue);
    }

    // Convenience methods
    async runAsync(operation, context, options = {}) {
        const {defaultValue = null, rethrow = false} = options;
        try {
            return await operation();
        } catch (error) {
            if (rethrow) {
                this.handleWithDefault(error, context, defaultValue);
                throw error;
            }
            return this.handleWithDefault(error, context, defaultValue);
        }
    }

    runSync(operation, context, options = {}) {
        const {defaultValue = null, rethrow = false} = options;
        try {
            return operation();
        } catch (error) {
            if (rethrow) {
                this.handleWithDefault(error, context, defaultValue);
                throw error;
            }
            return this.handleWithDefault(error, context, defaultValue);
        }
    }
}

// Factory function for creating unified error handlers
const createUnifiedErrorHandler = (moduleName) => new UnifiedErrorHandler(moduleName);

// Pre-configured error handlers for common components
const agentErrorHandler = createUnifiedErrorHandler('Agent');
const systemErrorHandler = createUnifiedErrorHandler('System');
const plannerErrorHandler = createUnifiedErrorHandler('Planner');
const perceptionErrorHandler = createUnifiedErrorHandler('Perception');
const metaCognitionErrorHandler = createUnifiedErrorHandler('MetaCognition');
const eventBusErrorHandler = createUnifiedErrorHandler('EventBus');
const commandBusErrorHandler = createUnifiedErrorHandler('CommandBus');
const diContainerErrorHandler = createUnifiedErrorHandler('DIContainer');

// Export everything
export {
    UnifiedErrorHandler,
    createUnifiedErrorHandler,
    createModuleErrorHandler,
    safeAsync,
    safeSync,
    logAndExit,
    agentErrorHandler,
    systemErrorHandler,
    plannerErrorHandler,
    perceptionErrorHandler,
    metaCognitionErrorHandler,
    eventBusErrorHandler,
    commandBusErrorHandler,
    diContainerErrorHandler,
};
