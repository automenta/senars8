const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

function shouldLog(level) {
    return level <= currentLogLevel;
}

function formatLog(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    if (args.length > 0) {
        console.log(formattedMessage, ...args);
    } else {
        console.log(formattedMessage);
    }
}

function error(message, ...args) {
    if (shouldLog(LOG_LEVELS.ERROR)) {
        formatLog('ERROR', message, ...args);
    }
}

function warn(message, ...args) {
    if (shouldLog(LOG_LEVELS.WARN)) {
        formatLog('WARN', message, ...args);
    }
}

function info(message, ...args) {
    if (shouldLog(LOG_LEVELS.INFO)) {
        formatLog('INFO', message, ...args);
    }
}

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