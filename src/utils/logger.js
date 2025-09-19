const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;
const shouldLog = level => level <= currentLogLevel;

const log = (level, method, message, ...args) => {
    if (shouldLog(LOG_LEVELS[level])) {
        const timestamp = new Date().toISOString();
        console[method](`[${timestamp}] [${level}] ${message}`, ...args);
    }
};

const error = (...args) => log('ERROR', 'error', ...args);
const warn = (...args) => log('WARN', 'warn', ...args);
const info = (...args) => log('INFO', 'log', ...args);
const debug = (...args) => log('DEBUG', 'log', ...args);

const logWithContext = (level, message, context = {}) => {
    if (!shouldLog(LOG_LEVELS[level] || LOG_LEVELS.INFO)) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...context
    };

    if (process.env.STRUCTURED_LOGGING === 'true') {
        console.log(JSON.stringify(logEntry));
    } else {
        const logFunction = {
            ERROR: console.error,
            WARN: console.warn,
        } [level] || console.log;
        logFunction(`[${timestamp}] [${level}] ${message}`, context);
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
