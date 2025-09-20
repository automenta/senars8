import {
    error as logError
} from './logger.js';

const createErrorClass = (name) => {
    const NewError = class extends Error {
        constructor(message, context = null) {
            super(message);
            this.name = name;
            this.context = context;
        }
    };
    Object.defineProperty(NewError, 'name', {
        value: name
    });
    return NewError;
};

const ValidationError = createErrorClass('ValidationError');
const ParseError = createErrorClass('ParseError');
const InferenceError = createErrorClass('InferenceError');
const PlanningError = createErrorClass('PlanningError');
const MemoryError = createErrorClass('MemoryError');

const ERROR_TYPES = [ValidationError, ParseError, InferenceError, PlanningError, MemoryError];

const isKnownErrorType = error => ERROR_TYPES.some(type => error instanceof type);

const logAndReturn = (error, context, returnValue = null) => {
    const preparedError = prepareErrorForLogging(error);
    const fullContext = context ? `[${context}] ` : '';
    logError(`${fullContext}${preparedError.message}`, preparedError);
    return returnValue;
};

const logAndThrow = (error, context) => {
    const preparedError = prepareErrorForLogging(error);
    if (context && !/\[.*?\]/.test(preparedError.message)) {
        preparedError.message = `[${context}] ${preparedError.message}`;
    }

    if (!isKnownErrorType(preparedError) && !preparedError.originalError) {
        const newError = new Error(preparedError.message);
        newError.originalStack = preparedError.stack || preparedError.originalStack;
        newError.originalError = preparedError;
        logError(newError.message, newError);
        throw newError;
    }

    logError(preparedError.message, preparedError);
    throw preparedError;
};

const prepareErrorForLogging = error => {
    if (error == null) {
        const nullError = new Error('Null or undefined error');
        nullError.originalStack = new Error().stack;
        return nullError;
    }
    if (error.stack && !error.originalStack) {
        error.originalStack = error.stack;
    }
    return error;
};

const handleError = (error, context, shouldThrow = true) =>
    shouldThrow ? logAndThrow(error, context) : logAndReturn(error, context, null);

const handleErrorWithDefault = (error, context, defaultValue = null) =>
    logAndReturn(error, context, defaultValue);

const safeAsync = async (operation, context, defaultValue = null) => {
    try {
        return await operation();
    } catch (error) {
        return handleErrorWithDefault(error, context, defaultValue);
    }
};

const safeSync = (operation, context, defaultValue = null) => {
    try {
        return operation();
    } catch (error) {
        return handleErrorWithDefault(error, context, defaultValue);
    }
};

const createModuleErrorHandler = moduleName => ({
    handle: (error, context, shouldThrow = true) =>
        handleError(error, `${moduleName}.${context}`, shouldThrow),
    handleWithDefault: (error, context, defaultValue = null) =>
        handleErrorWithDefault(error, `${moduleName}.${context}`, defaultValue),
    safeAsync: (operation, context, defaultValue = null) =>
        safeAsync(operation, `${moduleName}.${context}`, defaultValue),
    safeSync: (operation, context, defaultValue = null) =>
        safeSync(operation, `${moduleName}.${context}`, defaultValue),
});

const createValidationError = (message, context = null) => new ValidationError(message, context);
const createParseError = (message, context = null) => new ParseError(message, context);
const createInferenceError = (message, context = null) => new InferenceError(message, context);
const createPlanningError = (message, context = null) => new PlanningError(message, context);
const createMemoryError = (message, context = null) => new MemoryError(message, context);

const isValidationError = error => error instanceof ValidationError;
const isParseError = error => error instanceof ParseError;
const isInferenceError = error => error instanceof InferenceError;
const isPlanningError = error => error instanceof PlanningError;
const isMemoryError = error => error instanceof MemoryError;

const validateString = (value, name = 'Value') => {
    if (typeof value !== 'string' || value.length === 0) {
        throw new ValidationError(`${name} must be a non-empty string`);
    }
};

const validateNonEmptyArray = (value, name = 'Value') => {
    if (!Array.isArray(value) || value.length === 0) {
        throw new ValidationError(`${name} must be a non-empty array`);
    }
};

const validateArray = (value, name = 'Value') => {
    if (!Array.isArray(value)) {
        throw new ValidationError(`${name} must be an array`);
    }
};

const validateObject = (value, name = 'Value') => {
    if (typeof value !== 'object' || value === null) {
        throw new ValidationError(`${name} must be a valid object`);
    }
};

const validateTask = (value, name = 'Value') => {
    if (!value || typeof value !== 'object' || !value.id || !value.termKey || !value.punctuation) {
        throw new ValidationError(`${name} must be a valid Task instance`);
    }
};

const validateTerm = (term, name = 'Term') => {
    const isValidString = typeof term === 'string' && term.length > 0;
    const isValidObject = typeof term === 'object' && term !== null && typeof term.key === 'string' && term.key.length > 0;

    if (!isValidString && !isValidObject) {
        throw new ValidationError(`${name} must be a non-empty string or a valid object with a key property`);
    }
};

const validatePunctuation = (punctuation, name = 'Punctuation') => {
    const validPunctuation = ['.', '!', '?'];
    if (!validPunctuation.includes(punctuation)) {
        throw new ValidationError(`${name} must be one of: ${validPunctuation.join(', ')}`);
    }
};

const validateTruthValue = (truthValue, name = 'TruthValue') => {
    if (!truthValue || typeof truthValue !== 'object') {
        throw new ValidationError(`${name} must be an object`);
    }

    if (typeof truthValue.frequency !== 'number' ||
        truthValue.frequency < 0 || truthValue.frequency > 1) {
        throw new ValidationError(`${name}.frequency must be a number between 0 and 1`);
    }

    if (typeof truthValue.confidence !== 'number' ||
        truthValue.confidence < 0 || truthValue.confidence > 1) {
        throw new ValidationError(`${name}.confidence must be a number between 0 and 1`);
    }
};

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

const isEmptyArray = input => !Array.isArray(input) || input.length === 0;

const normalizeToArray = input => Array.isArray(input) ? input : [input];

export {
    handleError,
    handleErrorWithDefault,
    safeAsync,
    safeSync,
    createModuleErrorHandler,
    createValidationError,
    createParseError,
    createInferenceError,
    createPlanningError,
    createMemoryError,
    isValidationError,
    isParseError,
    isInferenceError,
    isPlanningError,
    isMemoryError,
    ValidationError,
    ParseError,
    InferenceError,
    PlanningError,
    MemoryError,
    validateString,
    validateNonEmptyArray,
    validateArray,
    validateObject,
    validateTask,
    validateTerm,
    validatePunctuation,
    validateTruthValue,
    isNonEmptyArray,
    isEmptyArray,
    normalizeToArray
};
