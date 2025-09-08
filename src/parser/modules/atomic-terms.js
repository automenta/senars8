/**
 * Atomic term and variable parsing functions
 */

/**
 * Parse an atomic term
 * @param {object} parser - The parser instance
 * @returns {object} The parsed atomic term
 */
function parseAtomicTerm(parser) {
    const identifier = parser.consume('identifier');
    return {type: 'Atomic', key: identifier};
}

/**
 * Parse an independent variable
 * @param {object} parser - The parser instance
 * @returns {object} The parsed independent variable
 */
function parseIndependentVariable(parser) {
    const variable = parser.consume('independentVar');
    return {type: 'IndependentVariable', name: variable};
}

/**
 * Parse a dependent variable
 * @param {object} parser - The parser instance
 * @returns {object} The parsed dependent variable
 */
function parseDependentVariable(parser) {
    const variable = parser.consume('dependentVar');
    return {type: 'DependentVariable', name: variable};
}

/**
 * Parse a query variable
 * @param {object} parser - The parser instance
 * @returns {object} The parsed query variable
 */
function parseQueryVariable(parser) {
    const variable = parser.consume('queryVar');
    return {type: 'QueryVariable', name: variable};
}

module.exports = {
    parseAtomicTerm,
    parseIndependentVariable,
    parseDependentVariable,
    parseQueryVariable
};