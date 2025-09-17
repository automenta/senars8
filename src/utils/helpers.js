const normalizeToArray = input => (Array.isArray(input) ? input : [input]);

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

export {
    normalizeToArray,
    isNonEmptyArray
};
