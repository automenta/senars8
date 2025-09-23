/**
 * @typedef {'ERROR' | 'WARN' | 'INFO' | 'DEBUG'} LogLevel
 */

/**
 * Defines the numerical levels for logging.
 * @type {Object<LogLevel, number>}
 */
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.WARN;
const shouldLog = (level) => (LOG_LEVELS[level] ?? LOG_LEVELS.INFO) <= currentLogLevel;

/**
 * A map of log levels to their corresponding console methods.
 */
const LOG_FUNCTIONS = {
    ERROR: console.error,
    WARN: console.warn,
    INFO: console.info,
    DEBUG: console.debug,
};

/**
 * The core logging function.
 *
 * It logs messages based on the current log level and can produce structured JSON logs
 * if the `STRUCTURED_LOGGING` environment variable is set to 'true'.
 *
 * It has special argument handling: the first object passed in the `args` array
 * is treated as a context object and its properties are merged into the structured log.
 *
 * @param {LogLevel} level The level of the log message.
 * @param {string} message The main log message.
 * @param  {...any} args Additional arguments to log. The first object is treated as context.
 */
const log = (level, message, ...args) => {
    if (!shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const context = args.find(arg => typeof arg === 'object' && arg !== null) || {};
    const otherArgs = args.filter(arg => typeof arg !== 'object' || arg === null);

    if (process.env.STRUCTURED_LOGGING === 'true') {
        const logEntry = {
            timestamp,
            level,
            message, ...context,
            otherArgs: otherArgs.length > 0 ? otherArgs : undefined
        };
        // Use process.stdout.write for structured logging to avoid extra formatting.
        process.stdout.write(JSON.stringify(logEntry) + '\n');
    } else {
        const logFunction = LOG_FUNCTIONS[level] || console.log;
        logFunction(`[${timestamp}] [${level}] ${message}`, ...otherArgs, ...Object.values(context));
    }
};

/**
 * Logs an error message.
 * @param {string} message The message to log.
 * @param {...any} args Additional arguments.
 */
const error = (message, ...args) => log('ERROR', message, ...args);

/**
 * Logs a warning message.
 * @param {string} message The message to log.
 * @param {...any} args Additional arguments.
 */
const warn = (message, ...args) => log('WARN', message, ...args);

/**
 * Logs an informational message.
 * @param {string} message The message to log.
 * @param {...any} args Additional arguments.
 */
const info = (message, ...args) => log('INFO', message, ...args);

/**
 * Logs a debug message.
 * @param {string} message The message to log.
 * @param {...any} args Additional arguments.
 */
const debug = (message, ...args) => log('DEBUG', message, ...args);

export {
    error,
    warn,
    info,
    debug,
    LOG_LEVELS
};
