import ConfigManager from './ConfigManager.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('ConfigService');

/**
 * Singleton configuration service that provides centralized configuration access
 */
class ConfigService {
    constructor() {
        if (ConfigService.instance) {
            return ConfigService.instance;
        }
        
        this.configManager = null;
        ConfigService.instance = this;
    }

    /**
     * Initialize the configuration service with user configuration
     * @param {Object} userConfig - User-provided configuration
     */
    initialize(userConfig = {}) {
        if (!this.configManager) {
            this.configManager = new ConfigManager(userConfig);
        }
    }

    /**
     * Get a configuration value
     * @param {string} path - Configuration path
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value or default
     */
    get(path, defaultValue = undefined) {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'get');
            return defaultValue;
        }
        return this.configManager.get(path, defaultValue);
    }

    /**
     * Get a configuration number
     * @param {string} path - Configuration path
     * @param {number} defaultValue - Default value if not found or invalid
     * @returns {number} Configuration number or default
     */
    getNumber(path, defaultValue = 0) {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'getNumber');
            return defaultValue;
        }
        return this.configManager.getNumber(path, defaultValue);
    }

    /**
     * Get a configuration string
     * @param {string} path - Configuration path
     * @param {string} defaultValue - Default value if not found or invalid
     * @returns {string} Configuration string or default
     */
    getString(path, defaultValue = '') {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'getString');
            return defaultValue;
        }
        return this.configManager.getString(path, defaultValue);
    }

    /**
     * Get a configuration boolean
     * @param {string} path - Configuration path
     * @param {boolean} defaultValue - Default value if not found or invalid
     * @returns {boolean} Configuration boolean or default
     */
    getBoolean(path, defaultValue = false) {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'getBoolean');
            return defaultValue;
        }
        return this.configManager.getBoolean(path, defaultValue);
    }

    /**
     * Get a configuration object
     * @param {string} path - Configuration path
     * @param {Object} defaultValue - Default value if not found or invalid
     * @returns {Object} Configuration object or default
     */
    getObject(path, defaultValue = {}) {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'getObject');
            return defaultValue;
        }
        return this.configManager.getObject(path, defaultValue);
    }

    /**
     * Get a configuration array
     * @param {string} path - Configuration path
     * @param {Array} defaultValue - Default value if not found or invalid
     * @returns {Array} Configuration array or default
     */
    getArray(path, defaultValue = []) {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'getArray');
            return defaultValue;
        }
        return this.configManager.getArray(path, defaultValue);
    }

    /**
     * Get all configuration values
     * @returns {Object} All configuration values
     */
    getAll() {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'getAll');
            return {};
        }
        return this.configManager.getAll();
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration to merge
     */
    update(newConfig) {
        if (!this.configManager) {
            errorHandler.handle(new Error('ConfigService not initialized'), 'update');
            return;
        }
        this.configManager.update(newConfig);
    }

    /**
     * Reset the configuration service (for testing purposes)
     */
    reset() {
        this.configManager = null;
    }
}

// Export singleton instance
const configService = new ConfigService();
export default configService;