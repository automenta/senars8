import { error as logError } from './logger.js';

// Error classes
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class ParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParseError';
    }
}

class InferenceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InferenceError';
    }
}

class PlanningError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PlanningError';
    }
}

class MemoryError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MemoryError';
    }
}

// Consistent error handling functions
function logAndReturn(error, context, returnValue = null) {
    logError(`${context}:`, error);
    return returnValue;
}

function logAndThrow(error, context) {
    logError(`${context}:`, error);

    // Preserve specific error types or create a generic one
    if (error instanceof ValidationError ||
        error instanceof ParseError ||
        error instanceof InferenceError ||
        error instanceof PlanningError ||
        error instanceof MemoryError) {
        error.message = `${context}: ${error.message}`;
        return error;
    }

    return new Error(`${context}: ${error.message}`);
}

function handleError(error, context, shouldThrow = true) {
    return shouldThrow ? logAndThrow(error, context) : logAndReturn(error, context, null);
}

function handleErrorWithDefault(error, context, defaultValue = null) {
    return logAndReturn(error, context, defaultValue);
}

function withErrorHandling(fn, context, defaultValue = null) {
    return async(...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            return handleErrorWithDefault(error, context, defaultValue);
        }
    };
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

// Factory functions for specific error types
const createValidationError = message => new ValidationError(message);
const createParseError = message => new ParseError(message);
const createInferenceError = message => new InferenceError(message);
const createPlanningError = message => new PlanningError(message);
const createMemoryError = message => new MemoryError(message);

// Error type checking functions
const isValidationError = error => error instanceof ValidationError;
const isParseError = error => error instanceof ParseError;
const isInferenceError = error => error instanceof InferenceError;
const isPlanningError = error => error instanceof PlanningError;
const isMemoryError = error => error instanceof MemoryError;

export {
    handleError,
    handleErrorWithDefault,
    withErrorHandling,
    safeAsync,
    safeSync,
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
