/**
 * Shared logging service for both UI and TUI
 * Provides consistent logging with platform-appropriate capabilities
 */
class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logLevels = {
            'error': 0,
            'warn': 1,
            'info': 2,
            'debug': 3,
            'trace': 4
        };
    }

    /**
     * Check if a log level should be output based on current log level
     * @param {string} level - Log level to check
     * @returns {boolean} True if this level should be logged
     */
    shouldLog(level) {
        return this.logLevels[level] <= this.logLevels[this.logLevel];
    }

    /**
     * Log an error message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
        }
    }

    /**
     * Log a warning message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            const timestamp = new Date().toISOString();
            console.warn(`[${timestamp}] [WARN] ${message}`, ...args);
        }
    }

    /**
     * Log an information message
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [INFO] ${message}`, ...args);
        }
    }

    /**
     * Log a debug message (only in development or when debug level is set)
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log trace information
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    trace(message, ...args) {
        if (this.shouldLog('trace')) {
            const timestamp = new Date().toISOString();
            if (typeof console.trace === 'function') {
                console.trace(`[${timestamp}] [TRACE] ${message}`, ...args);
            } else {
                console.log(`[${timestamp}] [TRACE] ${message}`, ...args);
            }
        }
    }

    /**
     * Set the current logging level
     * @param {string} level - Log level ('error', 'warn', 'info', 'debug', 'trace')
     */
    setLogLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.logLevel = level;
        } else {
            this.warn(`Invalid log level: ${level}. Valid levels: ${Object.keys(this.logLevels).join(', ')}`);
        }
    }

    /**
     * Create a namespaced logger with a prefix
     * @param {string} namespace - Namespace to add to log messages
     * @returns {Object} Logger with prefixed messages
     */
    createNamespace(namespace) {
        const self = this;
        return {
            error: (message, ...args) => self.error(`[${namespace}] ${message}`, ...args),
            warn: (message, ...args) => self.warn(`[${namespace}] ${message}`, ...args),
            info: (message, ...args) => self.info(`[${namespace}] ${message}`, ...args),
            debug: (message, ...args) => self.debug(`[${namespace}] ${message}`, ...args),
            trace: (message, ...args) => self.trace(`[${namespace}] ${message}`, ...args),
        };
    }
}

// Export singleton instance
const logger = new Logger();
export default logger;