/**
 * A unified, self-contained logger for the entire system.
 * It avoids dependencies on higher-level packages to prevent circular imports.
 * Features configurable log levels via the LOG_LEVEL environment variable.
 */

export const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
};

// Default to INFO level if not specified, and allow case-insensitive configuration.
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

const log = (level, levelName, consoleMethod, message, ...args) => {
    if (level <= CURRENT_LOG_LEVEL) {
        const timestamp = new Date().toISOString();
        consoleMethod(`[${timestamp}] [${levelName}]`, message, ...args);
    }
};

export const error = (message, ...args) => log(LOG_LEVELS.ERROR, 'ERROR', console.error, message, ...args);
export const warn = (message, ...args) => log(LOG_LEVELS.WARN, 'WARN', console.warn, message, ...args);
export const info = (message, ...args) => log(LOG_LEVELS.INFO, 'INFO', console.log, message, ...args);
export const debug = (message, ...args) => log(LOG_LEVELS.DEBUG, 'DEBUG', console.log, message, ...args);
export const trace = (message, ...args) => log(LOG_LEVELS.TRACE, 'TRACE', console.trace, message, ...args);

// Default export for convenience, maintaining compatibility with previous logger objects.
const logger = {
    error,
    warn,
    info,
    debug,
    trace,
    createNamespace: () => logger, // Basic compatibility with the old API
};

export default logger;