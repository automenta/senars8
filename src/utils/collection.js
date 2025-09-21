/**
 * Filters an array of objects based on a property and its value.
 * @param {Array} array - The array to filter.
 * @param {string} property - The name of the property to check.
 * @param {*} value - The value the property should have.
 * @returns {Array} The filtered array.
 */
export const filterByProperty = (array, property, value) =>
    Array.isArray(array) ? array.filter(item => item?.[property] === value) : [];

/**
 * Ensures the input is an array. If it's not an array, it wraps it in one.
 * @param {*} input - The input to normalize.
 * @returns {Array} The normalized array.
 */
export const normalizeToArray = input => (Array.isArray(input) ? input : [input]);

/**
 * Checks if the input is a non-empty array.
 * @param {*} input - The input to check.
 * @returns {boolean} True if the input is a non-empty array.
 */
export const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

/**
 * Checks if the input is an empty array.
 * @param {*} input - The input to check.
 * @returns {boolean} True if the input is an empty array.
 */
export const isEmptyArray = input => !isNonEmptyArray(input);

/**
 * Checks if the input is a plain object (and not an array or null).
 * @param {*} input - The input to check.
 * @returns {boolean} True if the input is a plain object.
 */
export const isPlainObject = input =>
    input !== null && typeof input === 'object' && !Array.isArray(input);

/**
 * Checks if the input is a non-empty plain object.
 * @param {*} input - The input to check.
 * @returns {boolean} True if the input is a non-empty plain object.
 */
export const isNonEmptyObject = input => isPlainObject(input) && Object.keys(input).length > 0;

/**
 * Sums the values of a specific property in an array of objects.
 * @param {Array<Object>} array - The array of objects.
 * @param {string} property - The property to sum.
 * @returns {number} The total sum.
 */
export const sumBy = (array, property) =>
    Array.isArray(array) ? array.reduce((acc, item) => acc + (item?.[property] || 0), 0) : 0;

/**
 * Safely gets a nested property from an object using a dot-separated path.
 * @param {Object} obj - The object to query.
 * @param {string|Array<string>} path - The path to the property.
 * @param {*} defaultValue - The default value to return if the path is not found.
 * @returns {*} The value of the property or the default value.
 */
export const safeGet = (obj, path, defaultValue = undefined) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    const result = keys.reduce((acc, key) => acc?.[key], obj);
    return result !== undefined ? result : defaultValue;
};
