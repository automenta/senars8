const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.WARN;
const shouldLog = (level) => (LOG_LEVELS[level] ?? LOG_LEVELS.INFO) <= currentLogLevel;

const getLogFunction = (level) => ({
    ERROR: console.error,
    WARN: console.warn,
}[level] || console.log);

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
        console.log(JSON.stringify(logEntry));
    } else {
        const logFunction = getLogFunction(level);
        logFunction(`[${timestamp}] [${level}] ${message}`, ...otherArgs, ...Object.values(context));
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
