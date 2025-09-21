const filterByProperty = (array, property, value) => 
    Array.isArray(array) ? array.filter(item => item?.[property] === value) : [];

const normalizeToArray = input => Array.isArray(input) ? input : [input];

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

const isEmptyArray = input => !Array.isArray(input) || input.length === 0;

const isPlainObject = input => 
    input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length > 0;

const isNonEmptyObject = isPlainObject;

const sumBy = (array, property) => 
    Array.isArray(array) ? array.reduce((acc, item) => acc + (item?.[property] || 0), 0) : 0;

const safeGet = (obj, path, defaultValue = undefined) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    const result = keys.reduce((acc, key) => acc?.[key], obj);
    return result !== undefined ? result : defaultValue;
};

export {
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray,
    isPlainObject,
    isNonEmptyObject,
    sumBy,
    safeGet
};