import {error as logError} from './logger.js';

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

const ERROR_NAMES = ['ValidationError', 'ParseError', 'InferenceError', 'PlanningError', 'MemoryError', 'CLIError', 'AnalysisError', 'NotImplementedError'];
const ERROR_CLASSES = {};
const IS_ERROR = {};
const CREATE_ERROR = {};

ERROR_NAMES.forEach(name => {
    const errorClass = createErrorClass(name);
    ERROR_CLASSES[name] = errorClass;
    IS_ERROR[`is${name}`] = (error) => error instanceof errorClass;
    CREATE_ERROR[name] = (message, context = null) => new errorClass(message, context);
});

const isKnownErrorType = error => Object.values(ERROR_CLASSES).some(type => error instanceof type);

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

const logAndExit = (error, exitCode = 1) => {
    const preparedError = prepareErrorForLogging(error);
    logError(preparedError.message, preparedError);
    process.exit(exitCode);
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

class UnifiedErrorHandler {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.handler = createModuleErrorHandler(moduleName);
    }

    async execute(operation, context, defaultValue = null) {
        return await this.handler.safeAsync(operation, context, defaultValue);
    }

    executeSync(operation, context, defaultValue = null) {
        return this.handler.safeSync(operation, context, defaultValue);
    }

    handleWithDefault(error, context, defaultValue = null) {
        return handleErrorWithDefault(error, `${this.moduleName}.${context}`, defaultValue);
    }
}

const createUnifiedErrorHandler = (moduleName) => new UnifiedErrorHandler(moduleName);

// Pre-configured error handlers for common components
const agentErrorHandler = createUnifiedErrorHandler('Agent');
const systemErrorHandler = createUnifiedErrorHandler('System');
const plannerErrorHandler = createUnifiedErrorHandler('Planner');
const perceptionErrorHandler = createUnifiedErrorHandler('Perception');
const metaCognitionErrorHandler = createUnifiedErrorHandler('MetaCognition');
const eventBusErrorHandler = createUnifiedErrorHandler('EventBus');
const diContainerErrorHandler = createUnifiedErrorHandler('DIContainer');

export {
    UnifiedErrorHandler,
    createUnifiedErrorHandler,
    CREATE_ERROR as ErrorTypes,
    handleError,
    handleErrorWithDefault,
    safeAsync,
    safeSync,
    createModuleErrorHandler,
    logAndExit,
    ERROR_CLASSES as Errors,
    IS_ERROR as isError,
    CREATE_ERROR as createError,
    agentErrorHandler,
    systemErrorHandler,
    plannerErrorHandler,
    perceptionErrorHandler,
    metaCognitionErrorHandler,
    eventBusErrorHandler,
    diContainerErrorHandler,
};
