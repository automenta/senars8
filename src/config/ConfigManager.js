import {validateConfig} from './configSchema.js';
import defaultConfig from './default-config.js';
import {safeGet} from '../utils/collections/index.js';

class ConfigManager {
    constructor(userConfig = {}) {
        this.config = this._mergeConfigs(defaultConfig, userConfig);
        this.validatedConfig = validateConfig(this.config);
    }

    _mergeConfigs(defaults, userConfig) {
        if (userConfig == null) return {...defaults};

        const merged = {...defaults};

        for (const [key, value] of Object.entries(userConfig)) {
            const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
            const defaultIsObject = merged[key] !== null && typeof merged[key] === 'object' && !Array.isArray(merged[key]);

            if (value === null || value === undefined) {
                continue;
            }

            if (isObject && defaultIsObject) {
                merged[key] = this._mergeConfigs(merged[key], value);
            } else {
                merged[key] = value;
            }
        }

        return merged;
    }

    get(path, defaultValue = undefined) {
        return safeGet(this.validatedConfig, path, defaultValue);
    }

    _getTyped(path, defaultValue, type, typeCheck) {
        const value = this.get(path, defaultValue);
        if (!typeCheck(value)) {
            throw new Error(`Configuration value '${path}' must be a ${type}, got ${typeof value}`);
        }
        return value;
    }

    getNumber(path, defaultValue = 0) {
        return this._getTyped(path, defaultValue, 'number', v => typeof v === 'number');
    }

    getString(path, defaultValue = '') {
        return this._getTyped(path, defaultValue, 'string', v => typeof v === 'string');
    }

    getBoolean(path, defaultValue = false) {
        return this._getTyped(path, defaultValue, 'boolean', v => typeof v === 'boolean');
    }

    getObject(path, defaultValue = {}) {
        return this._getTyped(path, defaultValue, 'object', v => typeof v === 'object' && v !== null && !Array.isArray(v));
    }

    getArray(path, defaultValue = []) {
        return this._getTyped(path, defaultValue, 'array', v => Array.isArray(v));
    }

    getAll() {
        return {...this.validatedConfig};
    }

    update(newConfig) {
        this.config = this._mergeConfigs(this.config, newConfig);
        this.validatedConfig = validateConfig(this.config);
    }
}

export default ConfigManager;