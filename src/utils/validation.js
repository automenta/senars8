import {Validation} from './Validation.js';

const validateString = (value, name = 'Value') => Validation.string(value, name);
const validateNonEmptyArray = (value, name = 'Value') => Validation.nonEmptyArray(value, name);
const validateArray = (value, name = 'Value') => Validation.array(value, name);
const validateObject = (value, name = 'Value') => Validation.object(value, name);
const validateTask = (value, name = 'Value') => Validation.task(value, name);
const validateTerm = (term, name = 'Term') => Validation.term(term, name);
const validatePunctuation = (punctuation, name = 'Punctuation') => Validation.punctuation(punctuation, name);
const validateTruthValue = (truthValue, name = 'TruthValue') => Validation.truthValue(truthValue, name);

export {
    Validation,
    validateString,
    validateNonEmptyArray,
    validateArray,
    validateObject,
    validateTask,
    validateTerm,
    validatePunctuation,
    validateTruthValue
};