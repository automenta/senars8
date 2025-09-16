/**
 * Utility functions for input validation
 */

/**
 * Validates that a value is a non-empty string
 * @param {any} value - The value to validate
 * @param {string} name - The name of the value for error messages
 * @throws {Error} If the value is not a non-empty string
 */
function validateString(value, name = 'Value') {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`${name} must be a non-empty string`);
    }
}

/**
 * Validates that a value is a non-empty array
 * @param {any} value - The value to validate
 * @param {string} name - The name of the value for error messages
 * @throws {Error} If the value is not a non-empty array
 */
function validateNonEmptyArray(value, name = 'Value') {
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`${name} must be a non-empty array`);
    }
}

/**
 * Validates that a value is an array (can be empty)
 * @param {any} value - The value to validate
 * @param {string} name - The name of the value for error messages
 * @throws {Error} If the value is not an array
 */
function validateArray(value, name = 'Value') {
    if (!Array.isArray(value)) {
        throw new Error(`${name} must be an array`);
    }
}

/**
 * Validates that a value is a valid object (not null)
 * @param {any} value - The value to validate
 * @param {string} name - The name of the value for error messages
 * @throws {Error} If the value is not a valid object
 */
function validateObject(value, name = 'Value') {
    if (typeof value !== 'object' || value === null) {
        throw new Error(`${name} must be a valid object`);
    }
}

/**
 * Validates that a value is a valid Task instance
 * @param {any} value - The value to validate
 * @param {string} name - The name of the value for error messages
 * @throws {Error} If the value is not a valid Task instance
 */
function validateTask(value, name = 'Value') {
    // Importing Task here would create a circular dependency
    // Instead, we check for the required properties
    if (!value || typeof value !== 'object' || !value.id || !value.termKey || !value.punctuation) {
        throw new Error(`${name} must be a valid Task instance`);
    }
}

/**
 * Validates that a value is a valid Term instance
 * @param {any} value - The value to validate
 * @param {string} name - The name of the value for error messages
 * @throws {Error} If the value is not a valid Term instance
 */
function validateTerm(value, name = 'Value') {
    // Importing Term here would create a circular dependency
    // Instead, we check for the required properties
    if (!value || typeof value !== 'object' || !value.key) {
        throw new Error(`${name} must be a valid Term instance`);
    }
}

export {
    validateString,
    validateNonEmptyArray,
    validateArray,
    validateObject,
    validateTask,
    validateTerm
};