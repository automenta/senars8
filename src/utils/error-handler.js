/**
 * Standardized error handling utilities
 */

/**
 * Handles errors with consistent logging and error creation
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {boolean} shouldThrow - Whether to throw a new error or just log
 * @returns {Error|null} New error if shouldThrow is true, null otherwise
 */
function handleError(error, context, shouldThrow = true) {
    console.error(`${context}:`, error);
    
    if (shouldThrow) {
        return new Error(`${context}: ${error.message}`);
    }
    
    return null;
}

/**
 * Handles errors with a default return value
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {*} defaultValue - Default value to return
 * @returns {*} Default value
 */
function handleErrorWithDefault(error, context, defaultValue = null) {
    console.error(`${context}:`, error);
    return defaultValue;
}

/**
 * Wraps an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context where the error occurred
 * @param {*} defaultValue - Default value to return on error
 * @returns {Function} Wrapped function
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

module.exports = {
    handleError,
    handleErrorWithDefault,
    withErrorHandling
};