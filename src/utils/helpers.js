/**
 * Normalizes an input to always be an array.
 * If the input is already an array, it is returned as is.
 * If the input is not an array, it is wrapped in a new array.
 *
 * @param {*} input - The input to normalize.
 * @returns {Array} The normalized array.
 * @example
 * normalizeToArray(1) // returns [1]
 * normalizeToArray([1, 2]) // returns [1, 2]
 */
const normalizeToArray = input => (Array.isArray(input) ? input : [input]);

/**
 * Checks if the input is a non-empty array.
 *
 * @param {*} input - The input to check.
 * @returns {boolean} True if the input is an array with at least one element, false otherwise.
 * @example
 * isNonEmptyArray([1]) // returns true
 * isNonEmptyArray([]) // returns false
 * isNonEmptyArray(null) // returns false
 */
const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

export {
    normalizeToArray,
    isNonEmptyArray
};
