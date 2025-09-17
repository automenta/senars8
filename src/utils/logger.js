const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

const shouldLog = level => level <= currentLogLevel;

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

/**
 * Logs an error message
 * @param {string} message - The error message
 * @param {object} context - Additional context information
 */
const error = (message, context) => {
    logWithContext('ERROR', message, context);
};

/**
 * Logs a warning message
 * @param {string} message - The warning message
 * @param {object} context - Additional context information
 */
const warn = (message, context) => {
    logWithContext('WARN', message, context);
};

/**
 * Logs an info message
 * @param {string} message - The info message
 * @param {object} context - Additional context information
 */
const info = (message, context) => {
    logWithContext('INFO', message, context);
};

/**
 * Logs a debug message
 * @param {string} message - The debug message
 * @param {object} context - Additional context information
 */
const debug = (message, context) => {
    logWithContext('DEBUG', message, context);
};

export {
    error,
    warn,
    info,
    debug,
    logWithContext,
    LOG_LEVELS
};
