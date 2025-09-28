// Import from common utilities to avoid duplication
import { validationUtils } from '@common/index.js';
import {isEmptyArray} from './collections/index.js';

// For backward compatibility, re-export functions but keep core-specific implementation for nonEmptyArray
const { 
    string,
    array,
    object,
    task,
    validateTerm,
    validatePunctuation,
    validateTruthValue,
    withValidator,
    conditional,
    validateTermInner,
    validatePunctuationInner,
    validateTruthValueInner
} = validationUtils;

// Keep the core-specific nonEmptyArray function since it uses the core isEmptyArray
export function nonEmptyArray(value, name = 'Value') {
    if (isEmptyArray(value)) {
        throw new Error(`${name} must be a non-empty array`);
    }
}

export {
    string,
    nonEmptyArray,
    array,
    object,
    task,
    validateTerm,
    validatePunctuation,
    validateTruthValue,
    withValidator,
    conditional,
    validateTermInner,
    validatePunctuationInner,
    validateTruthValueInner
};