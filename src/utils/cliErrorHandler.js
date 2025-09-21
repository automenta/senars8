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

const CLIError = createErrorClass('CLIError');
const AnalysisError = createErrorClass('AnalysisError');

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

const safeAsync = async (operation, context) => {
    try {
        return await operation();
    } catch (error) {
        const cliError = new CLIError(error.message, context);
        cliError.originalError = error;
        throw cliError;
    }
};

const safeSync = (operation, context) => {
    try {
        return operation();
    } catch (error) {
        const cliError = new CLIError(error.message, context);
        cliError.originalError = error;
        throw cliError;
    }
};

export {
    CLIError,
    AnalysisError,
    logAndExit,
    safeAsync,
    safeSync
};