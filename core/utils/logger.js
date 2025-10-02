import chalk from 'chalk';
import util from 'util';

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
        if (process.env.NODE_ENV === 'test') return LogLevel.ERROR;
        const envLevel = (process.env.LOG_LEVEL || 'info').toUpperCase();
        const debugFlag = process.env.DEBUG === 'true' || process.env.DEBUG === '*';
        if (debugFlag) return LogLevel.DEBUG;
        return LogLevel[levelStr?.toUpperCase() || envLevel] ?? LogLevel.INFO;
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
        const formattedArgs = args.map(arg => typeof arg === 'object' ? util.inspect(arg, { depth: null, colors: true }) : arg).join(' ');

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