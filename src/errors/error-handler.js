import { error as logError } from '../utils/logger.js';

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

// Consistent error handling functions
function logAndReturn(error, context, returnValue = null) {
    logError(`${context}:`, error);
    return returnValue;
}

function logAndThrow(error, context) {
    logError(`${context}:`, error);

    // Preserve specific error types or create a generic one
    if (error instanceof ValidationError || error instanceof ParseError || error instanceof InferenceError) {
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

// Factory functions for specific error types
const createValidationError = message => new ValidationError(message);
const createParseError = message => new ParseError(message);
const createInferenceError = message => new InferenceError(message);

export {
    handleError,
    handleErrorWithDefault,
    withErrorHandling,
    createValidationError,
    createParseError,
    createInferenceError,
    ValidationError,
    ParseError,
    InferenceError
};
