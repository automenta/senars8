import {isEmptyArray} from './collections/index.js';

/**
 * Validate that a value is a non-empty string
 * @param {*} value - Value to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function string(value, name = 'Value') {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`${name} must be a non-empty string`);
    }
}

/**
 * Validate that a value is a non-empty array
 * @param {*} value - Value to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function nonEmptyArray(value, name = 'Value') {
    if (isEmptyArray(value)) {
        throw new Error(`${name} must be a non-empty array`);
    }
}

/**
 * Validate that a value is an array
 * @param {*} value - Value to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function array(value, name = 'Value') {
    if (!Array.isArray(value)) {
        throw new Error(`${name} must be an array`);
    }
}

/**
 * Validate that a value is a valid object
 * @param {*} value - Value to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function object(value, name = 'Value') {
    if (typeof value !== 'object' || value === null) {
        throw new Error(`${name} must be a valid object`);
    }
}

/**
 * Validate that a value is a valid Task instance
 * @param {*} value - Value to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function task(value, name = 'Value') {
    if (!value || typeof value !== 'object' || !value.id || !value.termKey || !value.punctuation) {
        throw new Error(`${name} must be a valid Task instance`);
    }
}

/**
 * Validate that a value is a valid Term
 * @param {*} term - Term to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function validateTerm(term, name = 'Term') {
    const isValidString = typeof term === 'string' && term.length > 0;
    const isValidObject = typeof term === 'object' && term !== null && typeof term.key === 'string' && term.key.length > 0;

    if (!isValidString && !isValidObject) {
        throw new Error(`${name} must be a non-empty string or a valid object with a key property`);
    }
}

/**
 * Validate that a value is valid punctuation
 * @param {*} punctuation - Punctuation to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function validatePunctuation(punctuation, name = 'Punctuation') {
    const validPunctuation = ['.', '!', '?'];
    if (!validPunctuation.includes(punctuation)) {
        throw new Error(`${name} must be one of: ${validPunctuation.join(', ')}`);
    }
}

/**
 * Validate that a value is a valid truth value
 * @param {*} truthValue - Truth value to validate
 * @param {string} name - Name of the value for error messages
 * @throws {Error} If validation fails
 */
export function validateTruthValue(truthValue, name = 'TruthValue') {
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

/**
 * Validate a value with a custom validator function
 * @param {*} value - Value to validate
 * @param {Function} validator - Validation function that returns true/false
 * @param {string} errorMessage - Error message if validation fails
 * @throws {Error} If validation fails
 */
export function withValidator(value, validator, errorMessage) {
    if (typeof validator !== 'function') {
        throw new Error('Validator must be a function');
    }
    if (!validator(value)) {
        throw new Error(errorMessage);
    }
}

/**
 * Conditional validation - only validate if condition is true
 * @param {boolean} condition - Condition to check
 * @param {Function} validator - Validation function to execute if condition is true
 */
export function conditional(condition, validator) {
    if (condition) validator();
}

/** 
 * Inner validation functions that return boolean instead of throwing
 * These are optimized for inner operations where performance is more important than detailed error messages
 */

export function validateTermInner(term) {
    // For inner operations, return false instead of throwing for invalid terms
    if (!term) return false;
    const isValidString = typeof term === 'string' && term.length > 0;
    const isValidObject = typeof term === 'object' && term !== null && typeof term.key === 'string' && term.key.length > 0;
    return isValidString || isValidObject;
}

export function validatePunctuationInner(punctuation) {
    // For inner operations, return false instead of throwing for invalid punctuation
    const validPunctuation = ['.', '!', '?'];
    return validPunctuation.includes(punctuation);
}

export function validateTruthValueInner(truthValue) {
    // For inner operations, return false instead of throwing for invalid truth values
    if (!truthValue || typeof truthValue !== 'object') return false;
    if (typeof truthValue.frequency !== 'number' || truthValue.frequency < 0 || truthValue.frequency > 1) return false;
    if (typeof truthValue.confidence !== 'number' || truthValue.confidence < 0 || truthValue.confidence > 1) return false;
    return true;
}