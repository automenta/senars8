const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

const shouldLog = (level) => level <= currentLogLevel;

const formatLog = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(formattedMessage, ...args);
};

const error = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
        formatLog('ERROR', message, ...args);
    }
};

const warn = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
        formatLog('WARN', message, ...args);
    }
};

const info = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
        formatLog('INFO', message, ...args);
    }
};

const debug = (message, ...args) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
        formatLog('DEBUG', message, ...args);
    }
};

module.exports = {
    error,
    warn,
    info,
    debug,
    LOG_LEVELS
};