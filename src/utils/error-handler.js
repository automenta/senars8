const { error: logError } = require('./logger');

/**
 * Standardized error handling utilities
 * 
 * Provides consistent error handling across the application with logging
 * and optional error throwing or default value return.
 * 
 * @module error-handler
 */

/**
 * Custom error classes for specific error types
 */
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

/**
 * Handles errors with consistent logging and error creation
 * 
 * Logs the error and optionally throws a new error with context information.
 * 
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {boolean} [shouldThrow=true] - Whether to throw a new error or just log
 * @returns {Error|null} New error if shouldThrow is true, null otherwise
 * @throws {Error} If shouldThrow is true, throws a new error with context
 * 
 * @example
 * try {
 *   // Some operation that might fail
 * } catch (error) {
 *   handleError(error, 'Database connection');
 * }
 */
function handleError(error, context, shouldThrow = true) {
    logError(`${context}:`, error);
    
    if (shouldThrow) {
        // Preserve the original error type if it's one of our custom errors
        if (error instanceof ValidationError || error instanceof ParseError || error instanceof InferenceError) {
            error.message = `${context}: ${error.message}`;
            return error;
        }
        return new Error(`${context}: ${error.message}`);
    }
    
    return null;
}

/**
 * Handles errors with a default return value
 * 
 * Logs the error and returns a default value instead of throwing.
 * 
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {*} [defaultValue=null] - Default value to return
 * @returns {*} The default value
 * 
 * @example
 * const result = handleErrorWithDefault(error, 'API call', []);
 */
function handleErrorWithDefault(error, context, defaultValue = null) {
    logError(`${context}:`, error);
    return defaultValue;
}

/**
 * Wraps an async function with error handling
 * 
 * Creates a wrapper function that catches errors and returns a default value.
 * 
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context where the error occurred
 * @param {*} [defaultValue=null] - Default value to return on error
 * @returns {Function} Wrapped function that handles errors
 * 
 * @example
 * const safeFetch = withErrorHandling(fetch, 'Data fetch', {});
 */
function withErrorHandling(fn, context, defaultValue = null) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            return handleErrorWithDefault(error, context, defaultValue);
        }
    };
}

/**
 * Creates a validation error
 * 
 * @param {string} message - Error message
 * @returns {ValidationError} Validation error instance
 */
function createValidationError(message) {
    return new ValidationError(message);
}

/**
 * Creates a parse error
 * 
 * @param {string} message - Error message
 * @returns {ParseError} Parse error instance
 */
function createParseError(message) {
    return new ParseError(message);
}

/**
 * Creates an inference error
 * 
 * @param {string} message - Error message
 * @returns {InferenceError} Inference error instance
 */
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