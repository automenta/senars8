const normalizeToArray = input => (Array.isArray(input) ? input : [input]);

const isNonEmptyArray = input => Array.isArray(input) && input.length > 0;

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

export {
    normalizeToArray,
    isNonEmptyArray,
    isNonEmptyObject,
    safeGet
};
