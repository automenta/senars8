const filterByProperty = (array, property, value) => {
    if (!Array.isArray(array)) return [];
    return array.filter(item => item && item[property] === value);
};

const isNonEmptyObject = input =>
    input && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).length > 0;

const safeGet = (obj, path, defaultValue = null) => {
    const keys = Array.isArray(path) ? path : path.split('.');
    return keys.reduce((acc, key) => acc?.[key], obj) ?? defaultValue;
};

const isTaskType = (item, type) => item?.punctuation === type;

const getTasksByPunctuation = (tasks, punctuation) => {
    if (!Array.isArray(tasks)) {
        return [];
    }
    return tasks.filter(item => item && item.punctuation === punctuation);
};

export {
    filterByProperty,
    isNonEmptyObject,
    safeGet,
    isTaskType,
    getTasksByPunctuation
};
