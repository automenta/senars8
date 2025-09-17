import {validateConfig} from './configSchema.js';
import defaultConfig from './default-config.js';

class ConfigManager {
    constructor(userConfig = {}) {
        this.config = this._mergeConfigs(defaultConfig, userConfig);
        this.validatedConfig = validateConfig(this.config);
    }

    _mergeConfigs(defaults, userConfig) {
        if (userConfig == null) return { ...defaults };

        const merged = { ...defaults };

        for (const [key, value] of Object.entries(userConfig)) {
            const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
            const defaultIsObject = merged[key] !== null && typeof merged[key] === 'object' && !Array.isArray(merged[key]);

            if (isObject && defaultIsObject) {
                merged[key] = this._mergeConfigs(merged[key], value);
            } else {
                merged[key] = value;
            }
        }

        return merged;
    }

    get(path, defaultValue = undefined) {
        return path.split('.').reduce((acc, part) => acc?.[part], this.validatedConfig) ?? defaultValue;
    }

    getNumber(path, defaultValue = 0) {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'number') {
            throw new Error(`Configuration value '${path}' must be a number, got ${typeof value}`);
        }
        return value;
    }

    getString(path, defaultValue = '') {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'string') {
            throw new Error(`Configuration value '${path}' must be a string, got ${typeof value}`);
        }
        return value;
    }

    getBoolean(path, defaultValue = false) {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'boolean') {
            throw new Error(`Configuration value '${path}' must be a boolean, got ${typeof value}`);
        }
        return value;
    }

    getObject(path, defaultValue = {}) {
        const value = this.get(path, defaultValue);
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(`Configuration value '${path}' must be an object, got ${typeof value}`);
        }
        return value;
    }

    getArray(path, defaultValue = []) {
        const value = this.get(path, defaultValue);
        if (!Array.isArray(value)) {
            throw new Error(`Configuration value '${path}' must be an array, got ${typeof value}`);
        }
        return value;
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