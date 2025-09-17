const isNonEmptyObject = input =>
    input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length > 0;

const safeGet = (obj, path, defaultValue = null) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    return keys.reduce((acc, key) => acc?.[key], obj) ?? defaultValue;
};

export {
    isNonEmptyObject,
    safeGet
};
