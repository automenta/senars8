import chalk from 'chalk';

const IS_NODE = typeof window === 'undefined';

const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const levelConfig = {
    [LogLevel.ERROR]: {name: 'ERROR', color: chalk.red, method: 'error'},
    [LogLevel.WARN]: {name: 'WARN', color: chalk.yellow, method: 'warn'},
    [LogLevel.INFO]: {name: 'INFO', color: chalk.blue, method: 'info'},
    [LogLevel.DEBUG]: {name: 'DEBUG', color: chalk.magenta, method: 'debug'},
};

class ConsoleTransport {
    log(timestamp, level, namespace, message, args) {
        const {name, color, method} = levelConfig[level];

        if (IS_NODE) {
            const timeStr = chalk.gray(timestamp.toISOString());
            const levelStr = color(name.padEnd(5));
            const nsStr = namespace ? chalk.green(`[${namespace}]`) : '';
            // In Node, we can use util.inspect for better object formatting, but this is a simple fallback.
            const formattedArgs = args.map(arg => (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg).join(' ');
            console[method](`${timeStr} ${levelStr} ${nsStr} ${message} ${formattedArgs}`);
        } else {
            // In the browser, use the console's native object inspection and grouping.
            const nsPrefix = namespace ? `[${namespace}]` : '';
            const groupTitle = `%c${name}%c ${nsPrefix} ${message}`;
            const styles = `color: ${color.hex()}; font-weight: bold;`;

            console.groupCollapsed(groupTitle, styles, 'color: inherit;');
            args.forEach(arg => console[method](arg));
            console.groupEnd();
        }
    }
}

class TuiTransport {
    constructor(logCallback) {
        this.logCallback = logCallback;
    }

    log(timestamp, level, namespace, message, args) {
        if (!this.logCallback) return;

        const {name, color} = levelConfig[level];
        const timeStr = timestamp.toISOString();
        const nsStr = namespace ? `[${namespace}]` : '';
        const formattedArgs = args.map(arg =>
            (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        const logMessage = `${timeStr} ${name} ${nsStr} ${message} ${formattedArgs}`;

        // Send to TUI callback instead of console
        this.logCallback(logMessage, level);
    }
}

class Logger {
    constructor(options = {}) {
        this.level = this._getLogLevel(options.level);
        this.namespace = options.namespace || '';
        this.transports = options.transports || [new ConsoleTransport()];
    }

    _getLogLevel(level) {
        // If a valid level number is passed, use it directly.
        if (typeof level === 'number' && level >= LogLevel.ERROR && level <= LogLevel.DEBUG) {
            return level;
        }

        if (IS_NODE) {
            if (process.env.DEBUG === 'true' || process.env.DEBUG === '*') {
                return LogLevel.DEBUG;
            }

            // If a level string is passed, it takes precedence.
            const levelStr = (typeof level === 'string' ? level.toUpperCase() : '');
            const envLevel = (process.env.LOG_LEVEL || '').toUpperCase();
            const levelToParse = levelStr || envLevel;

            if (levelToParse && LogLevel[levelToParse] !== undefined) {
                return LogLevel[levelToParse];
            }

            if (process.env.NODE_ENV === 'test') {
                return LogLevel.ERROR;
            }

            return LogLevel.INFO;
        }
        // In browser, default to INFO.
        return LogLevel.INFO;
    }

    log(level, message, ...args) {
        if (level > this.level) return;

        const timestamp = new Date();
        for (const transport of this.transports) {
            transport.log(timestamp, level, this.namespace, message, args);
        }
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

const logger = new Logger();

export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);
export { TuiTransport };
export default logger;