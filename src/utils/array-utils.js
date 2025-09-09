function normalizeToArray(input) {
    return Array.isArray(input) ? input : [input];
}

function isNonEmptyArray(input) {
    return Array.isArray(input) && input.length > 0;
}

module.exports = {
    normalizeToArray,
    isNonEmptyArray
};