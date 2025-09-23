/**
 * Singleton configuration service that provides centralized configuration access
 */
class ConfigService {
    constructor() {
        if (ConfigService.instance) {
            return ConfigService.instance;
        }

        this.config = null;
        ConfigService.instance = this;
    }

    /**
     * Initialize the configuration service with user configuration
     * @param {Object} config - User-provided configuration
     */
    initialize(config) {
        // Only initialize if not already initialized
        if (!this.config) {
            this.config = config;
        }
    }

    /**
     * Get a configuration value
     * @param {string} path - Configuration path
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value or default
     */
    get(path, defaultValue = undefined) {
        if (!this.config) {
            return defaultValue;
        }

        // Simple path resolution (splits by dot notation)
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Get a configuration number
     * @param {string} path - Configuration path
     * @param {number} defaultValue - Default value if not found or invalid
     * @returns {number} Configuration number or default
     */
    getNumber(path, defaultValue = 0) {
        const value = this.get(path, defaultValue);
        return typeof value === 'number' ? value : defaultValue;
    }

    /**
     * Get a configuration string
     * @param {string} path - Configuration path
     * @param {string} defaultValue - Default value if not found or invalid
     * @returns {string} Configuration string or default
     */
    getString(path, defaultValue = '') {
        const value = this.get(path, defaultValue);
        return typeof value === 'string' ? value : defaultValue;
    }

    /**
     * Get a configuration boolean
     * @param {string} path - Configuration path
     * @param {boolean} defaultValue - Default value if not found or invalid
     * @returns {boolean} Configuration boolean or default
     */
    getBoolean(path, defaultValue = false) {
        const value = this.get(path, defaultValue);
        return typeof value === 'boolean' ? value : defaultValue;
    }

    /**
     * Get a configuration object
     * @param {string} path - Configuration path
     * @param {Object} defaultValue - Default value if not found or invalid
     * @returns {Object} Configuration object or default
     */
    getObject(path, defaultValue = {}) {
        const value = this.get(path, defaultValue);
        return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : defaultValue;
    }

    /**
     * Get a configuration array
     * @param {string} path - Configuration path
     * @param {Array} defaultValue - Default value if not found or invalid
     * @returns {Array} Configuration array or default
     */
    getArray(path, defaultValue = []) {
        const value = this.get(path, defaultValue);
        return Array.isArray(value) ? value : defaultValue;
    }

    /**
     * Get all configuration values
     * @returns {Object} All configuration values
     */
    getAll() {
        return this.config || {};
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration to merge
     */
    update(newConfig) {
        if (!this.config) {
            this.config = {};
        }

        // Simple merge (shallow)
        Object.assign(this.config, newConfig);
    }

    /**
     * Reset the configuration service (for testing purposes)
     */
    reset() {
        this.config = null;
    }
}

// Export singleton instance
export default new ConfigService();