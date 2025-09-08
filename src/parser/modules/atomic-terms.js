const {createParseError} = require('../../utils/error-handler');

/**
 * Atomic term and variable parsing functions
 */

/**
 * Parse an atomic term
 * @param {object} parser - The parser instance
 * @returns {object} The parsed atomic term
 */
function parseAtomicTerm(parser) {
    try {
        const identifier = parser.consume('identifier');
        return {type: 'Atomic', key: identifier};
    } catch (error) {
        throw createParseError(`Error parsing atomic term: ${error.message}`);
    }
}

/**
 * Parse an independent variable
 * @param {object} parser - The parser instance
 * @returns {object} The parsed independent variable
 */
function parseIndependentVariable(parser) {
    try {
        const variable = parser.consume('independentVar');
        return {type: 'IndependentVariable', name: variable};
    } catch (error) {
        throw createParseError(`Error parsing independent variable: ${error.message}`);
    }
}

/**
 * Parse a dependent variable
 * @param {object} parser - The parser instance
 * @returns {object} The parsed dependent variable
 */
function parseDependentVariable(parser) {
    try {
        const variable = parser.consume('dependentVar');
        return {type: 'DependentVariable', name: variable};
    } catch (error) {
        throw createParseError(`Error parsing dependent variable: ${error.message}`);
    }
}

/**
 * Parse a query variable
 * @param {object} parser - The parser instance
 * @returns {object} The parsed query variable
 */
function parseQueryVariable(parser) {
    try {
        const variable = parser.consume('queryVar');
        return {type: 'QueryVariable', name: variable};
    } catch (error) {
        throw createParseError(`Error parsing query variable: ${error.message}`);
    }
}

module.exports = {
    parseAtomicTerm,
    parseIndependentVariable,
    parseDependentVariable,
    parseQueryVariable
};