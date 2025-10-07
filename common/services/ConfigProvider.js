/**
 * Unified configuration provider for both UI and TUI
 * Provides a consistent interface for accessing configuration
 */
class ConfigProvider {
    constructor(configManager = null) {
        this.configManager = configManager;
        this.configService = null;
    }

    /**
     * Initialize the configuration provider
     * @param {Object} config - Configuration object or ConfigManager instance
     */
    async initialize(config) {
        if (config && typeof config.get === 'function') {
            // If config is already a ConfigManager instance
            this.configManager = config;
        } else {
            // Create a new ConfigManager with the provided config
            const {default: ConfigManager} = await import('../../coreagent/config/ConfigManager.js');
            this.configManager = new ConfigManager(config);
        }

        // Initialize the global config service with the merged configuration
        const {configService} = await import('../../coreagent/config/index.js');
        configService.initialize(this.configManager.getAll());
        this.configService = configService;
    }

    /**
     * Get a configuration value
     * @param {string} path - Configuration path
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value or default
     */
    get(path, defaultValue = undefined) {
        if (this.configService) {
            return this.configService.get(path, defaultValue);
        } else if (this.configManager) {
            return this.configManager.get(path, defaultValue);
        }
        return defaultValue;
    }

    /**
     * Get a configuration number
     * @param {string} path - Configuration path
     * @param {number} defaultValue - Default value if not found or invalid
     * @returns {number} Configuration number or default
     */
    getNumber(path, defaultValue = 0) {
        if (this.configService) {
            return this.configService.getNumber(path, defaultValue);
        } else if (this.configManager) {
            return this.configManager.getNumber(path, defaultValue);
        }
        return defaultValue;
    }

    /**
     * Get a configuration string
     * @param {string} path - Configuration path
     * @param {string} defaultValue - Default value if not found or invalid
     * @returns {string} Configuration string or default
     */
    getString(path, defaultValue = '') {
        if (this.configService) {
            return this.configService.getString(path, defaultValue);
        } else if (this.configManager) {
            return this.configManager.getString(path, defaultValue);
        }
        return defaultValue;
    }

    /**
     * Get a configuration boolean
     * @param {string} path - Configuration path
     * @param {boolean} defaultValue - Default value if not found or invalid
     * @returns {boolean} Configuration boolean or default
     */
    getBoolean(path, defaultValue = false) {
        if (this.configService) {
            return this.configService.getBoolean(path, defaultValue);
        } else if (this.configManager) {
            return this.configManager.getBoolean(path, defaultValue);
        }
        return defaultValue;
    }

    /**
     * Get a configuration object
     * @param {string} path - Configuration path
     * @param {Object} defaultValue - Default value if not found or invalid
     * @returns {Object} Configuration object or default
     */
    getObject(path, defaultValue = {}) {
        if (this.configService) {
            return this.configService.getObject(path, defaultValue);
        } else if (this.configManager) {
            return this.configManager.getObject(path, defaultValue);
        }
        return defaultValue;
    }

    /**
     * Get a configuration array
     * @param {string} path - Configuration path
     * @param {Array} defaultValue - Default value if not found or invalid
     * @returns {Array} Configuration array or default
     */
    getArray(path, defaultValue = []) {
        if (this.configService) {
            return this.configService.getArray(path, defaultValue);
        } else if (this.configManager) {
            return this.configManager.getArray(path, defaultValue);
        }
        return defaultValue;
    }

    /**
     * Get all configuration values
     * @returns {Object} All configuration values
     */
    getAll() {
        if (this.configService) {
            return this.configService.getAll();
        } else if (this.configManager) {
            return this.configManager.getAll();
        }
        return {};
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration to merge
     */
    update(newConfig) {
        if (this.configService) {
            this.configService.update(newConfig);
        }
        if (this.configManager) {
            this.configManager.update(newConfig);
        }
    }
}

// Singleton instance for shared use
const configProvider = new ConfigProvider();
export default configProvider;