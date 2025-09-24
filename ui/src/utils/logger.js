/**
 * Shared logging utility for the UI
 * Provides consistent logging with level-specific prefixes
 * @type {Object}
 * @property {Function} info - Log information messages with [INFO] prefix
 * @property {Function} warn - Log warning messages with [WARN] prefix
 * @property {Function} error - Log error messages with [ERROR] prefix
 * @property {Function} debug - Log debug messages with [DEBUG] prefix in development only
 * @property {Function} trace - Log trace information with [TRACE] prefix
 */
const logWithTimestamp = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    switch (level) {
        case 'INFO':
            console.log(formattedMessage, ...args);
            break;
        case 'WARN':
            console.warn(formattedMessage, ...args);
            break;
        case 'ERROR':
            console.error(formattedMessage, ...args);
            break;
        case 'DEBUG':
            if (process.env.NODE_ENV === 'development') {
                console.log(formattedMessage, ...args);
            }
            break;
        case 'TRACE':
            if (process.env.NODE_ENV === 'development') {
                console.trace(formattedMessage, ...args);
            } else {
                console.log(formattedMessage, ...args);
            }
            break;
    }
};

const log = {
    info: (...args) => logWithTimestamp('INFO', ...args),
    warn: (...args) => logWithTimestamp('WARN', ...args),
    error: (...args) => logWithTimestamp('ERROR', ...args),
    debug: (...args) => logWithTimestamp('DEBUG', ...args),
    trace: (...args) => logWithTimestamp('TRACE', ...args),
};

export default log;