import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const createConfigAccessor = (configManager, modulePrefix = '') => {
    const errorHandler = createUnifiedErrorHandler(`ConfigAccessor:${modulePrefix || 'default'}`);

    /**
     * A centralized utility for consistent configuration access with error handling
     */
    return {
        configManager,

        /**
         * Get a configuration value with error handling
         * @param {string} path - Configuration path (e.g., 'FORGETTING_STRATEGY_NAME')
         * @param {*} defaultValue - Default value if not found
         * @returns {*} Configuration value or default
         */
        get(path, defaultValue = undefined) {
            const fullPath = modulePrefix ? `${modulePrefix}.${path}` : path;
            return errorHandler.executeSync(() => 
                configManager.get(fullPath, defaultValue), 
                `get:${fullPath}`, 
                defaultValue
            );
        },

        /**
         * Get a configuration number with error handling
         * @param {string} path - Configuration path
         * @param {number} defaultValue - Default value if not found or invalid
         * @returns {number} Configuration number or default
         */
        getNumber(path, defaultValue = 0) {
            const fullPath = modulePrefix ? `${modulePrefix}.${path}` : path;
            return errorHandler.executeSync(() => 
                configManager.getNumber(fullPath, defaultValue), 
                `getNumber:${fullPath}`, 
                defaultValue
            );
        },

        /**
         * Get a configuration string with error handling
         * @param {string} path - Configuration path
         * @param {string} defaultValue - Default value if not found or invalid
         * @returns {string} Configuration string or default
         */
        getString(path, defaultValue = '') {
            const fullPath = modulePrefix ? `${modulePrefix}.${path}` : path;
            return errorHandler.executeSync(() => 
                configManager.getString(fullPath, defaultValue), 
                `getString:${fullPath}`, 
                defaultValue
            );
        },

        /**
         * Get a configuration boolean with error handling
         * @param {string} path - Configuration path
         * @param {boolean} defaultValue - Default value if not found or invalid
         * @returns {boolean} Configuration boolean or default
         */
        getBoolean(path, defaultValue = false) {
            const fullPath = modulePrefix ? `${modulePrefix}.${path}` : path;
            return errorHandler.executeSync(() => 
                configManager.getBoolean(fullPath, defaultValue), 
                `getBoolean:${fullPath}`, 
                defaultValue
            );
        },

        /**
         * Get a configuration object with error handling
         * @param {string} path - Configuration path
         * @param {Object} defaultValue - Default value if not found or invalid
         * @returns {Object} Configuration object or default
         */
        getObject(path, defaultValue = {}) {
            const fullPath = modulePrefix ? `${modulePrefix}.${path}` : path;
            return errorHandler.executeSync(() => 
                configManager.getObject(fullPath, defaultValue), 
                `getObject:${fullPath}`, 
                defaultValue
            );
        },

        /**
         * Get a configuration array with error handling
         * @param {string} path - Configuration path
         * @param {Array} defaultValue - Default value if not found or invalid
         * @returns {Array} Configuration array or default
         */
        getArray(path, defaultValue = []) {
            const fullPath = modulePrefix ? `${modulePrefix}.${path}` : path;
            return errorHandler.executeSync(() => 
                configManager.getArray(fullPath, defaultValue), 
                `getArray:${fullPath}`, 
                defaultValue
            );
        },

        /**
         * Get all configuration values
         * @returns {Object} All configuration values
         */
        getAll() {
            return errorHandler.executeSync(() => 
                configManager.getAll(), 
                'getAll', 
                {}
            );
        }
    };
};

export default createConfigAccessor;