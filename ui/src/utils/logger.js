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
const log = {
    /**
     * Log an information message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    info: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [INFO] ${message}`, ...args);
    },
    
    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    warn: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [WARN] ${message}`, ...args);
    },
    
    /**
     * Log an error message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    error: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
    },
    
    /**
     * Log a debug message in development only
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [DEBUG] ${message}`, ...args);
        }
    },
    
    /**
     * Log trace information
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    trace: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.trace(`[${timestamp}] [TRACE] ${message}`, ...args);
        } else {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [TRACE] ${message}`, ...args);
        }
    }
};

export default log;