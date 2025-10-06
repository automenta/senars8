/**
 * UI-specific logger that works in browser environment
 */
const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

class UiLogger {
    constructor(level = LogLevel.INFO) {
        this.level = level;
    }

    create(namespace) {
        return new NamespacedLogger(this, namespace);
    }

    log(level, message, ...args) {
        if (level > this.level) return;

        const timestamp = new Date().toISOString();
        const levelStr = ['ERROR', 'WARN', 'INFO', 'DEBUG'][level];
        
        console.log(`[${timestamp}] [${levelStr}] [${this.namespace || 'UiLogger'}]`, message, ...args);
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
}

class NamespacedLogger {
    constructor(parent, namespace) {
        this.parent = parent;
        this.namespace = namespace;
    }

    log(level, message, ...args) {
        this.parent.log(level, `[${this.namespace}] ${message}`, ...args);
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
}

// Create and export a default instance
const uiLogger = new UiLogger();

export default uiLogger;