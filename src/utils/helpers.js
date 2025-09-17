const isNonEmptyObject = input =>
    input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length > 0;

const safeGet = (obj, path, defaultValue = null) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return defaultValue;
        }
    }
    return current;
};

/**
 * Filters an array of objects by a specific property and value.
 *
 * @param {Array<Object>} array - The array to filter.
 * @param {string} property - The name of the property to filter by.
 * @param {*} value - The value to match.
 * @returns {Array<Object>} The filtered array.
 */
function filterByProperty(array, property, value) {
    if (!Array.isArray(array)) {
        return [];
    }
    return array.filter(item => item && item[property] === value);
}

const normalizeToArray = input => (Array.isArray(input) ? input : [input]);

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

const isEmptyArray = input => !Array.isArray(input) || input.length === 0;


export {
    isNonEmptyObject,
    safeGet,
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray
};
