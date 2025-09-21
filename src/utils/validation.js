import Validator from './Validator.js';

const validateString = (value, name = 'Value') => Validator.validateString(value, name);
const validateNonEmptyArray = (value, name = 'Value') => Validator.validateNonEmptyArray(value, name);
const validateArray = (value, name = 'Value') => Validator.validateArray(value, name);
const validateObject = (value, name = 'Value') => Validator.validateObject(value, name);
const validateTask = (value, name = 'Value') => Validator.validateTask(value, name);
const validateTerm = (term, name = 'Term') => Validator.validateTerm(term, name);
const validatePunctuation = (punctuation, name = 'Punctuation') => Validator.validatePunctuation(punctuation, name);
const validateTruthValue = (truthValue, name = 'TruthValue') => Validator.validateTruthValue(truthValue, name);

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