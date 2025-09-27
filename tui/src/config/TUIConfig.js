/** 
 * Configuration management for TUI module
 */
class TUIConfig {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            updateInterval: options.updateInterval || 1000, // ms
            enableColor: options.enableColor !== false, // default true
            enableLogging: options.enableLogging !== false, // default true
            maxDisplayItems: options.maxDisplayItems || 10, // max items to display
            enableHistory: options.enableHistory !== false, // default true
            historySize: options.historySize || 100,
            agent: {
                websocketUrl: options.agent?.websocketUrl || 'ws://localhost:8080'
            }
        };
    }

    /**
     * Get a configuration value
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value === null || value === undefined) {
                return defaultValue;
            }
            value = value[key];
        }

        return value !== undefined ? value : defaultValue;
    }

    /**
     * Set a configuration value
     */
    set(path, value) {
        const keys = path.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    /**
     * Get the entire configuration object
     */
    getAll() {
        return {...this.config};
    }

    /**
     * Get update interval in milliseconds
     */
    getUpdateInterval() {
        return this.config.updateInterval;
    }

    /**
     * Check if color output is enabled
     */
    isColorEnabled() {
        return this.config.enableColor;
    }

    /**
     * Check if logging is enabled
     */
    isLoggingEnabled() {
        return this.config.enableLogging;
    }

    /**
     * Get max number of items to display
     */
    getMaxDisplayItems() {
        return this.config.maxDisplayItems;
    }
}

export default TUIConfig;