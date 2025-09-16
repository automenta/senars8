const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

const shouldLog = level => level <= currentLogLevel;

/**
 * Formats a log message with timestamp and level
 * @param {string} level - The log level
 * @param {string} message - The log message
 * @param {...any} args - Additional arguments to log
 * @returns {string} Formatted log message
 */
const formatLog = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    return {formattedMessage, args};
};

/**
 * Logs an error message
 * @param {string} message - The error message
 * @param {...any} args - Additional arguments to log
 */
const error = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
        const {formattedMessage, args: logArgs} = formatLog('ERROR', message, ...args);
        console.error(formattedMessage, ...logArgs);
    }
};

/**
 * Logs a warning message
 * @param {string} message - The warning message
 * @param {...any} args - Additional arguments to log
 */
const warn = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
        const {formattedMessage, args: logArgs} = formatLog('WARN', message, ...args);
        console.warn(formattedMessage, ...logArgs);
    }
};

/**
 * Logs an info message
 * @param {string} message - The info message
 * @param {...any} args - Additional arguments to log
 */
const info = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
        const {formattedMessage, args: logArgs} = formatLog('INFO', message, ...args);
        console.log(formattedMessage, ...logArgs);
    }
};

/**
 * Logs a debug message
 * @param {string} message - The debug message
 * @param {...any} args - Additional arguments to log
 */
const debug = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
        const {formattedMessage, args: logArgs} = formatLog('DEBUG', message, ...args);
        console.log(formattedMessage, ...logArgs);
    }
};

/**
 * Logs a structured message with additional context
 * @param {string} level - The log level
 * @param {string} message - The log message
 * @param {object} context - Additional context information
 */
const logWithContext = (level, message, context = {}) => {
    if (shouldLog(LOG_LEVELS[level] || LOG_LEVELS.INFO)) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...context
        };

        // Output as JSON if structured logging is enabled
        if (process.env.STRUCTURED_LOGGING === 'true') {
            console.log(JSON.stringify(logEntry));
        } else {
            // Fallback to regular logging
            const formattedMessage = `[${timestamp}] [${level}] ${message}`;
            const logFunction = level === 'ERROR' ? console.error :
                level === 'WARN' ? console.warn : console.log;
            logFunction(formattedMessage, context);
        }
    }
};

export {
    error,
    warn,
    info,
    debug,
    logWithContext,
    LOG_LEVELS
};
