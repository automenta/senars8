/**
 * Utility functions for array manipulation
 */

/**
 * Normalize input to an array
 * @param {*} input - Input to normalize
 * @returns {Array} Normalized array
 */
function normalizeToArray(input) {
    return Array.isArray(input) ? input : [input];
}

/**
 * Check if input is a non-empty array
 * @param {*} input - Input to check
 * @returns {boolean} True if input is a non-empty array
 */
function isNonEmptyArray(input) {
    return Array.isArray(input) && input.length > 0;
}

module.exports = {
    normalizeToArray,
    isNonEmptyArray
};