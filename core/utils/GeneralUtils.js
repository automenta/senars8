import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('GeneralUtils');

/**
 * Utility for safely executing functions with error handling
 * @param {Function} fn - Function to execute
 * @param {string} operationName - Name of the operation for logging
 * @param {*} defaultValue - Default value to return on error
 * @returns {*} Result of function execution or default value
 */
function safeExecute(fn, operationName, defaultValue = null) {
    return errorHandler.executeSync(() => {
        return fn();
    }, operationName, defaultValue);
}

/**
 * Utility to wait for a condition with timeout
 * @param {Function} condition - Condition function to evaluate
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} intervalMs - Polling interval in milliseconds
 * @returns {Promise<boolean>} Promise that resolves when condition is met or timeout occurs
 */
function waitForCondition(condition, timeoutMs = 5000, intervalMs = 100) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const checkCondition = () => {
            if (condition()) {
                resolve(true);
                return;
            }

            if (Date.now() - startTime >= timeoutMs) {
                resolve(false);
                return;
            }

            setTimeout(checkCondition, intervalMs);
        };

        checkCondition();
    });
}

/**
 * Utility to create a promise that resolves after a delay
 * @param {number} delayMs - Delay in milliseconds
 * @returns {Promise} Promise that resolves after delay
 */
function delay(delayMs) {
    return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Utility to debounce a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Utility to throttle a function
 * @param {Function} fn - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(fn, delay) {
    let shouldWait = false;
    return function (...args) {
        if (!shouldWait) {
            fn.apply(this, args);
            shouldWait = true;
            setTimeout(() => {
                shouldWait = false;
            }, delay);
        }
    };
}

/**
 * Utility to check if a value is a promise
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a promise
 */
function isPromise(value) {
    return Boolean(value && typeof value.then === 'function');
}

/**
 * Utility to create a deep clone of an object
 * @param {*} obj - Object to clone
 * @returns {*} Deep clone of the object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
}

/**
 * Utility to merge objects deeply
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
function deepMerge(...objects) {
    const result = {};

    for (const obj of objects) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    result[key] = deepMerge(result[key] || {}, obj[key]);
                } else {
                    result[key] = obj[key];
                }
            }
        }
    }

    return result;
}

// Import the more sophisticated ID generator from idGenerator.js
import {generateId as generateCoreId} from './idGenerator.js';

/**
 * Utility to generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return generateCoreId();
}

/**
 * Utility to format time duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Utility to clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Utility to round a number to a specific number of decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
function round(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

export {
    safeExecute,
    waitForCondition,
    delay,
    debounce,
    throttle,
    isPromise,
    deepClone,
    deepMerge,
    generateId,
    formatDuration,
    clamp,
    round
};