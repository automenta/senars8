const { error: logError } = require('./logger');

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

function handleError(error, context, shouldThrow = true) {
    logError(`${context}:`, error);
    
    if (shouldThrow) {
        if (error instanceof ValidationError || error instanceof ParseError || error instanceof InferenceError) {
            error.message = `${context}: ${error.message}`;
            return error;
        }
        return new Error(`${context}: ${error.message}`);
    }
    
    return null;
}

function handleErrorWithDefault(error, context, defaultValue = null) {
    logError(`${context}:`, error);
    return defaultValue;
}

function withErrorHandling(fn, context, defaultValue = null) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            return handleErrorWithDefault(error, context, defaultValue);
        }
    };
}

function createValidationError(message) {
    return new ValidationError(message);
}

function createParseError(message) {
    return new ParseError(message);
}

function createInferenceError(message) {
    return new InferenceError(message);
}

module.exports = {
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