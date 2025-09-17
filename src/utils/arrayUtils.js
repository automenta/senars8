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

export {
    filterByProperty
};
