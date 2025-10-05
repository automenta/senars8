/**
 * Async wrapper utility to handle try-catch boilerplate for WebSocket handlers.
 * This reduces code duplication and provides consistent error handling with minimal overhead.
 * Note: For core system components, use the existing error handler system:
 * import {systemErrorHandler as errorHandler} from '../core/utils/errorHandler.js';
 * return await errorHandler.execute(async () => { ... });
 */

import {error as serverError} from '../../core/utils/logger.js';

/**
 * Core async execution wrapper for WebSocket operations
 * @param {Function} fn - Async function to execute
 * @param {WebSocket} ws - WebSocket for error responses
 * @param {string} op - Operation name for logging
 * @param {Object} config - Configuration options
 */
const executeAsyncCore = async (fn, ws, op, config = {}) => {
    const {type = 'error', formatError, defaultValue} = config;
    try {
        return await fn();
    } catch (error) {
        const msg = `Failed to ${op}: ${error.message}`;
        serverError(msg, error);

        const response = formatError
            ? formatError(error, msg)
            : {type, payload: {message: msg}};

        ws?.send(JSON.stringify(response));
        return defaultValue ?? undefined;
    }
};

// Execution wrappers - consolidated and terse
export const executeAsync = (fn, ws, op = 'operation') => executeAsyncCore(fn, ws, op);
export const executeFileOperation = (fn, ws, op) => executeAsyncCore(fn, ws, op);
export const executeCommandOperation = (fn, ws, op) => executeAsyncCore(fn, ws, op, {
  type: 'commandOutput',
  formatError: () => ({type: 'commandOutput', payload: {stdout: '', stderr: error.message}})
});
export const executeAsyncCustom = (fn, ws, options = {}) =>
  executeAsyncCore(fn, ws, options.operationName || 'operation', options);
export const executeWithDefaultError = (fn, ws, msg = 'Operation failed') =>
  executeAsyncCore(fn, ws, msg.split(' ')[0].toLowerCase(), {
    formatError: (error) => ({type: 'error', payload: {message: `${msg}: ${error.message}`}})
  });
export const withCoreErrorHandler = (fn, context, defaultValue = null) =>
  executeAsyncCore(fn, null, context, {defaultValue});