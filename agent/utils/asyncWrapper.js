/**
 * Async wrapper utility to handle try-catch boilerplate for WebSocket handlers.
 * This reduces code duplication and provides consistent error handling with minimal overhead.
 * Note: For core system components, use the existing error handler system:
 * import {systemErrorHandler as errorHandler} from '../core/utils/errorHandler.js';
 * return await errorHandler.execute(async () => { ... });
 */

import {error as serverError} from '../../core/utils/logger.js';

/**
 * Executes an async function with try-catch error handling for WebSocket communication.
 * This replaces the repetitive try-catch blocks in API handlers with minimal function call overhead.
 * @param {Function} asyncFn - The async function to execute
 * @param {WebSocket} ws - The WebSocket instance to send error responses
 * @param {string} operationName - Name of the operation for logging purposes
 */
export const executeAsync = async (asyncFn, ws, operationName = 'operation') => {
    try {
        return await asyncFn();
    } catch (error) {
        // Minimal overhead: direct error handling without additional function calls
        const errorMessage = `Failed to ${operationName}: ${error.message}`;
        serverError(errorMessage, error);
        ws.send(JSON.stringify({
            type: 'error',
            payload: {message: errorMessage}
        }));
    }
};

/**
 * Alternative execution function that allows custom error response format
 * @param {Function} asyncFn - The async function to execute
 * @param {WebSocket} ws - The WebSocket instance to send error responses
 * @param {Object} options - Configuration options
 * @param {string} options.operationName - Name of the operation for logging
 * @param {Function} options.formatError - Custom function to format error response
 */
export const executeAsyncCustom = async (asyncFn, ws, options = {}) => {
    const {operationName = 'operation', formatError} = options;

    try {
        return await asyncFn();
    } catch (error) {
        const errorMessage = `Failed to ${operationName}: ${error.message}`;
        serverError(errorMessage, error);

        // Use inline formatting when no custom formatter is provided to reduce function calls
        const errorResponse = formatError
            ? formatError(error, errorMessage)
            : {type: 'error', payload: {message: errorMessage}};

        ws.send(JSON.stringify(errorResponse));
    }
};

/**
 * Specific execution function for file system operations (optimized version)
 */
export const executeFileOperation = async (asyncFn, ws, operationName) => {
    // Direct call without intermediate function to reduce overhead
    try {
        return await asyncFn();
    } catch (error) {
        const errorMessage = `Failed to ${operationName}: ${error.message}`;
        serverError(errorMessage, error);
        ws.send(JSON.stringify({
            type: 'error',
            payload: {message: errorMessage}
        }));
    }
};

/**
 * Specific execution function for command operations (optimized version)
 */
export const executeCommandOperation = async (asyncFn, ws, operationName) => {
    try {
        return await asyncFn();
    } catch (error) {
        const errorMessage = `Failed to ${operationName}: ${error.message}`;
        serverError(errorMessage, error);
        // Direct response format for command operations to avoid function call overhead
        ws.send(JSON.stringify({
            type: 'commandOutput',
            payload: {stdout: '', stderr: error.message}
        }));
    }
};

/**
 * High-performance wrapper for operations that don't need custom error messages
 * @param {Function} asyncFn - The async function to execute
 * @param {WebSocket} ws - The WebSocket instance to send error responses
 * @param {string} [errorMessage='Operation failed'] - The error message to send
 */
export const executeWithDefaultError = async (asyncFn, ws, errorMessage = 'Operation failed') => {
    try {
        return await asyncFn();
    } catch (error) {
        serverError(errorMessage, error);
        ws.send(JSON.stringify({
            type: 'error',
            payload: {message: `${errorMessage}: ${error.message}`}
        }));
    }
};

/**
 * Utility to convert an async function to the errorHandler.execute() pattern
 * for consistency with the core error handling system in the agent layer.
 * @param {Function} asyncFn - The function body to execute within error handling
 * @param {string} context - Context for error logging
 * @param {*} [defaultValue=null] - Default value to return on error
 * @returns {*} Result of asyncFn or defaultValue on error
 */
export const withCoreErrorHandler = async (asyncFn, context, defaultValue = null) => {
    // This function would typically import the errorHandler from core
    // For this implementation, we'll use the executeAsync pattern for agent layer
    // In core system files, use: return await errorHandler.execute(async () => { ... }, context, defaultValue);
    try {
        return await asyncFn();
    } catch (error) {
        serverError(`Error in ${context}:`, error);
        return defaultValue;
    }
};