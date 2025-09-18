import {error as logError} from './logger.js';

class ValidationError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'ValidationError';
        this.context = context;
    }
}

class ParseError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'ParseError';
        this.context = context;
    }
}

class InferenceError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'InferenceError';
        this.context = context;
    }
}

class PlanningError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'PlanningError';
        this.context = context;
    }
}

class MemoryError extends Error {
    constructor(message, context = null) {
        super(message);
        this.name = 'MemoryError';
        this.context = context;
    }
}

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

const isKnownErrorType = error => 
    error instanceof ValidationError ||
    error instanceof ParseError ||
    error instanceof InferenceError ||
    error instanceof PlanningError ||
    error instanceof MemoryError;

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
};
