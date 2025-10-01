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
        const timestamp = getTimestamp();
        consoleMethod(`[${timestamp}] [${levelName}]`, message, ...args);
    }
};

// Cached timestamp function to reduce Date object creation overhead when logging is active
let lastTimestamp = '';
let lastTimestampTime = 0;
const getTimestamp = () => {
    const now = Date.now();
    // Cache timestamp for 100ms to reduce Date object creation overhead
    if (now - lastTimestampTime > 100) {
        lastTimestamp = new Date().toISOString();
        lastTimestampTime = now;
    }
    return lastTimestamp;
};

export const error = (message, ...args) => {
    if (LOG_LEVELS.ERROR <= CURRENT_LOG_LEVEL) {
        const timestamp = getTimestamp();
        console.error(`[${timestamp}] [ERROR]`, message, ...args);
    }
};

export const warn = (message, ...args) => {
    if (LOG_LEVELS.WARN <= CURRENT_LOG_LEVEL) {
        const timestamp = getTimestamp();
        console.warn(`[${timestamp}] [WARN]`, message, ...args);
    }
};

export const info = (message, ...args) => {
    if (LOG_LEVELS.INFO <= CURRENT_LOG_LEVEL) {
        const timestamp = getTimestamp();
        console.log(`[${timestamp}] [INFO]`, message, ...args);
    }
};

export const debug = (message, ...args) => {
    if (LOG_LEVELS.DEBUG <= CURRENT_LOG_LEVEL) {
        const timestamp = getTimestamp();
        console.log(`[${timestamp}] [DEBUG]`, message, ...args);
    }
};

export const trace = (message, ...args) => {
    if (LOG_LEVELS.TRACE <= CURRENT_LOG_LEVEL) {
        const timestamp = getTimestamp();
        console.trace(`[${timestamp}] [TRACE]`, message, ...args);
    }
};

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