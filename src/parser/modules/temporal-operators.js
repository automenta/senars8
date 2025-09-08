/**
 * Temporal operator parsing functions
 */

/**
 * Check if the current token is a temporal operator
 * @param {object} parser - The parser instance
 * @returns {boolean} True if the current token is a temporal operator
 */
function matchTemporalOperator(parser) {
    return ['always', 'eventually', 'next', 'previous'].includes(parser.current.type);
}

/**
 * Parse a temporal operator
 * @param {object} parser - The parser instance
 * @returns {object} The parsed temporal operator
 */
function parseTemporalOperator(parser) {
    const operatorType = parser.current.type;
    parser.consume(operatorType);
    parser.consume('comma');
    const term = parser.parseTerm();
    parser.consume('rparen');
    return {type: getTemporalOperatorType(operatorType), term};
}

/**
 * Map operator token types to AST node types
 * @param {string} operator - The operator token type
 * @returns {string} The AST node type
 */
function getTemporalOperatorType(operator) {
    const mapping = {
        'always': 'Always',
        'eventually': 'Eventually',
        'next': 'Next',
        'previous': 'Previous'
    };
    return mapping[operator] || operator;
}

module.exports = {
    matchTemporalOperator,
    parseTemporalOperator,
    getTemporalOperatorType
};