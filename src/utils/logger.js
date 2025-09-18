const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;
const shouldLog = (level) => LOG_LEVELS[level] <= currentLogLevel;

const log = (level, message, ...args) => {
    if (!shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const logMethod = {
        ERROR: console.error,
        WARN: console.warn,
    } [level] || console.log;

    if (process.env.STRUCTURED_LOGGING === 'true') {
        const logEntry = {
            timestamp,
            level,
            message,
            args: args.length > 0 ? args : undefined,
        };
        console.log(JSON.stringify(logEntry));
    } else {
        logMethod(`[${timestamp}] [${level}] ${message}`, ...args);
    }
};

const error = (message, ...args) => log('ERROR', message, ...args);
const warn = (message, ...args) => log('WARN', message, ...args);
const info = (message, ...args) => log('INFO', message, ...args);
const debug = (message, ...args) => log('DEBUG', message, ...args);

export {
    error,
    warn,
    info,
    debug,
    LOG_LEVELS
};
