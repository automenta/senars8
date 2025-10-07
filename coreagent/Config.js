class Config {
    constructor(data = {}) {
        this._data = data;
        this._cache = new Map(); // Cache for repeated access
    }

    get(path, defaultValue) {
        const cacheKey = `${path}:${JSON.stringify(defaultValue)}`;
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        const result = this._getNested(this._data, path, defaultValue);
        this._cache.set(cacheKey, result);
        return result;
    }

    set(path, value) {
        this._setNested(this._data, path, value);
        this._cache.clear(); // Invalidate cache
    }

    update(newData) {
        this._deepMerge(this._data, newData);
        this._cache.clear(); // Invalidate cache
    }

    getNumber(path, defaultValue = 0) {
        return this.validated(path, (v) => typeof v === 'number', defaultValue);
    }

    getString(path, defaultValue = '') {
        return this.validated(path, (v) => typeof v === 'string', defaultValue);
    }

    getBoolean(path, defaultValue = false) {
        return this.validated(path, (v) => typeof v === 'boolean', defaultValue);
    }

    validated(path, validator, defaultValue) {
        const value = this.get(path, defaultValue);
        return validator(value) ? value : defaultValue;
    }

    _getNested(obj, path, defaultValue) {
        return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    }

    _setNested(obj, path, value) {
        const parts = path.split('.');
        const lastKey = parts.pop();
        const target = parts.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    _deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this._deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}

export default Config;