import {error as logError} from './logger.js';

// Error classes
class ValidationError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'ValidationError';
        this.context = context;
    }
}

class ParseError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'ParseError';
        this.context = context;
    }
}

class InferenceError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'InferenceError';
        this.context = context;
    }
}

class PlanningError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'PlanningError';
        this.context = context;
    }
}

class MemoryError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'MemoryError';
        this.context = context;
    }
}

// Consistent error handling functions
function logAndReturn(error, context, returnValue = null) {
    // Normalize and prepare error for logging
    const preparedError = prepareErrorForLogging(error);

    // Add context to error message
    const fullContext = context ? `[${context}] ` : '';
    const errorMessage = `${fullContext}${preparedError.message}`;

    // Log with full context
    logError(errorMessage, preparedError);
    return returnValue;
}

function logAndThrow(error, context) {
    // Normalize and prepare error for logging
    const preparedError = prepareErrorForLogging(error);

    // Add context to error message if context is provided and not already present
    if (context && !/\[.*?\]/.test(preparedError.message)) {
        preparedError.message = `[${context}] ${preparedError.message}`;
    }

    // Preserve specific error types, and don't re-wrap our own wrapped errors.
    if (!isKnownErrorType(preparedError) && !preparedError.originalError) {
        // Create a new error with the same message and stack
        const newError = new Error(preparedError.message);
        newError.originalStack = preparedError.stack || preparedError.originalStack;
        newError.originalError = preparedError;
        logError(newError.message, newError);
        throw newError;
    }

    logError(preparedError.message, preparedError);
    throw preparedError;
}

/**
 * Prepares an error for logging by handling null/undefined cases and preserving stack traces
 * @param {Error|null|undefined} error - The error to prepare
 * @returns {Error} The prepared error object
 */
function prepareErrorForLogging(error) {
    // Handle null or undefined errors
    if (error == null) {
        const nullError = new Error('Null or undefined error');
        nullError.originalStack = new Error().stack;
        return nullError;
    }

    // Preserve original stack trace if available
    if (error.stack && !error.originalStack) {
        error.originalStack = error.stack;
    }

    return error;
}

/**
 * Checks if an error is one of our known error types
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is a known type
 */
function isKnownErrorType(error) {
    return error instanceof ValidationError ||
        error instanceof ParseError ||
        error instanceof InferenceError ||
        error instanceof PlanningError ||
        error instanceof MemoryError;
}

function handleError(error, context, shouldThrow = true) {
    return shouldThrow ? logAndThrow(error, context) : logAndReturn(error, context, null);
}

function handleErrorWithDefault(error, context, defaultValue = null) {
    return logAndReturn(error, context, defaultValue);
}

// Utility function to wrap async operations with error handling
async function safeAsync(operation, context, defaultValue = null) {
    try {
        return await operation();
    } catch (error) {
        return handleErrorWithDefault(error, context, defaultValue);
    }
}

// Utility function to wrap synchronous operations with error handling
function safeSync(operation, context, defaultValue = null) {
    try {
        return operation();
    } catch (error) {
        return handleErrorWithDefault(error, context, defaultValue);
    }
}

// Utility to create a standardized error handler for modules
function createModuleErrorHandler(moduleName) {
    return {
        handle: (error, context, shouldThrow = true) =>
            handleError(error, `${moduleName}.${context}`, shouldThrow),
        handleWithDefault: (error, context, defaultValue = null) =>
            handleErrorWithDefault(error, `${moduleName}.${context}`, defaultValue),
        safeAsync: (operation, context, defaultValue = null) =>
            safeAsync(operation, `${moduleName}.${context}`, defaultValue),
        safeSync: (operation, context, defaultValue = null) =>
            safeSync(operation, `${moduleName}.${context}`, defaultValue)
    };
}

// Factory functions for specific error types with context
/**
 * Creates a ValidationError with optional context
 * @param {string} message - The error message
 * @param {string|null} context - The context where the error occurred
 * @returns {ValidationError} The created error
 */
const createValidationError = (message, context = null) => new ValidationError(message, context);

/**
 * Creates a ParseError with optional context
 * @param {string} message - The error message
 * @param {string|null} context - The context where the error occurred
 * @returns {ParseError} The created error
 */
const createParseError = (message, context = null) => new ParseError(message, context);

/**
 * Creates an InferenceError with optional context
 * @param {string} message - The error message
 * @param {string|null} context - The context where the error occurred
 * @returns {InferenceError} The created error
 */
const createInferenceError = (message, context = null) => new InferenceError(message, context);

/**
 * Creates a PlanningError with optional context
 * @param {string} message - The error message
 * @param {string|null} context - The context where the error occurred
 * @returns {PlanningError} The created error
 */
const createPlanningError = (message, context = null) => new PlanningError(message, context);

/**
 * Creates a MemoryError with optional context
 * @param {string} message - The error message
 * @param {string|null} context - The context where the error occurred
 * @returns {MemoryError} The created error
 */
const createMemoryError = (message, context = null) => new MemoryError(message, context);

// Error type checking functions
/**
 * Checks if an error is a ValidationError
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is a ValidationError
 */
const isValidationError = error => error instanceof ValidationError;

/**
 * Checks if an error is a ParseError
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is a ParseError
 */
const isParseError = error => error instanceof ParseError;

/**
 * Checks if an error is an InferenceError
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is an InferenceError
 */
const isInferenceError = error => error instanceof InferenceError;

/**
 * Checks if an error is a PlanningError
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is a PlanningError
 */
const isPlanningError = error => error instanceof PlanningError;

/**
 * Checks if an error is a MemoryError
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is a MemoryError
 */
const isMemoryError = error => error instanceof MemoryError;

export {
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
    MemoryError
};
