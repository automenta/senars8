const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;
const shouldLog = level => level <= currentLogLevel;

const formatLog = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    return { msg: `[${timestamp}] [${level}] ${message}`, args };
};

const log = (level, method, message, ...args) => {
    if (shouldLog(LOG_LEVELS[level])) {
        const { msg, args: logArgs } = formatLog(level, message, ...args);
        console[method](msg, ...logArgs);
    }
};

const error = (message, ...args) => log('ERROR', 'error', message, ...args);
const warn = (message, ...args) => log('WARN', 'warn', message, ...args);
const info = (message, ...args) => log('INFO', 'log', message, ...args);
const debug = (message, ...args) => log('DEBUG', 'log', message, ...args);

const logWithContext = (level, message, context = {}) => {
    if (shouldLog(LOG_LEVELS[level] || LOG_LEVELS.INFO)) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message, ...context };
        
        if (process.env.STRUCTURED_LOGGING === 'true') {
            console.log(JSON.stringify(logEntry));
        } else {
            const formattedMessage = `[${timestamp}] [${level}] ${message}`;
            const logFunction = level === 'ERROR' ? console.error :
                level === 'WARN' ? console.warn : console.log;
            logFunction(formattedMessage, context);
        }
    }
};

export { error, warn, info, debug, logWithContext, LOG_LEVELS };
