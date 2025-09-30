import {debug as coreDebug, error as coreError, info as coreInfo, warn as coreWarn} from '../../core/utils/logger.js';

let broadcast;

/**
 * Initializes the logger with a broadcast function.
 * @param {Function} broadcastFunction - The function to use for broadcasting log messages.
 */
export function initializeLogger(broadcastFunction) {
    broadcast = broadcastFunction;
}

/**
 * Broadcasts a log message to all connected clients.
 * @param {string} level - The log level (e.g., 'INFO', 'DEBUG').
 * @param {string} message - The log message.
 * @param {...any} args - Additional arguments to log.
 */
const broadcastLog = (level, message, ...args) => {
    if (broadcast) {
        broadcast({type: 'logMessage', payload: {level, message, args, timestamp: new Date().toISOString()}});
    }
};

export const serverDebug = (message, ...args) => {
    coreDebug(message, ...args);
    broadcastLog('DEBUG', message, ...args);
};

export const serverInfo = (message, ...args) => {
    coreInfo(message, ...args);
    broadcastLog('INFO', message, ...args);
};

export const serverWarn = (message, ...args) => {
    coreWarn(message, ...args);
    broadcastLog('WARN', message, ...args);
};

export const serverError = (message, ...args) => {
    coreError(message, ...args);
    broadcastLog('ERROR', message, ...args);
};