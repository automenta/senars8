import {createUnifiedErrorHandler} from '../utils/unifiedErrorHandler.js';

const errorHandler = createUnifiedErrorHandler('ConfigAccessor');

/**
 * A centralized utility for consistent configuration access with error handling
 */
class ConfigAccessor {
    constructor(configManager) {
        this.configManager = configManager;
    }

    /**
     * Get a configuration value with error handling
     * @param {string} path - Configuration path (e.g., 'memory.FORGETTING_STRATEGY_NAME')
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value or default
     */
    get(path, defaultValue = undefined) {
        return errorHandler.executeSync(() => 
            this.configManager.get(path, defaultValue), 
            `get:${path}`, 
            defaultValue
        );
    }

    /**
     * Get a configuration number with error handling
     * @param {string} path - Configuration path
     * @param {number} defaultValue - Default value if not found or invalid
     * @returns {number} Configuration number or default
     */
    getNumber(path, defaultValue = 0) {
        return errorHandler.executeSync(() => 
            this.configManager.getNumber(path, defaultValue), 
            `getNumber:${path}`, 
            defaultValue
        );
    }

    /**
     * Get a configuration string with error handling
     * @param {string} path - Configuration path
     * @param {string} defaultValue - Default value if not found or invalid
     * @returns {string} Configuration string or default
     */
    getString(path, defaultValue = '') {
        return errorHandler.executeSync(() => 
            this.configManager.getString(path, defaultValue), 
            `getString:${path}`, 
            defaultValue
        );
    }

    /**
     * Get a configuration boolean with error handling
     * @param {string} path - Configuration path
     * @param {boolean} defaultValue - Default value if not found or invalid
     * @returns {boolean} Configuration boolean or default
     */
    getBoolean(path, defaultValue = false) {
        return errorHandler.executeSync(() => 
            this.configManager.getBoolean(path, defaultValue), 
            `getBoolean:${path}`, 
            defaultValue
        );
    }

    /**
     * Get a configuration object with error handling
     * @param {string} path - Configuration path
     * @param {Object} defaultValue - Default value if not found or invalid
     * @returns {Object} Configuration object or default
     */
    getObject(path, defaultValue = {}) {
        return errorHandler.executeSync(() => 
            this.configManager.getObject(path, defaultValue), 
            `getObject:${path}`, 
            defaultValue
        );
    }

    /**
     * Get a configuration array with error handling
     * @param {string} path - Configuration path
     * @param {Array} defaultValue - Default value if not found or invalid
     * @returns {Array} Configuration array or default
     */
    getArray(path, defaultValue = []) {
        return errorHandler.executeSync(() => 
            this.configManager.getArray(path, defaultValue), 
            `getArray:${path}`, 
            defaultValue
        );
    }

    /**
     * Get all configuration values
     * @returns {Object} All configuration values
     */
    getAll() {
        return errorHandler.executeSync(() => 
            this.configManager.getAll(), 
            'getAll', 
            {}
        );
    }
}

export default ConfigAccessor;