import {
    error as logError
} from './logger.js';

const createErrorClass = (name) => {
    const NewError = class extends Error {
        constructor(message, context = null) {
            super(message);
            this.name = name;
            this.context = context;
        }
    };
    Object.defineProperty(NewError, 'name', {
        value: name
    });
    return NewError;
};

const ValidationError = createErrorClass('ValidationError');
const ParseError = createErrorClass('ParseError');
const InferenceError = createErrorClass('InferenceError');
const PlanningError = createErrorClass('PlanningError');
const MemoryError = createErrorClass('MemoryError');

const ERROR_TYPES = [ValidationError, ParseError, InferenceError, PlanningError, MemoryError];

const isKnownErrorType = error => ERROR_TYPES.some(type => error instanceof type);

const logAndReturn = (error, context, returnValue = null) => {
    const preparedError = prepareErrorForLogging(error);
    const fullContext = context ? `[${context}] ` : '';
    logError(`${fullContext}${preparedError.message}`, preparedError);
    return returnValue;
};

const logAndThrow = (error, context) => {
    const preparedError = prepareErrorForLogging(error);
    if (context && !/\[.*?\]/.test(preparedError.message)) {
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

const handleError = (error, context, shouldThrow = true) =>
    shouldThrow ? logAndThrow(error, context) : logAndReturn(error, context, null);

const handleErrorWithDefault = (error, context, defaultValue = null) =>
    logAndReturn(error, context, defaultValue);

const safeAsync = async (operation, context, defaultValue = null) => {
    try {
        return await operation();
    } catch (error) {
        return handleErrorWithDefault(error, context, defaultValue);
    }
};

const safeSync = (operation, context, defaultValue = null) => {
    try {
        return operation();
    } catch (error) {
        return handleErrorWithDefault(error, context, defaultValue);
    }
};

const createModuleErrorHandler = moduleName => ({
    handle: (error, context, shouldThrow = true) =>
        handleError(error, `${moduleName}.${context}`, shouldThrow),
    handleWithDefault: (error, context, defaultValue = null) =>
        handleErrorWithDefault(error, `${moduleName}.${context}`, defaultValue),
    safeAsync: (operation, context, defaultValue = null) =>
        safeAsync(operation, `${moduleName}.${context}`, defaultValue),
    safeSync: (operation, context, defaultValue = null) =>
        safeSync(operation, `${moduleName}.${context}`, defaultValue),
});

const createValidationError = (message, context = null) => new ValidationError(message, context);
const createParseError = (message, context = null) => new ParseError(message, context);
const createInferenceError = (message, context = null) => new InferenceError(message, context);
const createPlanningError = (message, context = null) => new PlanningError(message, context);
const createMemoryError = (message, context = null) => new MemoryError(message, context);

const isValidationError = error => error instanceof ValidationError;
const isParseError = error => error instanceof ParseError;
const isInferenceError = error => error instanceof InferenceError;
const isPlanningError = error => error instanceof PlanningError;
const isMemoryError = error => error instanceof MemoryError;

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
     * @returns {Promise&lt;*&gt;} Result of operation or default value
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

// Export common error types
const ErrorTypes = {
    ValidationError: createValidationError,
    ParseError: createParseError,
    InferenceError: createInferenceError,
    PlanningError: createPlanningError,
    MemoryError: createMemoryError
};

export {
    UnifiedErrorHandler,
    createUnifiedErrorHandler,
    ErrorTypes,
    handleError,
    handleErrorWithDefault,
    safeAsync,
    safeSync,
    createModuleErrorHandler,
    createValidationError,
    createParseError,
    createInferenceError,
    createPlanningError,
    createMemoryError,
    isValidationError,
    isParseError,
    isInferenceError,
    isPlanningError,
    isMemoryError,
    ValidationError,
    ParseError,
    InferenceError,
    PlanningError,
    MemoryError,
};