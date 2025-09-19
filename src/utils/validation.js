import {isEmptyArray} from './core.js';

const validateString = (value, name = 'Value') => {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`${name} must be a non-empty string`);
    }
};

const validateNonEmptyArray = (value, name = 'Value') => {
    if (isEmptyArray(value)) {
        throw new Error(`${name} must be a non-empty array`);
    }
};

const validateArray = (value, name = 'Value') => {
    if (!Array.isArray(value)) {
        throw new Error(`${name} must be an array`);
    }
};

const validateObject = (value, name = 'Value') => {
    if (typeof value !== 'object' || value === null) {
        throw new Error(`${name} must be a valid object`);
    }
};

const validateTask = (value, name = 'Value') => {
    if (!value || typeof value !== 'object' || !value.id || !value.termKey || !value.punctuation) {
        throw new Error(`${name} must be a valid Task instance`);
    }
};

const validateTerm = (term, name = 'Term') => {
    const isValidString = typeof term === 'string' && term.length > 0;
    const isValidObject = typeof term === 'object' && term !== null && typeof term.key === 'string' && term.key.length > 0;

    if (!isValidString && !isValidObject) {
        throw new Error(`${name} must be a non-empty string or a valid object with a key property`);
    }
};

const validatePunctuation = (punctuation, name = 'Punctuation') => {
    const validPunctuation = ['.', '!', '?'];
    if (!validPunctuation.includes(punctuation)) {
        throw new Error(`${name} must be one of: ${validPunctuation.join(', ')}`);
    }
};

const validateTruthValue = (truthValue, name = 'TruthValue') => {
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
};

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