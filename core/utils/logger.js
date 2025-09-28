/**
 * A simple, self-contained logger for the core system.
 * It avoids any dependencies on higher-level packages to prevent circular imports.
 */

export const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

// Default to INFO level if not specified
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

const log = (level, message, ...args) => {
    if (level <= CURRENT_LOG_LEVEL) {
        const timestamp = new Date().toISOString();
        const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
        console.log(`[${timestamp}] [${levelName}]`, message, ...args);
    }
};

export const error = (message, ...args) => log(LOG_LEVELS.ERROR, message, ...args);
export const info = (message, ...args) => log(LOG_LEVELS.INFO, message, ...args);
export const warn = (message, ...args) => log(LOG_LEVELS.WARN, message, ...args);
export const debug = (message, ...args) => log(LOG_LEVELS.DEBUG, message, ...args);

const logger = {
    error,
    info,
    warn,
    debug,
    createNamespace: () => logger, // Basic compatibility with the old API
};

export default logger;