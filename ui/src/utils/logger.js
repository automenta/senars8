/**
 * Shared logging utility for the UI
 * Provides consistent logging with level-specific prefixes
 * @type {Object}
 * @property {Function} info - Log information messages with [INFO] prefix
 * @property {Function} warn - Log warning messages with [WARN] prefix  
 * @property {Function} error - Log error messages with [ERROR] prefix
 * @property {Function} debug - Log debug messages with [DEBUG] prefix in development only
 */
const log = {
    /**
     * Log an information message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
    
    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
    
    /**
     * Log an error message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
    
    /**
     * Log a debug message (only in development environment)
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
};

export default log;