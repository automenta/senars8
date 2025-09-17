import { isEmptyArray } from './helpers.js';
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
    if (isEmptyArray(value)) {
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

function validateTerm(term, name = 'Term') {
    if (term === null || term === undefined) {
        throw new Error(`${name} is required`);
    }
    if (typeof term === 'string') {
        if (term.length === 0) {
            throw new Error(`${name} must be a non-empty string`);
        }
    } else if (typeof term === 'object') {
        if (!term.key || typeof term.key !== 'string' || term.key.length === 0) {
            throw new Error(`${name} must have a valid key property`);
        }
    } else {
        throw new Error(`${name} must be a string or object`);
    }
}

function validatePunctuation(punctuation, name = 'Punctuation') {
    const validPunctuation = ['.', '!', '?'];
    if (!validPunctuation.includes(punctuation)) {
        throw new Error(`${name} must be one of: ${validPunctuation.join(', ')}`);
    }
}

function validateTruthValue(truthValue, name = 'TruthValue') {
    if (!truthValue || typeof truthValue !== 'object') {
        throw new Error(`${name} must be an object`);
    }
    if (typeof truthValue.frequency !== 'number' ||
        truthValue.frequency < 0 || truthValue.frequency > 1) {
        throw new Error(`${name}.frequency must be a number between 0 and 1`);
    }
    if (typeof truthValue.confidence !== 'number' ||
        truthValue.confidence < 0 || truthValue.confidence > 1) {
        throw new Error(`${name}.confidence must be a number between 0 and 1`);
    }
}

export {
    validateString,
    validateNonEmptyArray,
    validateArray,
    validateObject,
    validateTask,
    validateTerm,
    validatePunctuation,
    validateTruthValue
};