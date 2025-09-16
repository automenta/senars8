/**
 * Configuration manager with schema validation and typed accessors
 */

import {validateConfig} from './configSchema.js';
import defaultConfig from './default-config.js';

/**
 * Configuration manager that provides type-safe access to configuration values
 * with validation and default value handling.
 */
class ConfigManager {
    /**
     * Creates a new ConfigManager instance
     * @param {object} [userConfig={}] - User-provided configuration to merge with defaults
     */
    constructor(userConfig = {}) {
        this.config = this._mergeConfigs(defaultConfig, userConfig);
        // Validate configuration during construction
        this.validatedConfig = validateConfig(this.config);
    }

    /**
     * Merges default configuration with user configuration
     * @param {object} defaults - Default configuration
     * @param {object} userConfig - User-provided configuration
     * @returns {object} Merged configuration
     * @private
     */
    _mergeConfigs(defaults, userConfig) {
        // Handle null or undefined userConfig
        if (userConfig == null) {
            return {...defaults};
        }

        const merged = {...defaults};

        for (const [key, value] of Object.entries(userConfig)) {
            // Preserve null values, don't merge them
            if (value === null) {
                merged[key] = null;
            // Preserve empty objects, don't merge them
            } else if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
                merged[key] = {};
            } else if (typeof value === 'object' && !Array.isArray(value) &&
                typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key])) {
                merged[key] = this._mergeConfigs(merged[key], value);
            } else {
                merged[key] = value;
            }
        }

        return merged;
    }

    /**
     * Gets a configuration value with type validation
     * @param {string} path - Dot-notation path to the configuration value
     * @param {*} [defaultValue] - Default value if not found
     * @returns {*} The configuration value
     */
    get(path, defaultValue = undefined) {
        const parts = path.split('.');
        let value = this.validatedConfig;

        for (const part of parts) {
            if (value === undefined || value === null || typeof value !== 'object') {
                return defaultValue;
            }
            value = value[part];
        }

        return value !== undefined ? value : defaultValue;
    }

    /**
     * Gets a number configuration value with validation
     * @param {string} path - Dot-notation path to the configuration value
     * @param {number} [defaultValue=0] - Default value if not found
     * @returns {number} The configuration value
     * @throws {Error} If the value is not a valid number
     */
    getNumber(path, defaultValue = 0) {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'number') {
            throw new Error(`Configuration value '${path}' must be a number, got ${typeof value}`);
        }
        return value;
    }

    /**
     * Gets a string configuration value with validation
     * @param {string} path - Dot-notation path to the configuration value
     * @param {string} [defaultValue=''] - Default value if not found
     * @returns {string} The configuration value
     * @throws {Error} If the value is not a valid string
     */
    getString(path, defaultValue = '') {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'string') {
            throw new Error(`Configuration value '${path}' must be a string, got ${typeof value}`);
        }
        return value;
    }

    /**
     * Gets a boolean configuration value with validation
     * @param {string} path - Dot-notation path to the configuration value
     * @param {boolean} [defaultValue=false] - Default value if not found
     * @returns {boolean} The configuration value
     * @throws {Error} If the value is not a valid boolean
     */
    getBoolean(path, defaultValue = false) {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'boolean') {
            throw new Error(`Configuration value '${path}' must be a boolean, got ${typeof value}`);
        }
        return value;
    }

    /**
     * Gets an object configuration value with validation
     * @param {string} path - Dot-notation path to the configuration value
     * @param {object} [defaultValue={}] - Default value if not found
     * @returns {object} The configuration value
     * @throws {Error} If the value is not a valid object
     */
    getObject(path, defaultValue = {}) {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(`Configuration value '${path}' must be an object, got ${typeof value}`);
        }
        return value;
    }

    /**
     * Gets an array configuration value with validation
     * @param {string} path - Dot-notation path to the configuration value
     * @param {Array} [defaultValue=[]] - Default value if not found
     * @returns {Array} The configuration value
     * @throws {Error} If the value is not a valid array
     */
    getArray(path, defaultValue = []) {
        const value = this.get(path, defaultValue);
        if (!Array.isArray(value)) {
            throw new Error(`Configuration value '${path}' must be an array, got ${typeof value}`);
        }
        return value;
    }

    /**
     * Gets the entire validated configuration
     * @returns {object} The validated configuration
     */
    getAll() {
        return {...this.validatedConfig};
    }

    /**
     * Updates the configuration with new values
     * @param {object} newConfig - New configuration values to merge
     */
    update(newConfig) {
        this.config = this._mergeConfigs(this.config, newConfig);
        this.validatedConfig = validateConfig(this.config);
    }
}

export default ConfigManager;