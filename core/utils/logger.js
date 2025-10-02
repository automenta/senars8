import chalk from 'chalk';

// Create a browser-compatible version of util.inspect
const browserInspect = (obj, options = {}) => {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'string') return `"${obj}"`;
    if (typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'function') return obj.toString();
    if (obj instanceof Date) return `Date("${obj.toISOString()}")`;
    if (obj instanceof RegExp) return obj.toString();
    if (obj instanceof Error) return `Error: ${obj.message}`;
    
    // For arrays and objects, return a simple representation
    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        // Limit array length for readability
        const items = obj.slice(0, 5).map(item => browserInspect(item)).join(', ');
        return obj.length > 5 ? `[ ${items}, ... ]` : `[ ${items} ]`;
    }
    
    // For objects
    if (typeof obj === 'object') {
        const keys = Object.keys(obj).slice(0, 10); // Limit number of keys shown
        const keyValues = keys.map(key => `${key}: ${browserInspect(obj[key])}`).join(', ');
        return keys.length === 0 ? '{}' : `{ ${keyValues}${keys.length < Object.keys(obj).length ? ', ...' : ''} }`;
    }
    
    return String(obj);
};

// Use dynamic import for Node.js, fallback for browser
let utilModule = null;

// Check if we're in browser environment first
if (typeof window !== 'undefined' || typeof document !== 'undefined') {
    // Browser environment
    utilModule = { inspect: browserInspect };
} else {
    // Node.js environment - this will be handled differently
    // We need to ensure this works in both environments
    try {
        // Dynamic import for Node.js environment
        utilModule = { inspect: browserInspect }; // Using browserInspect as default
    } catch (e) {
        utilModule = { inspect: browserInspect };
    }
}

// Define a more robust approach for browser vs Node
const safeUtil = {
    inspect: (obj, options) => {
        // In most cases, we'll use the browser-compatible version
        // Vite will handle Node.js modules differently for server vs client
        return browserInspect(obj, options);
    }
};

const util = safeUtil;

const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const levelColors = {
    [LogLevel.ERROR]: chalk.red,
    [LogLevel.WARN]: chalk.yellow,
    [LogLevel.INFO]: chalk.blue,
    [LogLevel.DEBUG]: chalk.magenta,
};

const levelNames = {
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.DEBUG]: 'DEBUG',
};

class Logger {
    constructor(options = {}) {
        this.level = this.getLogLevel(options.level);
        this.namespace = options.namespace || '';
        this.transports = options.transports || [new ConsoleTransport()];
    }

    getLogLevel(levelStr) {
        // Check if we're in a Node.js environment before accessing process
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.NODE_ENV === 'test') return LogLevel.ERROR;
            const envLevel = (process.env.LOG_LEVEL || 'info').toUpperCase();
            const debugFlag = process.env.DEBUG === 'true' || process.env.DEBUG === '*';
            if (debugFlag) return LogLevel.DEBUG;
            const levelToCheck = (levelStr && typeof levelStr === 'string') ? levelStr.toUpperCase() : envLevel;
            return LogLevel[levelToCheck] ?? LogLevel.INFO;
        } else {
            // Browser environment - use a safe fallback
            return LogLevel.INFO;
        }
    }

    log(level, message, ...args) {
        if (level > this.level) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, ...args);
        for (const transport of this.transports) {
            transport.log(formattedMessage);
        }
    }

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const levelName = levelNames[level].padEnd(5);
        const color = levelColors[level];
        const namespaceStr = this.namespace ? `[${this.namespace}]` : '';
        const formattedArgs = args.map(arg => {
            // Use browser-compatible inspection since util.inspect is not available in browser
            if (typeof arg === 'object' && arg !== null) {
                // For browser environments, avoid util.inspect which is Node.js-only
                return browserInspect(arg);
            }
            return arg;
        }).join(' ');

        return `${chalk.gray(timestamp)} ${color(levelName)} ${chalk.green(namespaceStr)} ${message} ${formattedArgs}`;
    }

    error(message, ...args) {
        this.log(LogLevel.ERROR, message, ...args);
    }

    warn(message, ...args) {
        this.log(LogLevel.WARN, message, ...args);
    }

    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }

    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    create(namespace) {
        return new Logger({
            level: this.level,
            namespace: this.namespace ? `${this.namespace}:${namespace}` : namespace,
            transports: this.transports,
        });
    }
}

class ConsoleTransport {
    log(message) {
        console.log(message);
    }
}

// Export a singleton instance for global use
const logger = new Logger();

export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);
export default logger;