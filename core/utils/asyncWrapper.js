/**
 * @fileoverview Async wrapper utility to handle boilerplate for error handling.
 * This reduces code duplication and provides consistent error handling with minimal overhead.
 */

import {createUnifiedErrorHandler} from './errorHandler.js';

/**
 * Wraps an asynchronous function with a unified error handler.
 * @param {Function} asyncFn - The asynchronous function to wrap.
 * @param {string} moduleName - The name of the module for error handling context.
 * @param {string} context - The context of the operation for logging purposes.
 * @param {*} [defaultValue=null] - The default value to return on error.
 * @returns {Function} A new function that executes the original function with error handling.
 */
export const wrapAsync = (asyncFn, moduleName, context, options = {}) => {
    const errorHandler = createUnifiedErrorHandler(moduleName);
    const {
        defaultValue = null, rethrow = false
    } = options;

    return async (...args) => {
        return errorHandler.runAsync(
            () => asyncFn(...args),
            context, {
                defaultValue,
                rethrow
            }
        );
    };
};