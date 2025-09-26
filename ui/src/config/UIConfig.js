/**
 * Configuration management for UI modules
 */
class UIConfig {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            // TUI Configuration
            tui: {
                updateInterval: options.tui?.updateInterval || 1000, // ms
                enableColor: options.tui?.enableColor !== false, // default true
                enableLogging: options.tui?.enableLogging !== false, // default true
            },

            // WebUI Configuration
            webui: {
                port: options.webui?.port || 3000,
                host: options.webui?.host || 'localhost',
                enableLogging: options.webui?.enableLogging !== false, // default true
                maxWebSocketClients: options.webui?.maxWebSocketClients || 100,
                staticPath: options.webui?.staticPath || '../public',
            },

            // Agent Configuration
            agent: {
                ...options.agentConfig,
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
     * Get TUI-specific configuration
     */
    getTUIConfig() {
        return {...this.config.tui};
    }

    /**
     * Get WebUI-specific configuration
     */
    getWebUIConfig() {
        return {...this.config.webui};
    }

    /**
     * Get Agent-specific configuration
     */
    getAgentConfig() {
        return {...this.config.agent};
    }
}

export default UIConfig;