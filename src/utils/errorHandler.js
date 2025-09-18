import {
    error as logError
} from './logger.js';

const ERROR_TYPES = {
    VALIDATION: 'ValidationError',
    PARSE: 'ParseError',
    INFERENCE: 'InferenceError',
    PLANNING: 'PlanningError',
    MEMORY: 'MemoryError',
    GENERIC: 'AppError',
};

class AppError extends Error {
    constructor(message, type = ERROR_TYPES.GENERIC, context = null) {
        super(message);
        this.name = type;
        this.context = context;
    }
}

const createErrorCreator = (type) => (message, context) => new AppError(message, type, context);

const createValidationError = createErrorCreator(ERROR_TYPES.VALIDATION);
const createParseError = createErrorCreator(ERROR_TYPES.PARSE);
const createInferenceError = createErrorCreator(ERROR_TYPES.INFERENCE);
const createPlanningError = createErrorCreator(ERROR_TYPES.PLANNING);
const createMemoryError = createErrorCreator(ERROR_TYPES.MEMORY);

const isKnownErrorType = (error) => Object.values(ERROR_TYPES).includes(error.name);

function logAndReturn(error, context, returnValue = null) {
    const preparedError = prepareErrorForLogging(error, context);
    logError(preparedError.message, preparedError);
    return returnValue;
}

function logAndThrow(error, context) {
    const preparedError = prepareErrorForLogging(error, context);

    if (!isKnownErrorType(preparedError) && !preparedError.originalError) {
        const newError = new AppError(preparedError.message);
        newError.originalStack = preparedError.stack || preparedError.originalStack;
        newError.originalError = preparedError;
        logError(newError.message, newError);
        throw newError;
    }

    logError(preparedError.message, preparedError);
    throw preparedError;
}

function prepareErrorForLogging(error, context) {
    if (error == null) {
        const nullError = new AppError('Null or undefined error', ERROR_TYPES.GENERIC, context);
        nullError.originalStack = new Error().stack;
        return nullError;
    }
    if (typeof error === 'string') {
        return new AppError(error, ERROR_TYPES.GENERIC, context);
    }
    if (!(error instanceof Error)) {
        return new AppError(JSON.stringify(error), ERROR_TYPES.GENERIC, context);
    }

    if (context && !error.message.startsWith(`[${context}]`)) {
        error.message = `[${context}] ${error.message}`;
    }
    if (error.stack && !error.originalStack) {
        error.originalStack = error.stack;
    }
    return error;
}

function handleError(error, context, shouldThrow = true) {
    return shouldThrow ? logAndThrow(error, context) : logAndReturn(error, context, null);
}

async function safeAsync(operation, context, defaultValue = null) {
    try {
        return await operation();
    } catch (error) {
        return logAndReturn(error, context, defaultValue);
    }
}

function safeSync(operation, context, defaultValue = null) {
    try {
        return operation();
    } catch (error) {
        return logAndReturn(error, context, defaultValue);
    }
}

function createModuleErrorHandler(moduleName) {
    const buildContext = (context) => context ? `${moduleName}.${context}` : moduleName;
    return {
        handle: (error, context, shouldThrow = true) =>
            handleError(error, buildContext(context), shouldThrow),
        safeAsync: (operation, context, defaultValue = null) =>
            safeAsync(operation, buildContext(context), defaultValue),
        safeSync: (operation, context, defaultValue = null) =>
            safeSync(operation, buildContext(context), defaultValue),
    };
}

const isErrorOfType = (error, type) => error instanceof AppError && error.name === type;

const isValidationError = error => isErrorOfType(error, ERROR_TYPES.VALIDATION);
const isParseError = error => isErrorOfType(error, ERROR_TYPES.PARSE);
const isInferenceError = error => isErrorOfType(error, ERROR_TYPES.INFERENCE);
const isPlanningError = error => isErrorOfType(error, ERROR_TYPES.PLANNING);
const isMemoryError = error => isErrorOfType(error, ERROR_TYPES.MEMORY);


export {
    AppError,
    ERROR_TYPES,
    handleError,
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
};
