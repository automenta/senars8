const filterByProperty = (array, property, value) => {
    if (!Array.isArray(array) || !property) return [];
    const result = [];
    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (item && item[property] === value) {
            result.push(item);
        }
    }
    return result;
};

const normalizeToArray = input => Array.isArray(input) ? input : [input];

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

const isEmptyArray = input => !Array.isArray(input) || input.length === 0;

const isPlainObject = input =>
    input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length > 0;

const sumBy = (array, property) => {
    if (!Array.isArray(array) || !property) return 0;
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (item) {
            const value = item[property];
            if (typeof value === 'number') {
                sum += value;
            }
        }
    }
    return sum;
};

const safeGet = (obj, path, defaultValue = undefined) => {
    if (!obj) return defaultValue;
    const keys = Array.isArray(path) ? path : (typeof path === 'string' ? path.split('.') : []);
    let result = obj;
    for (let i = 0; i < keys.length; i++) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[keys[i]];
    }
    return result !== undefined ? result : defaultValue;
};

/**
 * Optimized helper to create a Map from an array using a key selector function.
 * More efficient than using array methods repeatedly for lookups.
 * @param {Array} array - The input array
 * @param {Function} keySelector - Function that returns the key for each element
 * @returns {Map} A Map with keys from keySelector applied to each element
 */
const arrayToMap = (array, keySelector) => {
    if (!Array.isArray(array) || typeof keySelector !== 'function') return new Map();

    const map = new Map();
    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (item !== null && item !== undefined) {
            const key = keySelector(item);
            if (key !== undefined && key !== null) {
                map.set(key, item);
            }
        }
    }
    return map;
};

/**
 * Optimized helper to group array elements by a property or function result.
 * @param {Array} array - The input array
 * @param {Function|string} groupSelector - Function that returns the group key, or property name
 * @returns {Map} A Map with keys as groups and values as arrays of items in that group
 */
const groupBy = (array, groupSelector) => {
    if (!Array.isArray(array)) return new Map();

    const isFunction = typeof groupSelector === 'function';
    const map = new Map();

    for (let i = 0; i < array.length; i++) {
        const item = array[i];
        if (item !== null && item !== undefined) {
            const key = isFunction ? groupSelector(item) : item[groupSelector];
            if (map.has(key)) {
                map.get(key).push(item);
            } else {
                map.set(key, [item]);
            }
        }
    }
    return map;
};

export {
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray,
    isPlainObject,
    sumBy,
    safeGet,
    arrayToMap,
    groupBy
};