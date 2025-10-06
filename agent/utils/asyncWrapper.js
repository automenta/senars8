import {createUnifiedErrorHandler} from '../../core/utils/errorHandler.js';
import {error as logError} from '../../core/utils/logger.js';

const wsErrorHandler = createUnifiedErrorHandler('WebSocket');

// WebSocket-specific error handling with response formatting
const handleWebSocketError = (error, ws, operation) => {
    const message = `WebSocket ${operation} failed: ${error.message}`;
    logError(message, error);

    const response = {type: 'error', payload: {message}};
    ws?.send(JSON.stringify(response));
};

// Async execution with WebSocket error handling
export const executeAsync = async (fn, ws, operation = 'operation') => {
    try {
        return await fn();
    } catch (error) {
        handleWebSocketError(error, ws, operation);
    }
};

// File operation wrapper
export const executeFileOperation = (fn, ws, operation) =>
    executeAsync(fn, ws, `file ${operation}`);

// Command operation wrapper with custom error formatting
export const executeCommandOperation = async (fn, ws, operation) => {
    try {
        return await fn();
    } catch (error) {
        const message = `Command ${operation} failed: ${error.message}`;
        logError(message, error);
        ws?.send(JSON.stringify({
            type: 'commandOutput',
            payload: {stdout: '', stderr: message}
        }));
    }
};

// Custom async execution with options
export const executeAsyncCustom = async (fn, ws, options = {}) => {
    try {
        return await fn();
    } catch (error) {
        const operation = options.operationName || 'operation';
        const message = `${operation} failed: ${error.message}`;
        logError(message, error);

        const response = options.formatError
            ? options.formatError(error, message)
            : {type: options.type || 'error', payload: {message}};

        ws?.send(JSON.stringify(response));
        return options.defaultValue;
    }
};

// Simple error wrapper for WebSocket responses
export const executeWithDefaultError = (fn, ws, message = 'Operation failed') =>
    executeAsync(fn, ws, message.split(' ')[0].toLowerCase());

// Sync operation with core error handler
export const withCoreErrorHandler = (fn, context, defaultValue = null) =>
    wsErrorHandler.executeSync(fn, context, {defaultValue});