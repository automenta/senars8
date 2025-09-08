/**
 * Simple logger utility for the application
 * 
 * Provides configurable logging with different log levels.
 * Log level can be set via the LOG_LEVEL environment variable.
 * 
 * @module logger
 */

/**
 * Log level constants
 * @enum {number}
 */
const LOG_LEVELS = {
    /** Error level - only errors are logged */
    ERROR: 0,
    /** Warning level - errors and warnings are logged */
    WARN: 1,
    /** Info level - errors, warnings, and info messages are logged */
    INFO: 2,
    /** Debug level - all messages including debug are logged */
    DEBUG: 3
};

// Get log level from environment or default to INFO
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

/**
 * Check if a log level should be output based on current log level
 * @private
 * @param {number} level - The log level to check
 * @returns {boolean} Whether to output this level
 */
function shouldLog(level) {
    return level <= currentLogLevel;
}

/**
 * Format a log message with timestamp
 * @private
 * @param {string} level - The log level name
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 */
function formatLog(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    if (args.length > 0) {
        console.log(formattedMessage, ...args);
    } else {
        console.log(formattedMessage);
    }
}

/**
 * Log an error message
 * 
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 * @example
 * logger.error('Failed to process task', taskId);
 */
function error(message, ...args) {
    if (shouldLog(LOG_LEVELS.ERROR)) {
        formatLog('ERROR', message, ...args);
    }
}

/**
 * Log a warning message
 * 
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 * @example
 * logger.warn('Task has low priority', task.id);
 */
function warn(message, ...args) {
    if (shouldLog(LOG_LEVELS.WARN)) {
        formatLog('WARN', message, ...args);
    }
}

/**
 * Log an info message
 * 
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 * @example
 * logger.info('Task completed successfully', task.id);
 */
function info(message, ...args) {
    if (shouldLog(LOG_LEVELS.INFO)) {
        formatLog('INFO', message, ...args);
    }
}

/**
 * Log a debug message
 * 
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 * @example
 * logger.debug('Processing task with parameters', task.id, parameters);
 */
function debug(message, ...args) {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
        formatLog('DEBUG', message, ...args);
    }
}

module.exports = {
    error,
    warn,
    info,
    debug,
    LOG_LEVELS
};