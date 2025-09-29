const filterByProperty = (array, property, value) => {
    if (!Array.isArray(array) || !property) return [];
    const result = [];
    for (let i = 0; i < array.length; i++) {
        if (array[i]?.[property] === value) {
            result.push(array[i]);
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
        const value = array[i]?.[property];
        if (typeof value === 'number') {
            sum += value;
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

export {
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray,
    isPlainObject,
    sumBy,
    safeGet
};