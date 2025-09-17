function filterByProperty(array, property, value) {
    if (!Array.isArray(array)) return [];
    return array.filter(item => item && item[property] === value);
}

const normalizeToArray = input => (Array.isArray(input) ? input : [input]);

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

const isEmptyArray = input => !Array.isArray(input) || input.length === 0;

export {
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray
};
